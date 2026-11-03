import pool from "../config/database.js";

export async function criar({ id_usuario, id_atividade, carta, status = "pendente", justificativa = null }, executor = pool) {
  const [r] = await executor.query(
    `INSERT INTO candidatura (id_usuario, id_atividade, carta_apresentacao, status, justificativa_professor)
     VALUES (?, ?, ?, ?, ?)`,
    [id_usuario, id_atividade, carta || null, status, justificativa]
  );
  return r.insertId;
}

export async function buscarPorId(id, executor = pool, travar = false) {
  const [[c]] = await executor.query(
    `SELECT * FROM candidatura WHERE id_candidatura = ? ${travar ? "FOR UPDATE" : ""}`,
    [id]
  );
  return c || null;
}

export async function buscarDoAlunoNoProjeto(id_usuario, id_atividade, executor = pool) {
  const [[c]] = await executor.query(
    "SELECT * FROM candidatura WHERE id_usuario = ? AND id_atividade = ?",
    [id_usuario, id_atividade]
  );
  return c || null;
}

export async function atualizarDecisao(id, status, justificativa, executor = pool) {
  await executor.query(
    "UPDATE candidatura SET status = ?, justificativa_professor = ? WHERE id_candidatura = ?",
    [status, justificativa || null, id]
  );
}

export async function excluir(id) {
  await pool.query("DELETE FROM candidatura WHERE id_candidatura = ?", [id]);
}

export async function listarDoAluno(id_usuario) {
  const [linhas] = await pool.query(
    `SELECT c.id_candidatura, c.id_atividade, c.status, c.data_inscricao,
            c.carta_apresentacao, c.justificativa_professor,
            a.titulo, a.status AS status_projeto, t.nome AS tipo, ar.nome AS area,
            cert.id_certificado, cert.carga_horaria, cert.data_emissao
       FROM candidatura c
       JOIN atividade_academica a ON a.id_atividade = c.id_atividade
       JOIN tipo_atividade t ON t.id_tipo = a.id_tipo
       JOIN area_conhecimento ar ON ar.id_area = a.id_area
       LEFT JOIN certificado cert ON cert.id_candidatura = c.id_candidatura
      WHERE c.id_usuario = ? AND a.status <> 'cancelado'
      ORDER BY c.data_inscricao DESC`,
    [id_usuario]
  );
  return linhas;
}

export async function listarDoProjeto(id_atividade) {
  const [linhas] = await pool.query(
    `SELECT c.id_candidatura, c.id_usuario, c.status, c.data_inscricao,
            c.carta_apresentacao, c.justificativa_professor,
            u.nome, u.email, u.bio, al.matricula, al.curso, al.periodo,
            cert.id_certificado, cert.carga_horaria
       FROM candidatura c
       JOIN usuario u ON u.id_usuario = c.id_usuario
       JOIN aluno al ON al.id_usuario = c.id_usuario
       LEFT JOIN certificado cert ON cert.id_candidatura = c.id_candidatura
      WHERE c.id_atividade = ?
      ORDER BY FIELD(c.status, 'pendente', 'aprovado', 'reprovado'), c.data_inscricao`,
    [id_atividade]
  );

  if (linhas.length === 0) return [];
  const ids = linhas.map((l) => l.id_usuario);

  const [interesses] = await pool.query(
    `SELECT i.id_usuario, a.nome FROM aluno_interesse i
       JOIN area_conhecimento a ON a.id_area = i.id_area WHERE i.id_usuario IN (?)`,
    [ids]
  );
  const [habilidades] = await pool.query(
    `SELECT x.id_usuario, h.nome FROM aluno_habilidade x
       JOIN habilidade h ON h.id_habilidade = x.id_habilidade WHERE x.id_usuario IN (?)`,
    [ids]
  );

  return linhas.map((l) => ({
    ...l,
    interesses: interesses.filter((i) => i.id_usuario === l.id_usuario).map((i) => i.nome),
    habilidades: habilidades.filter((h) => h.id_usuario === l.id_usuario).map((h) => h.nome),
  }));
}

export async function historicoDoAluno(id_usuario) {
  const [[l]] = await pool.query(
    "SELECT * FROM vw_historico_participacao WHERE id_usuario = ?",
    [id_usuario]
  );
  return l || { total_atividades: 0, total_horas: 0, ultima_participacao: null };
}

/* ---------- Certificados ---------- */

export async function buscarCertificado(id_certificado) {
  const [[c]] = await pool.query(
    `SELECT cert.*, c.id_usuario, c.id_atividade, c.status AS status_candidatura,
            u.nome AS aluno_nome, al.matricula, a.titulo, a.id_professor,
            t.nome AS tipo
       FROM certificado cert
       JOIN candidatura c ON c.id_candidatura = cert.id_candidatura
       JOIN usuario u ON u.id_usuario = c.id_usuario
       JOIN aluno al ON al.id_usuario = c.id_usuario
       JOIN atividade_academica a ON a.id_atividade = c.id_atividade
       JOIN tipo_atividade t ON t.id_tipo = a.id_tipo
      WHERE cert.id_certificado = ?`,
    [id_certificado]
  );
  return c || null;
}

export async function certificadoDaCandidatura(id_candidatura) {
  const [[c]] = await pool.query(
    "SELECT * FROM certificado WHERE id_candidatura = ?",
    [id_candidatura]
  );
  return c || null;
}

export async function criarCertificado({ id_candidatura, carga_horaria, arquivo_pdf }, executor = pool) {
  const [r] = await executor.query(
    "INSERT INTO certificado (id_candidatura, carga_horaria, arquivo_pdf) VALUES (?, ?, ?)",
    [id_candidatura, carga_horaria, arquivo_pdf]
  );
  return r.insertId;
}
