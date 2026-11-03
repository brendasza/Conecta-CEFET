import * as AgendaPessoalRepository from "../repositories/AgendaPessoalRepository.js";
import { invalido, naoEncontrado } from "../utils/erros.js";
import { texto, textoObrigatorio, dataMysql, paraIso } from "../utils/texto.js";

function validar(d = {}) {
  const titulo = textoObrigatorio(d.titulo, 150, "título");
  const descricao = texto(d.descricao, 2000, "descrição") || null;
  const inicio = dataMysql(d.inicio, "início");
  if (!inicio) throw invalido("Informe a data");
  const fim = dataMysql(d.fim, "fim") || inicio;
  if (fim < inicio) throw invalido("O fim não pode ser antes do início");
  return { titulo, descricao, inicio, fim };
}

// Lembretes do próprio aluno: não mexem no calendário oficial da instituição
export async function listar(idUsuario) {
  const linhas = await AgendaPessoalRepository.listar(idUsuario);
  return linhas.map((l) => ({
    id: `ps-${l.id_item}`,
    itemId: String(l.id_item),
    titulo: l.titulo,
    descricao: l.descricao ?? "",
    inicio: paraIso(l.data_inicio),
    fim: paraIso(l.data_fim),
    origem: "pessoal",
  }));
}

export async function criar(idUsuario, dados) {
  const id = await AgendaPessoalRepository.criar({ id_usuario: idUsuario, ...validar(dados) });
  return { id: String(id) };
}

export async function atualizar(idUsuario, id, dados) {
  if (!(await AgendaPessoalRepository.atualizar(id, idUsuario, validar(dados)))) {
    throw naoEncontrado("Lembrete não encontrado");
  }
}

export async function excluir(idUsuario, id) {
  if (!(await AgendaPessoalRepository.excluir(id, idUsuario))) throw naoEncontrado("Lembrete não encontrado");
}
