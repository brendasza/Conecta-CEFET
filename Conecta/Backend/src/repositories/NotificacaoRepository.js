import pool from "../config/database.js";

export async function criar({ id_usuario, mensagem, tipo, link_acao = null }, executor = pool) {
  await executor.query(
    "INSERT INTO notificacao (id_usuario, mensagem, tipo, link_acao) VALUES (?, ?, ?, ?)",
    [id_usuario, String(mensagem).slice(0, 255), tipo, link_acao]
  );
}

export async function criarParaVarios(ids, { mensagem, tipo, link_acao = null }, executor = pool) {
  for (const id_usuario of new Set(ids)) {
    await criar({ id_usuario, mensagem, tipo, link_acao }, executor);
  }
}

export async function listar(id_usuario, limite = 100) {
  const [linhas] = await pool.query(
    `SELECT id_notificacao, mensagem, tipo, link_acao, lida, data_envio
       FROM notificacao WHERE id_usuario = ?
      ORDER BY data_envio DESC, id_notificacao DESC LIMIT ?`,
    [id_usuario, limite]
  );
  return linhas;
}

export async function contarNaoLidas(id_usuario) {
  const [[l]] = await pool.query(
    "SELECT COUNT(*) AS total FROM notificacao WHERE id_usuario = ? AND lida = FALSE",
    [id_usuario]
  );
  return Number(l.total);
}

export async function marcarLida(id_notificacao, id_usuario) {
  await pool.query(
    "UPDATE notificacao SET lida = TRUE WHERE id_notificacao = ? AND id_usuario = ?",
    [id_notificacao, id_usuario]
  );
}

export async function marcarTodasLidas(id_usuario) {
  await pool.query("UPDATE notificacao SET lida = TRUE WHERE id_usuario = ?", [id_usuario]);
}

export async function existe({ id_usuario, tipo, link_acao, mensagem }) {
  const [l] = await pool.query(
    `SELECT 1 FROM notificacao
      WHERE id_usuario = ? AND tipo = ? AND link_acao = ? AND mensagem = ? LIMIT 1`,
    [id_usuario, tipo, link_acao, mensagem]
  );
  return l.length > 0;
}

// Projetos ativos que o usuário segue e cujas inscrições encerram nos próximos 3 dias
export async function prazosProximos(id_usuario) {
  const [linhas] = await pool.query(
    `SELECT a.id_atividade, a.titulo, a.data_fim_inscricao
       FROM atividade_academica a
       JOIN atividade_seguidor s ON s.id_atividade = a.id_atividade
      WHERE s.id_usuario = ? AND a.status = 'ativo'
        AND a.data_fim_inscricao BETWEEN NOW() AND DATE_ADD(NOW(), INTERVAL 3 DAY)`,
    [id_usuario]
  );
  return linhas;
}
