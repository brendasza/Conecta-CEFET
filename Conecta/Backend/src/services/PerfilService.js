import pool from "../config/database.js";
import * as UsuarioRepository from "../repositories/UsuarioRepository.js";
import * as PerfilRepository from "../repositories/PerfilRepository.js";
import { paraUsuarioDTO } from "../dtos/UsuarioDTO.js";

export async function buscarMe(idUsuario) {
  const usuario = await UsuarioRepository.buscarPorId(idUsuario);

  if (!usuario || !usuario.ativo) {
    throw new Error("USUARIO_NAO_ENCONTRADO");
  }

  const perfil = await PerfilRepository.buscar(usuario);
  return paraUsuarioDTO(usuario, perfil);
}

function texto(valor, max) {
  const limpo = String(valor ?? "").trim();
  return limpo.length <= max ? limpo : null; // null = passou do limite
}

function lista(valor, max = 30, maxItem = 80) {
  if (valor === undefined) return undefined; // não veio: não mexe
  if (!Array.isArray(valor) || valor.length > max) return null;

  const vistos = new Map();
  for (const item of valor) {
    const nome = texto(item, maxItem);
    if (nome === null) return null;
    if (nome) vistos.set(nome.toLowerCase(), nome); // tira repetidos (A = a)
  }
  return [...vistos.values()];
}

export async function atualizarMe(idUsuario, dados = {}) {
  const usuario = await UsuarioRepository.buscarPorId(idUsuario);

  if (!usuario || !usuario.ativo) {
    throw new Error("USUARIO_NAO_ENCONTRADO");
  }

  const nome = texto(dados.nome, 150);
  const bio = texto(dados.bio, 1000);
  const interesses = lista(dados.interesses);
  const habilidades = lista(dados.habilidades);

  if (!nome || bio === null || interesses === null || habilidades === null) {
    throw new Error("DADOS_INVALIDOS");
  }

  const ehAluno = usuario.tipo_usuario === "aluno";
  const ehProfessor = usuario.tipo_usuario === "professor";

  let aluno, professor;

  if (ehAluno) {
    const curso = texto(dados.curso, 100);
    const periodo = texto(dados.periodo, 20);
    if (!curso || !periodo) throw new Error("DADOS_INVALIDOS");
    aluno = { id_usuario: idUsuario, curso, periodo };
  }

  if (ehProfessor) {
    const departamento = texto(dados.departamento, 100);
    const titulacao = texto(dados.titulacao, 100);
    const area_atuacao = texto(dados.areaAtuacao, 100);
    if (!departamento || !titulacao || !area_atuacao) throw new Error("DADOS_INVALIDOS");
    professor = { id_usuario: idUsuario, departamento, titulacao, area_atuacao };
  }

  const conexao = await pool.getConnection();

  try {
    await conexao.beginTransaction();

    await PerfilRepository.atualizarUsuario({ id_usuario: idUsuario, nome, bio }, conexao);

    if (aluno) await PerfilRepository.atualizarAluno(aluno, conexao);
    if (professor) await PerfilRepository.atualizarProfessor(professor, conexao);

    if (ehAluno || ehProfessor) {
      if (interesses !== undefined) {
        await PerfilRepository.substituirLista(usuario.tipo_usuario, idUsuario, "interesses", interesses, conexao);
      }
      if (habilidades !== undefined) {
        await PerfilRepository.substituirLista(usuario.tipo_usuario, idUsuario, "habilidades", habilidades, conexao);
      }
    }

    await conexao.commit();
  } catch (erro) {
    await conexao.rollback();
    throw erro;
  } finally {
    conexao.release();
  }

  return buscarMe(idUsuario);
}

// Perfil público: qualquer usuário logado (aluno, professor ou administrador) pode ver o
// perfil de qualquer pessoa. Mostra só dados públicos (nome, e-mail de contato, bio, curso...).
// NUNCA expõe matrícula, SIAPE, CPF, senha nem dados de acesso.
export async function buscarPublico(idUsuario) {
  const usuario = await UsuarioRepository.buscarPorId(idUsuario);

  if (!usuario || !usuario.ativo) {
    throw new Error("USUARIO_NAO_ENCONTRADO");
  }

  const perfil = await PerfilRepository.buscar(usuario);
  const base = {
    id: usuario.id_usuario,
    nome: usuario.nome,
    email: usuario.email,
    bio: usuario.bio ?? "",
    interesses: perfil.interesses ?? [],
    habilidades: perfil.habilidades ?? [],
  };

  if (usuario.tipo_usuario === "administrador") {
    return { ...base, tipo: "administrador", setor: perfil.setor };
  }

  if (usuario.tipo_usuario === "aluno") {
    return { ...base, tipo: "aluno", curso: perfil.curso, periodo: perfil.periodo };
  }

  const [projetos] = await pool.query(
    `SELECT a.id_atividade AS id, a.titulo AS nome, a.status, ar.nome AS area, t.nome AS tipo
       FROM atividade_coordenador c
       JOIN atividade_academica a ON a.id_atividade = c.id_atividade
       JOIN area_conhecimento ar ON ar.id_area = a.id_area
       JOIN tipo_atividade t ON t.id_tipo = a.id_tipo
      WHERE c.id_usuario = ? AND a.status <> 'cancelado'
      ORDER BY a.created_at DESC LIMIT 20`,
    [idUsuario]
  );

  return {
    ...base,
    tipo: "funcionario",
    departamento: perfil.departamento,
    titulacao: perfil.titulacao,
    areaAtuacao: perfil.area_atuacao,
    projetos: projetos.map((p) => ({ ...p, id: String(p.id) })),
  };
}
