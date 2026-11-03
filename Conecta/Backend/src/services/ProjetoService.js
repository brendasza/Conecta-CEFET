import fs from "node:fs/promises";
import path from "node:path";
import pool from "../config/database.js";
import * as ProjetoRepository from "../repositories/ProjetoRepository.js";
import * as UsuarioRepository from "../repositories/UsuarioRepository.js";
import * as CandidaturaRepository from "../repositories/CandidaturaRepository.js";
import * as NotificacaoService from "./NotificacaoService.js";
import { paraProjetoDTO } from "../dtos/ProjetoDTO.js";
import { PASTA_UPLOADS, LIMITE_IMAGEM } from "../middlewares/upload.js";
import {
  invalido, proibido, naoEncontrado, conflito,
} from "../utils/erros.js";
import { texto, textoObrigatorio, dataMysql } from "../utils/texto.js";



function validarDados(dados = {}) {
  const titulo = textoObrigatorio(dados.nome, 150, "nome do projeto");
  const objetivo = textoObrigatorio(dados.objetivo, 5000, "objetivo");
  const area = textoObrigatorio(dados.area, 80, "área");
  const descricao = texto(dados.descricao, 20000, "descrição");

  if (!Array.isArray(dados.tags)) throw invalido("Informe as tags do projeto");
  const tags = new Map();
  for (const t of dados.tags.slice(0, 20)) {
    const tag = texto(t, 40, "tag");
    if (tag) tags.set(tag.toLowerCase(), tag);
  }

  return { titulo, objetivo, area, descricao, tags: [...tags.values()], tipoNome: dados.tipo };
}



function validarInscricao(dados = {}) {
  const requisitos = texto(dados.requisitos, 5000, "campo de requisitos") || null;
  const criterios = texto(dados.criterios, 5000, "campo de critérios") || null;
  const inicio = dataMysql(dados.inicioInscricao, "início das inscrições");
  const fim = dataMysql(dados.fimInscricao, "fim das inscrições");

  const vazio = dados.vagas === undefined || dados.vagas === null || dados.vagas === "";
  let vagas = null;
  if (!vazio) {
    vagas = Number(dados.vagas);
    if (!Number.isInteger(vagas) || vagas < 1 || vagas > 1000) {
      throw invalido("Informe a quantidade de vagas (de 1 a 1000)");
    }
  } else if (inicio || fim) {
    throw invalido("Informe a quantidade de vagas para definir um período de inscrição");
  }

  if (inicio && fim && fim <= inicio) throw invalido("O fim das inscrições deve ser depois do início");

  return {
    requisitos, criterios_selecao: criterios, vagas_totais: vagas,
    inicio: vagas === null ? null : inicio, fim: vagas === null ? null : fim,
  };
}


const temInscricao = (d = {}) =>
  ["vagas", "inicioInscricao", "fimInscricao", "requisitos", "criterios"].some((c) => c in d);

async function exigirCoordenador(idProjeto, idUsuario) {
  if (!(await ProjetoRepository.ehCoordenador(idProjeto, idUsuario))) {
    throw proibido("Apenas os coordenadores do projeto podem fazer isso");
  }
}



export async function criar(idProfessor, dados = {}) {
  const v = { ...validarDados(dados), ...validarInscricao(dados) };

  const professor = await UsuarioRepository.buscarPorId(idProfessor);
  if (!professor || !professor.ativo) throw naoEncontrado("Usuário não encontrado");

  const conexao = await pool.getConnection();
  let id;

  try {
    await conexao.beginTransaction();

    const id_tipo = await ProjetoRepository.buscarIdTipoPorNome(v.tipoNome, conexao);
    if (!id_tipo) throw invalido("Tipo de projeto inválido");

    const id_area = await ProjetoRepository.obterOuCriarArea(v.area, conexao);

    id = await ProjetoRepository.criar({ id_professor: idProfessor, id_area, id_tipo, ...v }, conexao);

    await ProjetoRepository.adicionarTags(id, v.tags, conexao);
    await ProjetoRepository.adicionarCoordenador(id, idProfessor, conexao);

    await conexao.commit();
  } catch (erro) {
    await conexao.rollback();
    throw erro;
  } finally {
    conexao.release();
  }

  return paraProjetoDTO(await ProjetoRepository.buscarPorId(id));
}

