import * as AdminRepository from "../repositories/AdminRepository.js";
import * as AgendaPessoalRepository from "../repositories/AgendaPessoalRepository.js";
import { validarEvento } from "./AdminService.js";
import { naoEncontrado } from "../utils/erros.js";

async function exigirAutor(id, idUsuario) {
  if (!(await AgendaPessoalRepository.ehAutor(id, idUsuario))) {
    throw naoEncontrado("Evento não encontrado ou criado por outra pessoa");
  }
}

export async function criar(idUsuario, dados) {
  const v = await validarEvento(dados);
  const id = await AdminRepository.criarEvento(v);
  await AgendaPessoalRepository.registrarAutoria(id, idUsuario);
  return { id: String(id) };
}

export async function atualizar(idUsuario, id, dados) {
  await exigirAutor(id, idUsuario);
  const v = await validarEvento(dados);
  if (!(await AdminRepository.atualizarEvento(id, v))) throw naoEncontrado("Evento não encontrado");
}

export async function excluir(idUsuario, id) {
  await exigirAutor(id, idUsuario);
  await AdminRepository.excluirEvento(id);
  await AgendaPessoalRepository.removerAutoria(id);
}
