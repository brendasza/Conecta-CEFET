import * as NotificacaoRepository from "../repositories/NotificacaoRepository.js";
import { paraIso } from "../utils/texto.js";

export async function notificar(ids, { mensagem, tipo, link }) {
  if (!ids || ids.length === 0) return;
  await NotificacaoRepository.criarParaVarios(ids, { mensagem, tipo, link_acao: link ?? null });
}

function formatar(dataMysql) {
  const [dia, hora] = String(dataMysql).split(" ");
  const [a, m, d] = dia.split("-");
  return `${d}/${m}/${a} às ${hora.slice(0, 5)}`;
}

async function gerarAlertasPrazo(idUsuario) {
  const prazos = await NotificacaoRepository.prazosProximos(idUsuario);

  for (const p of prazos) {
    const alerta = {
      id_usuario: idUsuario,
      tipo: "prazo",
      link_acao: `/projetos/${p.id_atividade}`,
      mensagem: `As inscrições de "${p.titulo}" encerram em ${formatar(p.data_fim_inscricao)}.`,
    };
    if (!(await NotificacaoRepository.existe(alerta))) {
      await NotificacaoRepository.criar(alerta);
    }
  }
}

export async function listar(idUsuario) {
  await gerarAlertasPrazo(idUsuario);
  const linhas = await NotificacaoRepository.listar(idUsuario);

  return linhas.map((n) => ({
    id: String(n.id_notificacao),
    mensagem: n.mensagem,
    tipo: n.tipo,
    link: n.link_acao,
    lida: Boolean(n.lida),
    data: paraIso(n.data_envio),
  }));
}

export async function contarNaoLidas(idUsuario) {
  await gerarAlertasPrazo(idUsuario);
  return NotificacaoRepository.contarNaoLidas(idUsuario);
}

export const marcarLida = NotificacaoRepository.marcarLida;
export const marcarTodasLidas = NotificacaoRepository.marcarTodasLidas;
