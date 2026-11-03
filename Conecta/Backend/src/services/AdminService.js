import * as AdminRepository from "../repositories/AdminRepository.js";
import * as UsuarioRepository from "../repositories/UsuarioRepository.js";
import { invalido, naoEncontrado, conflito } from "../utils/erros.js";
import { texto, textoObrigatorio, dataMysql, paraIso } from "../utils/texto.js";
import * as LogService from "./LogService.js";
import * as AnoLetivoService from "./AnoLetivoService.js";
import * as ProjetoRepository from "../repositories/ProjetoRepository.js";
import * as AgendaPessoalRepository from "../repositories/AgendaPessoalRepository.js";


export const dashboard = AdminRepository.dashboard;


export async function listarUsuarios(filtros) {
  const linhas = await AdminRepository.listarUsuarios(filtros);
  return linhas.map((u) => ({
    id: u.id,
    nome: u.nome,
    email: u.email,
    tipo: u.tipo,
    ativo: Boolean(u.ativo),
    criadoEm: paraIso(u.created_at),
    identificador: u.matricula ?? u.siape ?? null,
    nivelAcesso: u.nivel_acesso != null && u.tipo === "administrador" ? Number(u.nivel_acesso) : null,
  }));
}

export async function alterarNivel(idAdmin, idUsuario, nivel) {
  const n = Number(nivel);
  if (![1, 2, 3].includes(n)) throw invalido("O nível de acesso deve ser 1, 2 ou 3");
  if (idAdmin === idUsuario) throw conflito("Você não pode alterar o próprio nível de acesso");

  const usuario = await UsuarioRepository.buscarPorId(idUsuario);
  if (!usuario) throw naoEncontrado("Usuário não encontrado");
  if (usuario.tipo_usuario !== "administrador") throw conflito("Só administradores têm nível de acesso");

  await AdminRepository.definirNivel(idUsuario, n);
  await LogService.registrar(idAdmin, "usuario.nivel_alterado", "usuario", idUsuario, `${usuario.email} -> nível ${n}`);
}

export async function definirAtivo(idAdmin, idUsuario, ativo) {
  if (idAdmin === idUsuario) throw conflito("Você não pode desativar a própria conta");

  const usuario = await UsuarioRepository.buscarPorId(idUsuario);
  if (!usuario) throw naoEncontrado("Usuário não encontrado");

  await AdminRepository.definirAtivo(idUsuario, Boolean(ativo));
  await LogService.registrar(idAdmin, ativo ? "usuario.ativado" : "usuario.desativado", "usuario", idUsuario, usuario.email);
}

/* ---------- notícias (mural) ---------- */

function paraNoticiaDTO(n) {
  return {
    id: String(n.id_noticia),
    titulo: n.titulo,
    conteudo: n.conteudo,
    imagem: n.imagem_destaque ?? "",
    fixado: Boolean(n.fixado),
    data: paraIso(n.data_publicacao),
    autor: n.autor,
  };
}

