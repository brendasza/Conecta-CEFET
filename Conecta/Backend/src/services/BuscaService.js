import pool from "../config/database.js";
import { likeSeguro } from "../utils/texto.js";

export async function buscar(termo, limite = 6) {
  const q = String(termo ?? "").trim();
  if (q.length < 2) return { atividades: [], professores: [], usuarios: [] };

  const like = likeSeguro(q);
  const max = Math.min(Number(limite) || 6, 12);

  const [atividades] = await pool.query(
    `SELECT a.id_atividade AS id, a.titulo AS nome, a.status, ar.nome AS area, t.nome AS tipo
       FROM atividade_academica a
       JOIN area_conhecimento ar ON ar.id_area = a.id_area
       JOIN tipo_atividade t ON t.id_tipo = a.id_tipo
      WHERE a.status <> 'cancelado' AND (a.titulo LIKE ? OR ar.nome LIKE ? OR t.nome LIKE ?)
      ORDER BY a.titulo LIMIT ?`,
    [like, like, like, max]
  );

  const [professores] = await pool.query(
    `SELECT u.id_usuario AS id, u.nome, u.email, p.departamento
       FROM usuario u JOIN professor p ON p.id_usuario = u.id_usuario
      WHERE u.ativo = TRUE AND u.tipo_usuario = 'professor' AND (u.nome LIKE ? OR p.departamento LIKE ?)
      ORDER BY u.nome LIMIT ?`,
    [like, like, max]
  );

  const [usuarios] = await pool.query(
    `SELECT u.id_usuario AS id, u.nome, u.tipo_usuario AS tipo, al.curso
       FROM usuario u LEFT JOIN aluno al ON al.id_usuario = u.id_usuario
      WHERE u.ativo = TRUE AND u.tipo_usuario <> 'professor' AND u.nome LIKE ?
      ORDER BY u.nome LIMIT ?`,
    [like, max]
  );

  return {
    atividades: atividades.map((a) => ({ ...a, id: String(a.id) })),
    professores: professores.map((p) => ({ ...p, id: String(p.id) })),
    usuarios: usuarios.map((u) => ({ ...u, id: String(u.id), curso: u.curso ?? "" })),
  };
}
