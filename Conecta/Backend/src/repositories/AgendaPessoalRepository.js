import pool from "../config/database.js";

export async function listar(idUsuario) {
  const [linhas] = await pool.query(
    `SELECT id_item, titulo, descricao, data_inicio, data_fim
       FROM agenda_pessoal WHERE id_usuario = ? ORDER BY data_inicio`,
    [idUsuario]
  );
  return linhas;
}

export async function criar({ id_usuario, titulo, descricao, inicio, fim }) {
  const [r] = await pool.query(
    `INSERT INTO agenda_pessoal (id_usuario, titulo, descricao, data_inicio, data_fim)
     VALUES (?, ?, ?, ?, ?)`,
    [id_usuario, titulo, descricao, inicio, fim]
  );
  return r.insertId;
}

// sempre filtra pelo dono: ninguém altera o item de outra pessoa
export async function atualizar(id, id_usuario, { titulo, descricao, inicio, fim }) {
  const [r] = await pool.query(
    `UPDATE agenda_pessoal SET titulo = ?, descricao = ?, data_inicio = ?, data_fim = ?
      WHERE id_item = ? AND id_usuario = ?`,
    [titulo, descricao, inicio, fim, id, id_usuario]
  );
  return r.affectedRows > 0;
}

export async function excluir(id, id_usuario) {
  const [r] = await pool.query("DELETE FROM agenda_pessoal WHERE id_item = ? AND id_usuario = ?", [id, id_usuario]);
  return r.affectedRows > 0;
}

/* ---------- autoria de eventos institucionais criados por professores ---------- */

export async function registrarAutoria(id_evento, id_usuario) {
  await pool.query("INSERT INTO evento_autor (id_evento, id_usuario) VALUES (?, ?)", [id_evento, id_usuario]);
}

export async function ehAutor(id_evento, id_usuario) {
  const [l] = await pool.query(
    "SELECT 1 FROM evento_autor WHERE id_evento = ? AND id_usuario = ?",
    [id_evento, id_usuario]
  );
  return l.length > 0;
}

export async function removerAutoria(id_evento) {
  await pool.query("DELETE FROM evento_autor WHERE id_evento = ?", [id_evento]);
}

export async function idsEventosDoAutor(id_usuario) {
  const [l] = await pool.query("SELECT id_evento FROM evento_autor WHERE id_usuario = ?", [id_usuario]);
  return l.map((x) => String(x.id_evento));
}
