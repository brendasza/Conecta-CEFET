import pool from "../config/database.js";

// Nomes de tabela fixos (nunca vêm do usuário), por isso podem entrar na query.
const TABELAS = {
  aluno: {
    perfil: "aluno",
    interesse: "aluno_interesse",
    habilidade: "aluno_habilidade",
  },
  professor: {
    perfil: "professor",
    interesse: "professor_interesse",
    habilidade: "professor_habilidade",
  },
};

export async function buscar(usuario, executor = pool) {
  if (usuario.tipo_usuario === "administrador") {
    const [[admin]] = await executor.query(
      "SELECT * FROM administrador WHERE id_usuario = ?",
      [usuario.id_usuario]
    );
    return { ...admin, interesses: [], habilidades: [] };
  }

  const t = TABELAS[usuario.tipo_usuario];
  if (!t) return {};

  const [[dados]] = await executor.query(
    `SELECT * FROM ${t.perfil} WHERE id_usuario = ?`,
    [usuario.id_usuario]
  );

  const [interesses] = await executor.query(
    `SELECT a.nome FROM ${t.interesse} i
     JOIN area_conhecimento a ON a.id_area = i.id_area
     WHERE i.id_usuario = ? ORDER BY a.nome`,
    [usuario.id_usuario]
  );

  const [habilidades] = await executor.query(
    `SELECT h.nome FROM ${t.habilidade} x
     JOIN habilidade h ON h.id_habilidade = x.id_habilidade
     WHERE x.id_usuario = ? ORDER BY h.nome`,
    [usuario.id_usuario]
  );

  return {
    ...dados,
    interesses: interesses.map((l) => l.nome),
    habilidades: habilidades.map((l) => l.nome),
  };
}

export async function atualizarUsuario({ id_usuario, nome, bio }, executor = pool) {
  await executor.query(
    "UPDATE usuario SET nome = ?, bio = ? WHERE id_usuario = ?",
    [nome, bio, id_usuario]
  );
}

export async function atualizarAluno({ id_usuario, curso, periodo }, executor = pool) {
  await executor.query(
    "UPDATE aluno SET curso = ?, periodo = ? WHERE id_usuario = ?",
    [curso, periodo, id_usuario]
  );
}

export async function atualizarProfessor(
  { id_usuario, departamento, titulacao, area_atuacao },
  executor = pool
) {
  await executor.query(
    `UPDATE professor SET departamento = ?, titulacao = ?, area_atuacao = ?
     WHERE id_usuario = ?`,
    [departamento, titulacao, area_atuacao, id_usuario]
  );
}

// Troca a lista inteira de interesses (ou habilidades) do usuário.
export async function substituirLista(tipo_usuario, id_usuario, lista, nomes, executor = pool) {
  const t = TABELAS[tipo_usuario];
  const cfg =
    lista === "interesses"
      ? { ligacao: t.interesse, tabela: "area_conhecimento", id: "id_area" }
      : { ligacao: t.habilidade, tabela: "habilidade", id: "id_habilidade" };

  await executor.query(`DELETE FROM ${cfg.ligacao} WHERE id_usuario = ?`, [id_usuario]);

  for (const nome of nomes) {
    await executor.query(`INSERT IGNORE INTO ${cfg.tabela} (nome) VALUES (?)`, [nome]);
    const [[linha]] = await executor.query(
      `SELECT ${cfg.id} AS id FROM ${cfg.tabela} WHERE nome = ?`,
      [nome]
    );
    await executor.query(
      `INSERT IGNORE INTO ${cfg.ligacao} (id_usuario, ${cfg.id}) VALUES (?, ?)`,
      [id_usuario, linha.id]
    );
  }
}