export async function atualizar(idProjeto, idUsuario, dados = {}) {
  await exigirCoordenador(idProjeto, idUsuario);

  const atual = await ProjetoRepository.buscarBruto(idProjeto);
  if (!atual || atual.status === "cancelado") throw naoEncontrado("Projeto não encontrado");
  if (atual.status !== "ativo") throw conflito("Só é possível editar projetos ativos");

  const v = validarDados(dados);


  const inscricao = temInscricao(dados) ? validarInscricao(dados) : null;
  if (inscricao) await conferirVagas(idProjeto, inscricao.vagas_totais);

  const conexao = await pool.getConnection();
  try {
    await conexao.beginTransaction();

    const id_tipo = await ProjetoRepository.buscarIdTipoPorNome(v.tipoNome, conexao);
    if (!id_tipo) throw invalido("Tipo de projeto inválido");
    const id_area = await ProjetoRepository.obterOuCriarArea(v.area, conexao);

    await ProjetoRepository.atualizar(idProjeto, { id_area, id_tipo, ...v }, conexao);
    if (inscricao) await ProjetoRepository.atualizarInscricao(idProjeto, inscricao, conexao);
    await ProjetoRepository.substituirTags(idProjeto, v.tags, conexao);
    await conexao.commit();
  } catch (erro) {
    await conexao.rollback();
    throw erro;
  } finally {
    conexao.release();
  }

  const seguidores = await ProjetoRepository.idsSeguidores(idProjeto);
  await NotificacaoService.notificar(
    seguidores.filter((s) => s !== idUsuario),
    {
      mensagem: `O projeto "${v.titulo}" foi atualizado.`,
      tipo: "projeto",
      link: `/projetos/${idProjeto}`,
    }
  );

  return paraProjetoDTO(await ProjetoRepository.buscarPorId(idProjeto));
}

async function conferirVagas(idProjeto, vagas) {
  const aprovados = await ProjetoRepository.contarAprovados(idProjeto);
  if (vagas === null && aprovados > 0) {
    throw conflito(`Já existem ${aprovados} candidatos aprovados; não é possível remover as vagas`);
  }
  if (vagas !== null && vagas < aprovados) {
    throw conflito(`Já existem ${aprovados} candidatos aprovados; as vagas não podem ser menores`);
  }
}


export async function atualizarInscricoes(idProjeto, idUsuario, dados = {}) {
  await exigirCoordenador(idProjeto, idUsuario);

  const atual = await ProjetoRepository.buscarBruto(idProjeto);
  if (!atual || atual.status === "cancelado") throw naoEncontrado("Projeto não encontrado");
  if (atual.status !== "ativo") throw conflito("Só é possível alterar inscrições de projetos ativos");

  const inscricao = validarInscricao(dados);
  await conferirVagas(idProjeto, inscricao.vagas_totais);
  await ProjetoRepository.atualizarInscricao(idProjeto, inscricao);

  if (atual.vagas_totais == null && inscricao.vagas_totais !== null) {
    const seguidores = await ProjetoRepository.idsSeguidores(idProjeto);
    await NotificacaoService.notificar(
      seguidores.filter((s) => s !== idUsuario),
      {
        mensagem: `Inscrições abertas em "${atual.titulo}".`,
        tipo: "projeto",
        link: `/projetos/${idProjeto}`,
      }
    );
  }

  return paraProjetoDTO(await ProjetoRepository.buscarPorId(idProjeto));
}

//linha do tempooo

