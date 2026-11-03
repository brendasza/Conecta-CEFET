import * as AdminService from "../services/AdminService.js";
import * as ProjetoService from "../services/ProjetoService.js";
import * as AnoLetivoService from "../services/AnoLetivoService.js";
import { inteiroPositivo } from "../utils/texto.js";

const id = (req) => inteiroPositivo(req.params.id);

export async function dashboard(req, res) {
  res.json(await AdminService.dashboard());
}

export async function listarUsuarios(req, res) {
  const { busca, tipo, ativo } = req.query;
  res.json({ usuarios: await AdminService.listarUsuarios({ busca, tipo, ativo }) });
}

export async function definirAtivo(req, res) {
  await AdminService.definirAtivo(req.usuario.id, id(req), req.body.ativo === true);
  res.status(204).end();
}

export async function listarProjetos(req, res) {
  res.json({
    projetos: await ProjetoService.listarParaAdmin(req.query.busca),
  });
}

/* notícias */

export async function criarNoticia(req, res) {
  res.status(201).json(await AdminService.criarNoticia(req.usuario.id, req.body));
}

export async function atualizarNoticia(req, res) {
  await AdminService.atualizarNoticia(id(req), req.body, req.usuario.id);
  res.status(204).end();
}

export async function excluirNoticia(req, res) {
  await AdminService.excluirNoticia(id(req), req.usuario.id);
  res.status(204).end();
}

/* eventos do calendário */

export async function criarEvento(req, res) {
  res.status(201).json(await AdminService.criarEvento(req.body, req.usuario.id));
}

export async function atualizarEvento(req, res) {
  await AdminService.atualizarEvento(id(req), req.body, req.usuario.id);
  res.status(204).end();
}

export async function excluirEvento(req, res) {
  await AdminService.excluirEvento(id(req), req.usuario.id);
  res.status(204).end();
}


/* cadastros de apoio */

export async function listarApoio(req, res) {
  res.json({ itens: await AdminService.listarApoio(req.params.categoria) });
}

export async function criarApoio(req, res) {
  res.status(201).json(await AdminService.criarApoio(req.params.categoria, req.body?.nome, req.usuario.id));
}

export async function renomearApoio(req, res) {
  await AdminService.renomearApoio(req.params.categoria, id(req), req.body?.nome, req.usuario.id);
  res.status(204).end();
}

export async function excluirApoio(req, res) {
  await AdminService.excluirApoio(req.params.categoria, id(req), req.usuario.id);
  res.status(204).end();
}

/* moderação e logs */

export async function listarPosts(req, res) {
  res.json({ posts: await AdminService.listarPosts({ busca: req.query.busca }) });
}

export async function removerPost(req, res) {
  await AdminService.removerPost(id(req), req.usuario.id);
  res.status(204).end();
}

export async function listarLogs(req, res) {
  res.json({ logs: await AdminService.listarLogs({ limite: req.query.limite, acao: req.query.acao }) });
}

/* tipo e nível de acesso */

export async function alterarNivel(req, res) {
  await AdminService.alterarNivel(req.usuario.id, id(req), req.body?.nivel);
  res.status(204).end();
}

/* ano letivo */

export async function listarAnosLetivos(req, res) {
  res.json({ anos: await AnoLetivoService.listar() });
}

export async function salvarAnoLetivo(req, res) {
  res.status(201).json(await AnoLetivoService.salvarAno(req.body, req.usuario.id));
}

export async function excluirAnoLetivo(req, res) {
  await AnoLetivoService.excluirAno(req.params.ano, req.usuario.id);
  res.status(204).end();
}

export async function criarPeriodo(req, res) {
  res.status(201).json(await AnoLetivoService.criarPeriodo(req.params.ano, req.body, req.usuario.id));
}

export async function atualizarPeriodo(req, res) {
  await AnoLetivoService.atualizarPeriodo(id(req), req.body, req.usuario.id);
  res.status(204).end();
}

export async function excluirPeriodo(req, res) {
  await AnoLetivoService.excluirPeriodo(id(req), req.usuario.id);
  res.status(204).end();
}