function validarNoticia(d = {}) {
  const imagem = texto(d.imagem, 255, "link da imagem");
  if (imagem && !/^https?:\/\//i.test(imagem)) throw invalido("O link da imagem deve começar com http:// ou https://");

  return {
    titulo: textoObrigatorio(d.titulo, 150, "título"),
    conteudo: textoObrigatorio(d.conteudo, 10000, "conteúdo"),
    imagem: imagem || null,
    fixado: d.fixado === true,
  };
}

export async function listarNoticias() {
  return (await AdminRepository.listarNoticias()).map(paraNoticiaDTO);
}

export async function criarNoticia(idAdmin, dados) {
  const id = await AdminRepository.criarNoticia({ id_usuario: idAdmin, ...validarNoticia(dados) });
  await LogService.registrar(idAdmin, "noticia.criada", "noticia", id, dados?.titulo);
  return { id: String(id) };
}

export async function atualizarNoticia(id, dados, idAdmin = null) {
  const ok = await AdminRepository.atualizarNoticia(id, validarNoticia(dados));
  if (!ok) throw naoEncontrado("Notícia não encontrada");
  await LogService.registrar(idAdmin, "noticia.atualizada", "noticia", id, dados?.titulo);
}

export async function excluirNoticia(id, idAdmin = null) {
  if (!(await AdminRepository.excluirNoticia(id))) throw naoEncontrado("Notícia não encontrada");
  await LogService.registrar(idAdmin, "noticia.excluida", "noticia", id);
}


export async function validarEvento(d = {}) {
  const titulo = textoObrigatorio(d.titulo, 150, "título");
  const descricao = texto(d.descricao, 5000, "descrição") || null;
  const inicio = dataMysql(d.inicio, "início");
  if (!inicio) throw invalido("Informe a data de início");
  const fim = dataMysql(d.fim, "fim") || inicio;
  if (fim < inicio) throw invalido("O fim não pode ser antes do início");

  const id_calendario = await AdminRepository.obterOuCriarCalendario(inicio.slice(0, 4));
  return { id_calendario, titulo, descricao, inicio, fim };
}

export async function criarEvento(dados, idAdmin = null) {
  const id = await AdminRepository.criarEvento(await validarEvento(dados));
  await LogService.registrar(idAdmin, "evento.criado", "evento", id, dados?.titulo);
  return { id: String(id) };
}

export async function atualizarEvento(id, dados, idAdmin = null) {
  const ok = await AdminRepository.atualizarEvento(id, await validarEvento(dados));
  if (!ok) throw naoEncontrado("Evento não encontrado");
  await LogService.registrar(idAdmin, "evento.atualizado", "evento", id, dados?.titulo);
}

export async function excluirEvento(id, idAdmin = null) {
  if (!(await AdminRepository.excluirEvento(id))) throw naoEncontrado("Evento não encontrado");
  await LogService.registrar(idAdmin, "evento.excluido", "evento", id);
}

async function eventosDoAutor(idUsuario) {
  if (!idUsuario) return new Set();
  try {
    return new Set(await AgendaPessoalRepository.idsEventosDoAutor(idUsuario));
  } catch (erro) {
    console.error("Autoria de eventos indisponível:", erro.message);
    return new Set();
  }
}

export async function agenda(idUsuario = null) {
  const [eventos, prazos, periodos, meus] = await Promise.all([
    AdminRepository.listarEventos(),
    AdminRepository.prazosDeProjetos(),
    AnoLetivoService.itensAgenda(),
    eventosDoAutor(idUsuario),
  ]);

  const itens = eventos.map((e) => ({
    id: `ev-${e.id_evento}`,
    eventoId: String(e.id_evento),
    titulo: e.titulo,
    descricao: e.descricao ?? "",
    inicio: paraIso(e.data_inicio),
    fim: paraIso(e.data_fim),
    origem: "calendario",
    meu: meus.has(String(e.id_evento)), 
  }));

  itens.push(...periodos); 

  for (const p of prazos) {
    if (p.data_inicio_inscricao) {
      itens.push({
        id: `pj-${p.id_atividade}-ini`,
        titulo: `Inscrições abertas: ${p.titulo}`,
        descricao: "",
        inicio: paraIso(p.data_inicio_inscricao),
        fim: paraIso(p.data_inicio_inscricao),
        origem: "projeto",
        projetoId: String(p.id_atividade),
      });
    }
    if (p.data_fim_inscricao) {
      itens.push({
        id: `pj-${p.id_atividade}-fim`,
        titulo: `Fim das inscrições: ${p.titulo}`,
        descricao: "",
        inicio: paraIso(p.data_fim_inscricao),
        fim: paraIso(p.data_fim_inscricao),
        origem: "projeto",
        projetoId: String(p.id_atividade),
      });
    }
  }

  return itens.sort((a, b) => (a.inicio < b.inicio ? -1 : 1));
}


function categoriaValida(categoria) {
  const cfg = AdminRepository.apoioConfig(categoria);
  if (!cfg) throw naoEncontrado("Cadastro não encontrado");
  return cfg;
}

export async function listarApoio(categoria) {
  categoriaValida(categoria);
  return AdminRepository.listarApoio(categoria);
}

export async function criarApoio(categoria, nome, idAdmin) {
  const cfg = categoriaValida(categoria);
  const n = textoObrigatorio(nome, cfg.tamanho, "nome");
  try {
    const id = await AdminRepository.criarApoio(categoria, n);
    await LogService.registrar(idAdmin, `${categoria}.criado`, categoria, id, n);
    return { id: String(id) };
  } catch (erro) {
    if (erro.code === "ER_DUP_ENTRY") throw conflito("Já existe um item com esse nome");
    throw erro;
  }
}

export async function renomearApoio(categoria, id, nome, idAdmin) {
  const cfg = categoriaValida(categoria);
  const n = textoObrigatorio(nome, cfg.tamanho, "nome");
  try {
    if (!(await AdminRepository.renomearApoio(categoria, id, n))) throw naoEncontrado("Item não encontrado");
  } catch (erro) {
    if (erro.code === "ER_DUP_ENTRY") throw conflito("Já existe um item com esse nome");
    throw erro;
  }
  await LogService.registrar(idAdmin, `${categoria}.renomeado`, categoria, id, n);
}

export async function excluirApoio(categoria, id, idAdmin) {
  categoriaValida(categoria);
  const usos = await AdminRepository.usosDeApoio(categoria, id);
  if (usos === null) throw naoEncontrado("Item não encontrado");
  if (usos > 0) throw conflito(`Este item está em uso (${usos}) e não pode ser excluído`);
  await AdminRepository.excluirApoio(categoria, id);
  await LogService.registrar(idAdmin, `${categoria}.excluido`, categoria, id);
}


export async function listarPosts(filtros) {
  const linhas = await AdminRepository.listarPosts(filtros);
  return linhas.map((p) => ({
    id: String(p.id_post),
    projetoId: String(p.id_atividade),
    projeto: p.projeto,
    autor: p.autor,
    texto: p.texto ?? "",
    ehVaga: Boolean(p.eh_vaga),
    temMidia: Boolean(p.midia && p.midia !== "[]"),
    data: paraIso(p.data_publicacao),
  }));
}

export async function removerPost(idPost, idAdmin) {
  const post = await ProjetoRepository.buscarPost(idPost);
  if (!post) throw naoEncontrado("Publicação não encontrada");
  await ProjetoRepository.excluirPost(idPost);
  await LogService.registrar(idAdmin, "post.removido", "post", idPost, `projeto ${post.id_atividade}`);
}

export const listarLogs = LogService.listar;
