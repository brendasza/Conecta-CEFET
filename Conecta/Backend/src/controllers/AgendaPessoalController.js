import * as EventoProfessorService from "../services/EventoProfessorService.js";
import * as AgendaPessoalService from "../services/AgendaPessoalService.js";
import { inteiroPositivo } from "../utils/texto.js";

export async function listar(req, res) {
  res.json({ itens: await AgendaPessoalService.listar(req.usuario.id) });
}

export async function criar(req, res) {
  res.status(201).json(await AgendaPessoalService.criar(req.usuario.id, req.body));
}

export async function atualizar(req, res) {
  await AgendaPessoalService.atualizar(req.usuario.id, inteiroPositivo(req.params.id), req.body);
  res.status(204).end();
}

export async function excluir(req, res) {
  await AgendaPessoalService.excluir(req.usuario.id, inteiroPositivo(req.params.id));
  res.status(204).end();
}

// eventos institucionais criados por professores
export async function criarEvento(req, res) {
  res.status(201).json(await EventoProfessorService.criar(req.usuario.id, req.body));
}

export async function atualizarEvento(req, res) {
  await EventoProfessorService.atualizar(req.usuario.id, inteiroPositivo(req.params.id), req.body);
  res.status(204).end();
}

export async function excluirEvento(req, res) {
  await EventoProfessorService.excluir(req.usuario.id, inteiroPositivo(req.params.id));
  res.status(204).end();
}
