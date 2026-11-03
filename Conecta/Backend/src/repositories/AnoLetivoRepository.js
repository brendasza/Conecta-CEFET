import pool from "../config/database.js";

export async function listarAnos() {
  const [anos] = await pool.query(
    "SELECT ano, inicio_aulas, fim_aulas FROM ano_letivo ORDER BY ano DESC"
  );
  const [periodos] = await pool.query(
    "SELECT id_periodo, ano, tipo, titulo, data_inicio, data_fim FROM periodo_letivo ORDER BY data_inicio"
  );
  return { anos, periodos };
}

export async function salvarAno({ ano, inicio, fim }) {
  await pool.query(
    `INSERT INTO ano_letivo (ano, inicio_aulas, fim_aulas) VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE inicio_aulas = VALUES(inicio_aulas), fim_aulas = VALUES(fim_aulas)`,
    [ano, inicio, fim]
  );
}

export async function excluirAno(ano) {
  const [r] = await pool.query("DELETE FROM ano_letivo WHERE ano = ?", [ano]);
  return r.affectedRows > 0;
}

export async function anoExiste(ano) {
  const [[l]] = await pool.query("SELECT ano FROM ano_letivo WHERE ano = ?", [ano]);
  return Boolean(l);
}

export async function criarPeriodo({ ano, tipo, titulo, inicio, fim }) {
  const [r] = await pool.query(
    "INSERT INTO periodo_letivo (ano, tipo, titulo, data_inicio, data_fim) VALUES (?, ?, ?, ?, ?)",
    [ano, tipo, titulo, inicio, fim]
  );
  return r.insertId;
}

export async function atualizarPeriodo(id, { tipo, titulo, inicio, fim }) {
  const [r] = await pool.query(
    "UPDATE periodo_letivo SET tipo = ?, titulo = ?, data_inicio = ?, data_fim = ? WHERE id_periodo = ?",
    [tipo, titulo, inicio, fim, id]
  );
  return r.affectedRows > 0;
}

export async function excluirPeriodo(id) {
  const [r] = await pool.query("DELETE FROM periodo_letivo WHERE id_periodo = ?", [id]);
  return r.affectedRows > 0;
}