function validarHistorico(d = {}) {
  const ano = Number(d.ano);
  if (!Number.isInteger(ano) || ano < 1900 || ano > 2100) throw invalido("Informe o ano (ex: 2024)");
  const titulo = textoObrigatorio(d.titulo, 150, "título");
  const descricao = texto(d.descricao, 2000, "descrição") || null;
  return { ano, titulo, descricao };
}

async function projetoParaHistorico(idProjeto, idUsuario) {
  await exigirCoordenador(idProjeto, idUsuario);
  const projeto = await ProjetoRepository.buscarBruto(idProjeto);
  if (!projeto || projeto.status === "cancelado") throw naoEncontrado("Projeto não encontrado");
}

export async function criarHistorico(idProjeto, idUsuario, dados) {
  await projetoParaHistorico(idProjeto, idUsuario);
  const id = await ProjetoRepository.criarHistorico(idProjeto, validarHistorico(dados));
  return { id: String(id) };
}

export async function atualizarHistorico(idProjeto, idItem, idUsuario, dados) {
  await projetoParaHistorico(idProjeto, idUsuario);
  if (!(await ProjetoRepository.atualizarHistorico(idProjeto, idItem, validarHistorico(dados)))) {
    throw naoEncontrado("Item da linha do tempo não encontrado");
  }
}

export async function excluirHistorico(idProjeto, idItem, idUsuario) {
  await projetoParaHistorico(idProjeto, idUsuario);
  if (!(await ProjetoRepository.excluirHistorico(idProjeto, idItem))) {
    throw naoEncontrado("Item da linha do tempo não encontrado");
  }
}

export async function encerrar(idProjeto, idUsuario) {
  await exigirCoordenador(idProjeto, idUsuario);

  const projeto = await ProjetoRepository.buscarBruto(idProjeto);
  if (!projeto || projeto.status === "cancelado") throw naoEncontrado("Projeto não encontrado");
  if (projeto.status === "encerrado") throw conflito("O projeto já está encerrado");

  await ProjetoRepository.atualizarStatus(idProjeto, "encerrado");

  const seguidores = await ProjetoRepository.idsSeguidores(idProjeto);
  await NotificacaoService.notificar(
    seguidores.filter((s) => s !== idUsuario),
    {
      mensagem: `O projeto "${projeto.titulo}" foi encerrado.`,
      tipo: "projeto",
      link: `/projetos/${idProjeto}`,
    }
  );

  return paraProjetoDTO(await ProjetoRepository.buscarPorId(idProjeto));
}


export async function excluir(idProjeto, usuario) {
  const projeto = await ProjetoRepository.buscarBruto(idProjeto);
  if (!projeto || projeto.status === "cancelado") throw naoEncontrado("Projeto não encontrado");

  if (usuario.tipo !== "administrador") {
    await exigirCoordenador(idProjeto, usuario.id);
  }

  await ProjetoRepository.atualizarStatus(idProjeto, "cancelado");
}

// Painel do administrador: inclui as atividades desativadas
export async function listarParaAdmin(busca) {
  const projetos = await ProjetoRepository.listar({ status: "todos", busca, incluirDesativadas: true });
  return projetos.map((p) => paraProjetoDTO(p));
}


export async function ativar(idProjeto, usuario) {
  if (usuario.tipo !== "administrador") throw proibido("Apenas administradores podem ativar atividades");
  const projeto = await ProjetoRepository.buscarBruto(idProjeto);
  if (!projeto) throw naoEncontrado("Projeto não encontrado");
  if (projeto.status !== "cancelado") throw conflito("Esta atividade já está ativa");

  await ProjetoRepository.atualizarStatus(idProjeto, "ativo");
  return paraProjetoDTO(await ProjetoRepository.buscarPorId(idProjeto, true));
}

export async function listar(filtros = {}) {
  return (await ProjetoRepository.listar(filtros)).map((p) => paraProjetoDTO(p));
}


