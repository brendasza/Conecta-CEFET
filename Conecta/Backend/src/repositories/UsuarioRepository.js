import pool from "../config/database.js";
import { Usuario } from "../models/Usuario.js";

export async function buscarPorEmail(email) {
  const [linhas] = await pool.query(
    "SELECT * FROM usuario WHERE email = ?",
    [email]
  );

  if (linhas.length === 0) return null;
  return new Usuario(linhas[0]);
}


export async function criar(
  { nome, email, senha_hash, tipo_usuario },
  executor = pool
) {
  const [resultado] = await executor.query(
    `INSERT INTO usuario (nome, email, senha_hash, tipo_usuario)
     VALUES (?, ?, ?, ?)`,
    [nome, email, senha_hash, tipo_usuario]
  );

  return resultado.insertId;
}

export async function criarAluno(
  { id_usuario, matricula, curso, periodo },
  executor = pool
) {
  await executor.query(
    `INSERT INTO aluno (id_usuario, matricula, curso, periodo)
     VALUES (?, ?, ?, ?)`,
    [id_usuario, matricula, curso, periodo]
  );
}

export async function criarProfessor(
  { id_usuario, siape, departamento, titulacao, area_atuacao },
  executor = pool
) {
  await executor.query(
    `INSERT INTO professor (id_usuario, siape, departamento, titulacao, area_atuacao)
     VALUES (?, ?, ?, ?, ?)`,
    [id_usuario, siape, departamento, titulacao, area_atuacao]
  );
}
export async function buscarPorId(id) {
  const [linhas] = await pool.query(
    "SELECT * FROM usuario WHERE id_usuario = ?",
    [id]
  );

  if (linhas.length === 0) return null;
  return new Usuario(linhas[0]);
}

// Busca de aluno por nome (completo ou parte) ou matrícula, para adicionar a um projeto
export async function buscarAlunos(termo, limite = 10) {
  const like = `%${String(termo).replace(/[\\%_]/g, "\\$&")}%`;
  const [linhas] = await pool.query(
    `SELECT u.id_usuario AS id, u.nome, u.email, al.matricula, al.curso
       FROM usuario u JOIN aluno al ON al.id_usuario = u.id_usuario
      WHERE u.ativo = TRUE AND (u.nome LIKE ? OR al.matricula = ?)
      ORDER BY u.nome LIMIT ?`,
    [like, termo, limite]
  );
  return linhas;
}

export async function listarProfessores() {
  const [linhas] = await pool.query(
    `SELECT u.id_usuario AS id, u.nome, u.email
       FROM usuario u JOIN professor p ON p.id_usuario = u.id_usuario
      WHERE u.ativo = TRUE ORDER BY u.nome`
  );
  return linhas;
}

export async function listarIdsAdministradores() {
  const [linhas] = await pool.query(
    "SELECT id_usuario FROM usuario WHERE tipo_usuario = 'administrador' AND ativo = TRUE"
  );
  return linhas.map((l) => l.id_usuario);
}
