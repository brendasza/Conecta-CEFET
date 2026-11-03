import * as AnoLetivoRepository from "../repositories/AnoLetivoRepository.js";
import * as AdminRepository from "../repositories/AdminRepository.js";
import { invalido, naoEncontrado } from "../utils/erros.js";
import { textoObrigatorio } from "../utils/texto.js";
import * as LogService from "./LogService.js";

const TIPOS = ["semestre", "recesso"];

// "2026-02-09" (input type="date") -> "2026-02-09"
function dataSimples(valor, campo) {
  const m = String(valor ?? "").match(/^(\d{4}-\d{2}-\d{2})/);
  if (!m) throw invalido(`Informe a data de ${campo}`);
  return m[1];
}

function validarAno(valor) {
  const ano = String(valor ?? "").trim();
  if (!/^\d{4}$/.test(ano)) throw invalido("Informe o ano com 4 dígitos (ex: 2026)");
  return ano;
}

const paraAnoDTO = (a) => ({ ano: a.ano, inicioAulas: a.inicio_aulas, fimAulas: a.fim_aulas });
const paraPeriodoDTO = (p) => ({
  id: String(p.id_periodo),
  ano: p.ano,
  tipo: p.tipo,
  titulo: p.titulo,
  inicio: p.data_inicio,
  fim: p.data_fim,
});

export async function listar() {
  const { anos, periodos } = await AnoLetivoRepository.listarAnos();
  return anos.map((a) => ({
    ...paraAnoDTO(a),
    periodos: periodos.filter((p) => p.ano === a.ano).map(paraPeriodoDTO),
  }));
}

export async function salvarAno({ ano, inicioAulas, fimAulas } = {}, idAdmin = null) {
  const a = validarAno(ano);
  const inicio = dataSimples(inicioAulas, "início das aulas");
  const fim = dataSimples(fimAulas, "fim das aulas");
  if (fim < inicio) throw invalido("O fim das aulas não pode ser antes do início");

  await AnoLetivoRepository.salvarAno({ ano: a, inicio, fim });
  await AdminRepository.obterOuCriarCalendario(a); // mantém o calendário do ano criado
  await LogService.registrar(idAdmin, "ano_letivo.salvo", "ano_letivo", a, `${inicio} a ${fim}`);
  return { ano: a };
}

export async function excluirAno(ano, idAdmin = null) {
  const a = validarAno(ano);
  if (!(await AnoLetivoRepository.excluirAno(a))) throw naoEncontrado("Ano letivo não encontrado");
  await LogService.registrar(idAdmin, "ano_letivo.excluido", "ano_letivo", a);
}

function validarPeriodo(d = {}) {
  const tipo = String(d.tipo ?? "").trim();
  if (!TIPOS.includes(tipo)) throw invalido("O período deve ser semestre ou recesso");
  const titulo = textoObrigatorio(d.titulo, 150, "título");
  const inicio = dataSimples(d.inicio, "início");
  const fim = dataSimples(d.fim ?? d.inicio, "fim");
  if (fim < inicio) throw invalido("O fim não pode ser antes do início");
  return { tipo, titulo, inicio, fim };
}

export async function criarPeriodo(ano, dados, idAdmin = null) {
  const a = validarAno(ano);
  if (!(await AnoLetivoRepository.anoExiste(a))) throw naoEncontrado("Cadastre o ano letivo antes de incluir períodos");
  const v = validarPeriodo(dados);
  const id = await AnoLetivoRepository.criarPeriodo({ ano: a, ...v });
  await LogService.registrar(idAdmin, "periodo_letivo.criado", "periodo_letivo", id, v.titulo);
  return { id: String(id) };
}

export async function atualizarPeriodo(id, dados, idAdmin = null) {
  const v = validarPeriodo(dados);
  if (!(await AnoLetivoRepository.atualizarPeriodo(id, v))) throw naoEncontrado("Período não encontrado");
  await LogService.registrar(idAdmin, "periodo_letivo.atualizado", "periodo_letivo", id, v.titulo);
}

export async function excluirPeriodo(id, idAdmin = null) {
  if (!(await AnoLetivoRepository.excluirPeriodo(id))) throw naoEncontrado("Período não encontrado");
  await LogService.registrar(idAdmin, "periodo_letivo.excluido", "periodo_letivo", id);
}

// Itens do ano letivo que entram na agenda de todos (origem "periodo")
export async function itensAgenda() {
  let dados;
  try {
    dados = await AnoLetivoRepository.listarAnos();
  } catch (erro) {
    // migração ainda não rodada: a agenda continua funcionando sem o ano letivo
    console.error("Ano letivo indisponível:", erro.message);
    return [];
  }
  const { anos, periodos } = dados;
  const itens = [];

  for (const a of anos) {
    itens.push({
      id: `al-${a.ano}-ini`,
      titulo: `Início das aulas ${a.ano}`,
      descricao: "",
      inicio: `${a.inicio_aulas}T00:00:00`,
      fim: `${a.inicio_aulas}T23:59:00`,
      origem: "periodo",
      categoria: "aulas",
    });
    itens.push({
      id: `al-${a.ano}-fim`,
      titulo: `Fim das aulas ${a.ano}`,
      descricao: "",
      inicio: `${a.fim_aulas}T00:00:00`,
      fim: `${a.fim_aulas}T23:59:00`,
      origem: "periodo",
      categoria: "aulas",
    });
  }

  for (const p of periodos) {
    itens.push({
      id: `pl-${p.id_periodo}`,
      titulo: p.titulo,
      descricao: p.tipo === "recesso" ? "Recesso institucional" : "Período semestral",
      inicio: `${p.data_inicio}T00:00:00`,
      fim: `${p.data_fim}T23:59:00`,
      origem: "periodo",
      categoria: p.tipo,
    });
  }
  return itens;
}