export async function detalhe(idProjeto, usuario) {

  const projeto = await ProjetoRepository.buscarPorId(idProjeto, usuario.tipo === "administrador");
  if (!projeto) throw naoEncontrado("Projeto não encontrado");

  const seguindo = await ProjetoRepository.estaSeguindo(usuario.id, idProjeto);

  let candidatura = null;
  if (usuario.tipo === "aluno") {
    const c = await CandidaturaRepository.buscarDoAlunoNoProjeto(usuario.id, idProjeto);
    if (c) {
      candidatura = {
        id: String(c.id_candidatura),
        status: c.status,
        justificativa: c.justificativa_professor ?? "",
      };
    }
  }

  return { projeto: paraProjetoDTO(projeto), seguindo, candidatura };
}

export async function listarDoUsuario(idUsuario) {
  const usuario = await UsuarioRepository.buscarPorId(idUsuario);
  if (!usuario || !usuario.ativo) throw naoEncontrado("Usuário não encontrado");

  const projetos = (await ProjetoRepository.listarDoUsuario(idUsuario)).map((p) => paraProjetoDTO(p));

  return {
    coordenados: projetos.filter((p) => p.coordenadores.some((c) => c.id === idUsuario)),
    integrando: projetos.filter((p) => p.integrantes.some((i) => i.id === idUsuario)),
  };
}

export async function opcoes() {
  const [areas, tipos] = await Promise.all([
    ProjetoRepository.listarAreas(),
    ProjetoRepository.listarTipos(),
  ]);
  return { areas, tipos };
}

/* ---------- feed ---------- */

export async function feed(filtros, idUsuario) {
  const projetos = await ProjetoRepository.listar(filtros);
  const posts = await ProjetoRepository.postsDosProjetos(projetos.map((p) => p.id_atividade));
  const porId = new Map(projetos.map((p) => [p.id_atividade, p]));

  const itens = [];

  for (const p of projetos) {
    const dto = paraProjetoDTO(p);
    itens.push({
      kind: "projeto",
      id: dto.id,
      projetoId: dto.id,
      projetoNome: dto.nome,
      objetivo: dto.objetivo,
      area: dto.area,
      tipo: dto.tipo,
      data: dto.dataCriacao,
      tags: dto.tags,
      coordenadores: dto.coordenadores.map((c) => c.nome),
      ehVaga: dto.inscricoesAbertas,
      vagasDisponiveis: dto.vagasDisponiveis,
      fimInscricao: dto.fimInscricao,
    });
  }

  for (const post of posts) {
    const p = porId.get(post.id_atividade);
    const dto = paraProjetoDTO(p);
    itens.push({
      kind: "post",
      id: String(post.id_post),
      projetoId: dto.id,
      projetoNome: dto.nome,
      area: dto.area,
      tipo: dto.tipo,
      tags: dto.tags,
      coordenadores: dto.coordenadores.map((c) => c.nome),
      autorNome: post.autor_nome,
      texto: post.texto ?? "",
      midia: post.midia,
      ehVaga: Boolean(post.eh_vaga),
      vagas: post.vagas,
      data: String(post.data_publicacao).replace(" ", "T"),
    });
  }

  itens.sort((a, b) => (a.data < b.data ? 1 : -1));

  return { itens, seguindo: await ProjetoRepository.idsSeguidos(idUsuario) };
}

/* ---------- publicações ---------- */

async function apagarArquivos(midia = []) {
  for (const m of midia) {
    await fs.unlink(path.join(PASTA_UPLOADS, path.basename(m.id))).catch(() => {});
  }
}

