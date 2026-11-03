import pool from "../config/database.js";

export async function registrar(idUsuario, acao, entidade = null, idEntidade = null, detalhe = null) {
  try {
    await pool.query(
      `INSERT INTO log_atividade (id_usuario, acao, entidade, id_entidade, detalhe)
       VALUES (?, ?, ?, ?, ?)`,
      [idUsuario ?? null, acao, entidade, idEntidade == null ? null : String(idEntidade), detalhe ? String(detalhe).slice(0, 255) : null]
    );
  } catch (erro) {
    console.error("Falha ao registrar log:", erro.message);
  }
}

export async function listar({ limite = 100, acao } = {}) {
  const params = [];
  let where = "";
  if (acao) {
    where = "WHERE l.acao = ?";
    params.push(acao);
  }
  params.push(Math.min(Number(limite) || 100, 300));
  const [linhas] = await pool.query(
    `SELECT l.id_log, l.acao, l.entidade, l.id_entidade, l.detalhe, l.data_registro,
            u.nome AS usuario
       FROM log_atividade l LEFT JOIN usuario u ON u.id_usuario = l.id_usuario
       ${where} ORDER BY l.id_log DESC LIMIT ?`,
    params
  );
  return linhas.map((l) => ({
    id: String(l.id_log),
    acao: l.acao,
    entidade: l.entidade,
    idEntidade: l.id_entidade,
    detalhe: l.detalhe ?? "",
    data: String(l.data_registro).replace(" ", "T"),
    usuario: l.usuario ?? "—",
  }));
}
