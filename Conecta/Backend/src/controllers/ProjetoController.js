import * as ProjetoService from "../services/ProjetoService.js";
import { inteiroPositivo } from "../utils/texto.js";

// Express 5 repassa erros de funções async ao errorHandler; não precisa de try/catch.

const id = (req, nome = "id") => inteiroPositivo(req.params[nome], nome);

export async function feed(req, res) {
  const { busca, area, tipo, status } = req.query;
  res.json(await ProjetoService.feed({ busca, area, tipo, status }, req.usuario.id));
}

export async function listar(req, res) {
  const { busca, area, tipo, status } = req.query;
  res.json({ projetos: await ProjetoService.listar({ busca, area, tipo, status }) });
}

export async function opcoes(req, res) {
  res.json(await ProjetoService.opcoes());
}

export async function buscarPorId(req, res) {
  res.json(await ProjetoService.detalhe(id(req), req.usuario));
}

export async function listarMeus(req, res) {
  res.json(await ProjetoService.listarDoUsuario(req.usuario.id));
}

export async function criar(req, res) {
  res.status(201).json({ projeto: await ProjetoService.criar(req.usuario.id, req.body) });
}

export async function atualizar(req, res) {
  res.json({ projeto: await ProjetoService.atualizar(id(req), req.usuario.id, req.body) });
}

export async function encerrar(req, res) {
  res.json({ projeto: await ProjetoService.encerrar(id(req), req.usuario.id) });
}

export async function excluir(req, res) {
  await ProjetoService.excluir(id(req), req.usuario);
  res.status(204).end();
}

export async function publicar(req, res) {
  const projeto = await ProjetoService.publicar(id(req), req.usuario, req.body, req.files || []);
  res.status(201).json({ projeto });
}

export async function excluirPost(req, res) {
  await ProjetoService.excluirPost(id(req), id(req, "idPost"), req.usuario);
  res.status(204).end();
}

export async function listarProfessores(req, res) {
  res.json({ professores: await ProjetoService.listarProfessores() });
}

export async function adicionarCoordenador(req, res) {
  const projeto = await ProjetoService.adicionarCoordenador(
    id(req), req.usuario.id, inteiroPositivo(req.body.idUsuario, "professor")
  );
  res.json({ projeto });
}

export async function buscarAlunos(req, res) {
  res.json({ alunos: await ProjetoService.buscarAlunos(req.query.termo) });
}

export async function alternarSeguir(req, res) {
  res.json(await ProjetoService.alternarSeguir(req.usuario.id, id(req)));
}

export async function listarSeguidos(req, res) {
  res.json({ projetos: await ProjetoService.listarSeguidos(req.usuario.id) });
}

export async function atualizarInscricoes(req, res) {
  res.json({ projeto: await ProjetoService.atualizarInscricoes(id(req), req.usuario.id, req.body) });
}

export async function criarHistorico(req, res) {
  res.status(201).json(await ProjetoService.criarHistorico(id(req), req.usuario.id, req.body));
}

export async function atualizarHistorico(req, res) {
  await ProjetoService.atualizarHistorico(id(req), id(req, "idItem"), req.usuario.id, req.body);
  res.status(204).end();
}

export async function excluirHistorico(req, res) {
  await ProjetoService.excluirHistorico(id(req), id(req, "idItem"), req.usuario.id);
  res.status(204).end();
}

export async function ativar(req, res) {
  res.json({ projeto: await ProjetoService.ativar(id(req), req.usuario) });
}