export async function publicar(idProjeto, usuario, dados = {}, arquivos = []) {
  const arquivosEnviados = arquivos.map((a) => ({ id: a.filename, tipo: a.mimetype.startsWith("video/") ? "video" : "imagem", nome: a.originalname, url: `/uploads/${a.filename}`, bytes: a.size }));

  try {
    await exigirCoordenador(idProjeto, usuario.id);

    const projeto = await ProjetoRepository.buscarBruto(idProjeto);
    if (!projeto || projeto.status === "cancelado") throw naoEncontrado("Projeto não encontrado");

    const conteudo = texto(dados.texto, 5000, "texto");
    if (!conteudo && arquivos.length === 0) throw invalido("Escreva algo ou anexe uma foto ou vídeo");

    for (const a of arquivosEnviados) {
      if (a.tipo === "imagem" && a.bytes > LIMITE_IMAGEM) {
        throw invalido(`A foto "${a.nome}" passa de 10 MB`);
      }
    }

    const ehVaga = dados.ehVaga === true || dados.ehVaga === "true";
    const vagas = ehVaga && dados.vagas ? Number(dados.vagas) : null;
    if (vagas !== null && (!Number.isInteger(vagas) || vagas < 1)) throw invalido("Número de vagas inválido");

    const midia = arquivosEnviados.map(({ bytes, ...m }) => m);

    await ProjetoRepository.criarPost({
      id_atividade: idProjeto, id_usuario: usuario.id, texto: conteudo, midia, eh_vaga: ehVaga, vagas,
    });

    const seguidores = await ProjetoRepository.idsSeguidores(idProjeto);
    await NotificacaoService.notificar(
      seguidores.filter((s) => s !== usuario.id),
      {
        mensagem: ehVaga
          ? `Nova vaga em "${projeto.titulo}".`
          : `Nova publicação em "${projeto.titulo}".`,
        tipo: "publicacao",
        link: `/projetos/${idProjeto}`,
      }
    );
  } catch (erro) {
    await apagarArquivos(arquivosEnviados);
    throw erro;
  }

  return paraProjetoDTO(await ProjetoRepository.buscarPorId(idProjeto));
}

export async function excluirPost(idProjeto, idPost, usuario) {
  const post = await ProjetoRepository.buscarPost(idPost);
  if (!post || String(post.id_atividade) !== String(idProjeto)) throw naoEncontrado("Publicação não encontrada");

  if (usuario.tipo !== "administrador") {
    await exigirCoordenador(idProjeto, usuario.id);
  }

  await ProjetoRepository.excluirPost(idPost);
  await apagarArquivos(post.midia);
}

/* ---------- equipe ---------- */

export async function adicionarCoordenador(idProjeto, idUsuario, idNovo) {
  await exigirCoordenador(idProjeto, idUsuario);

  const novo = await UsuarioRepository.buscarPorId(idNovo);
  if (!novo || !novo.ativo || novo.tipo_usuario !== "professor") {
    throw naoEncontrado("Professor não encontrado");
  }
  if (await ProjetoRepository.ehCoordenador(idProjeto, idNovo)) {
    throw conflito("Esse professor já coordena o projeto");
  }

  const projeto = await ProjetoRepository.buscarBruto(idProjeto);
  await ProjetoRepository.adicionarCoordenador(idProjeto, idNovo);
  await NotificacaoService.notificar([idNovo], {
    mensagem: `Você agora coordena o projeto "${projeto.titulo}".`,
    tipo: "projeto",
    link: `/projetos/${idProjeto}`,
  });

  return paraProjetoDTO(await ProjetoRepository.buscarPorId(idProjeto));
}

export async function listarProfessores() {
  return UsuarioRepository.listarProfessores();
}

export async function buscarAlunos(termo) {
  const t = String(termo ?? "").trim();
  if (t.length < 2) return [];
  return UsuarioRepository.buscarAlunos(t);
}


export async function alternarSeguir(idUsuario, idProjeto) {
  const projeto = await ProjetoRepository.buscarBruto(idProjeto);
  if (!projeto || projeto.status === "cancelado") throw naoEncontrado("Projeto não encontrado");

  if (await ProjetoRepository.estaSeguindo(idUsuario, idProjeto)) {
    await ProjetoRepository.deixarDeSeguir(idUsuario, idProjeto);
    return { seguindo: false };
  }
  await ProjetoRepository.seguir(idUsuario, idProjeto);
  return { seguindo: true };
}

export async function listarSeguidos(idUsuario) {
  return (await ProjetoRepository.listarSeguidos(idUsuario)).map((p) => paraProjetoDTO(p));
}
