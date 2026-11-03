import * as NotificacaoService from "../services/NotificacaoService.js";
import * as AdminService from "../services/AdminService.js";
import { inteiroPositivo } from "../utils/texto.js";

export async function listar(req, res) {
  res.json({ notificacoes: await NotificacaoService.listar(req.usuario.id) });
}

export async function contar(req, res) {
  res.json({ naoLidas: await NotificacaoService.contarNaoLidas(req.usuario.id) });
}

export async function marcarLida(req, res) {
  await NotificacaoService.marcarLida(inteiroPositivo(req.params.id), req.usuario.id);
  res.status(204).end();
}

export async function marcarTodasLidas(req, res) {
  await NotificacaoService.marcarTodasLidas(req.usuario.id);
  res.status(204).end();
}

// Mural de notícias e agenda: qualquer usuário logado lê
export async function noticias(req, res) {
  res.json({ noticias: await AdminService.listarNoticias() });
}

export async function agenda(req, res) {
  res.json({ eventos: await AdminService.agenda(req.usuario.id) });
}
