import pool from "../config/database.js";
import { likeSeguro } from "../utils/texto.js";

/* ---------- Dashboard ---------- */

export async function dashboard() {
  const [usuarios] = await pool.query(
    `SELECT tipo_usuario AS tipo, COUNT(*) AS total,
            SUM(ativo = TRUE) AS ativos
       FROM usuario GROUP BY tipo_usuario`
  );
  const [projetosStatus] = await pool.query(
    "SELECT status, COUNT(*) AS total FROM atividade_academica GROUP BY status"
  );
  const [projetosTipo] = await pool.query(
    `SELECT t.nome AS nome, COUNT(*) AS total
       FROM atividade_academica a JOIN tipo_atividade t ON t.id_tipo = a.id_tipo
      WHERE a.status <> 'cancelado' GROUP BY t.nome ORDER BY total DESC`
  );
  const [projetosArea] = await pool.query(
    `SELECT ar.nome AS nome, COUNT(*) AS total
       FROM atividade_academica a JOIN area_conhecimento ar ON ar.id_area = a.id_area
      WHERE a.status <> 'cancelado' GROUP BY ar.nome ORDER BY total DESC LIMIT 8`
  );
  const [candidaturasStatus] = await pool.query(
    "SELECT status, COUNT(*) AS total FROM candidatura GROUP BY status"
  );
  const [candidaturasMes] = await pool.query(
    `SELECT DATE_FORMAT(data_inscricao, '%Y-%m') AS mes, COUNT(*) AS total
       FROM candidatura
      WHERE data_inscricao >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
      GROUP BY mes ORDER BY mes`
  );
  const [[vagas]] = await pool.query(
    `SELECT COALESCE(SUM(a.vagas_totais), 0) AS totais,
            COALESCE(SUM((SELECT COUNT(*) FROM candidatura c
                           WHERE c.id_atividade = a.id_atividade AND c.status = 'aprovado')), 0) AS ocupadas
       FROM atividade_academica a WHERE a.status = 'ativo' AND a.vagas_totais IS NOT NULL`
  );
  const [[certificados]] = await pool.query(
    "SELECT COUNT(*) AS total, COALESCE(SUM(carga_horaria), 0) AS horas FROM certificado"
  );
  const [maisProcurados] = await pool.query(
    `SELECT a.id_atividade AS id, a.titulo, COUNT(c.id_candidatura) AS total
       FROM atividade_academica a
       LEFT JOIN candidatura c ON c.id_atividade = a.id_atividade
      WHERE a.status <> 'cancelado'
      GROUP BY a.id_atividade, a.titulo
      ORDER BY total DESC, a.titulo LIMIT 5`
  );

  const num = (l) => l.map((x) => ({ ...x, total: Number(x.total) }));

  return {
    usuarios: usuarios.map((u) => ({ tipo: u.tipo, total: Number(u.total), ativos: Number(u.ativos) })),
    projetosPorStatus: num(projetosStatus),
    projetosPorTipo: num(projetosTipo),
    projetosPorArea: num(projetosArea),
    candidaturasPorStatus: num(candidaturasStatus),
    candidaturasPorMes: num(candidaturasMes),
    vagas: { totais: Number(vagas.totais), ocupadas: Number(vagas.ocupadas) },
    certificados: { total: Number(certificados.total), horas: Number(certificados.horas) },
    maisProcurados: num(maisProcurados),
  };
}

/* ---------- Usuários ---------- */

export async function listarUsuarios({ busca, tipo, ativo } = {}) {
  const where = ["1 = 1"];
  const params = [];

  if (busca) {
    where.push("(u.nome LIKE ? OR u.email LIKE ?)");
    const like = likeSeguro(busca);
    params.push(like, like);
  }
  if (tipo) {
    where.push("u.tipo_usuario = ?");
    params.push(tipo);
  }
  if (ativo === "1" || ativo === "0") {
    where.push("u.ativo = ?");
    params.push(ativo === "1");
  }

  const [linhas] = await pool.query(
    `SELECT u.id_usuario AS id, u.nome, u.email, u.tipo_usuario AS tipo, u.ativo, u.created_at,
            al.matricula, p.siape, adm.nivel_acesso
       FROM usuario u
       LEFT JOIN aluno al ON al.id_usuario = u.id_usuario
       LEFT JOIN professor p ON p.id_usuario = u.id_usuario
       LEFT JOIN administrador adm ON adm.id_usuario = u.id_usuario
      WHERE ${where.join(" AND ")}
      ORDER BY u.created_at DESC LIMIT 300`,
    params
  );
  return linhas;
}

export async function definirAtivo(id_usuario, ativo) {
  await pool.query("UPDATE usuario SET ativo = ? WHERE id_usuario = ?", [ativo, id_usuario]);
}

/* ---------- Notícias (mural) ---------- */

export async function listarNoticias(limite = 50) {
  const [linhas] = await pool.query(
    `SELECT n.id_noticia, n.titulo, n.conteudo, n.imagem_destaque, n.fixado,
            n.data_publicacao, u.nome AS autor
       FROM feed_noticias n JOIN usuario u ON u.id_usuario = n.id_usuario
      ORDER BY n.fixado DESC, n.data_publicacao DESC LIMIT ?`,
    [limite]
  );
  return linhas;
}

export async function criarNoticia({ id_usuario, titulo, conteudo, imagem, fixado }) {
  const [r] = await pool.query(
    `INSERT INTO feed_noticias (id_usuario, titulo, conteudo, imagem_destaque, fixado)
     VALUES (?, ?, ?, ?, ?)`,
    [id_usuario, titulo, conteudo, imagem, fixado]
  );
  return r.insertId;
}

export async function atualizarNoticia(id, { titulo, conteudo, imagem, fixado }) {
  const [r] = await pool.query(
    `UPDATE feed_noticias SET titulo = ?, conteudo = ?, imagem_destaque = ?, fixado = ?
      WHERE id_noticia = ?`,
    [titulo, conteudo, imagem, fixado, id]
  );
  return r.affectedRows;
}

export async function excluirNoticia(id) {
  const [r] = await pool.query("DELETE FROM feed_noticias WHERE id_noticia = ?", [id]);
  return r.affectedRows;
}

/* ---------- Calendário acadêmico ---------- */

export async function obterOuCriarCalendario(ano) {
  await pool.query("INSERT IGNORE INTO calendario_academico (ano_letivo) VALUES (?)", [String(ano)]);
  const [[c]] = await pool.query(
    "SELECT id_calendario FROM calendario_academico WHERE ano_letivo = ?",
    [String(ano)]
  );
  return c.id_calendario;
}

export async function criarEvento({ id_calendario, titulo, descricao, inicio, fim }) {
  const [r] = await pool.query(
    `INSERT INTO evento_academico (id_calendario, titulo, descricao, data_inicio, data_fim)
     VALUES (?, ?, ?, ?, ?)`,
    [id_calendario, titulo, descricao, inicio, fim]
  );
  return r.insertId;
}

export async function atualizarEvento(id, { id_calendario, titulo, descricao, inicio, fim }) {
  const [r] = await pool.query(
    `UPDATE evento_academico
        SET id_calendario = ?, titulo = ?, descricao = ?, data_inicio = ?, data_fim = ?
      WHERE id_evento = ?`,
    [id_calendario, titulo, descricao, inicio, fim, id]
  );
  return r.affectedRows;
}

export async function excluirEvento(id) {
  const [r] = await pool.query("DELETE FROM evento_academico WHERE id_evento = ?", [id]);
  return r.affectedRows;
}

export async function listarEventos() {
  const [linhas] = await pool.query(
    `SELECT id_evento, titulo, descricao, data_inicio, data_fim
       FROM evento_academico ORDER BY data_inicio`
  );
  return linhas;
}

// Prazos de inscrição dos projetos (aparecem na agenda de todos)
export async function prazosDeProjetos() {
  const [linhas] = await pool.query(
    `SELECT id_atividade, titulo, data_inicio_inscricao, data_fim_inscricao
       FROM atividade_academica
      WHERE status = 'ativo'
        AND (data_inicio_inscricao IS NOT NULL OR data_fim_inscricao IS NOT NULL)
        AND COALESCE(data_fim_inscricao, data_inicio_inscricao) >= DATE_SUB(NOW(), INTERVAL 60 DAY)`
  );
  return linhas;
}

/* ---------- Cadastros de apoio (áreas, tipos de atividade, habilidades) ---------- */

// Nomes de tabela fixos (nunca vêm do usuário)
const APOIO = {
  areas: {
    tabela: "area_conhecimento", id: "id_area", tamanho: 80,
    uso: `(SELECT COUNT(*) FROM atividade_academica x WHERE x.id_area = t.id_area)
        + (SELECT COUNT(*) FROM aluno_interesse x WHERE x.id_area = t.id_area)
        + (SELECT COUNT(*) FROM professor_interesse x WHERE x.id_area = t.id_area)`,
  },
  tipos: {
    tabela: "tipo_atividade", id: "id_tipo", tamanho: 50,
    uso: "(SELECT COUNT(*) FROM atividade_academica x WHERE x.id_tipo = t.id_tipo)",
  },
  habilidades: {
    tabela: "habilidade", id: "id_habilidade", tamanho: 80,
    uso: `(SELECT COUNT(*) FROM aluno_habilidade x WHERE x.id_habilidade = t.id_habilidade)
        + (SELECT COUNT(*) FROM professor_habilidade x WHERE x.id_habilidade = t.id_habilidade)`,
  },
};

export const apoioConfig = (categoria) => APOIO[categoria] ?? null;

export async function listarApoio(categoria) {
  const c = APOIO[categoria];
  const [linhas] = await pool.query(
    `SELECT t.${c.id} AS id, t.nome, (${c.uso}) AS usos FROM ${c.tabela} t ORDER BY t.nome`
  );
  return linhas.map((l) => ({ id: String(l.id), nome: l.nome, usos: Number(l.usos) }));
}

export async function criarApoio(categoria, nome) {
  const c = APOIO[categoria];
  const [r] = await pool.query(`INSERT INTO ${c.tabela} (nome) VALUES (?)`, [nome]);
  return r.insertId;
}

export async function renomearApoio(categoria, id, nome) {
  const c = APOIO[categoria];
  const [r] = await pool.query(`UPDATE ${c.tabela} SET nome = ? WHERE ${c.id} = ?`, [nome, id]);
  return r.affectedRows > 0;
}

export async function usosDeApoio(categoria, id) {
  const c = APOIO[categoria];
  const [[l]] = await pool.query(`SELECT (${c.uso}) AS usos FROM ${c.tabela} t WHERE t.${c.id} = ?`, [id]);
  return l ? Number(l.usos) : null;
}

export async function excluirApoio(categoria, id) {
  const c = APOIO[categoria];
  const [r] = await pool.query(`DELETE FROM ${c.tabela} WHERE ${c.id} = ?`, [id]);
  return r.affectedRows > 0;
}

/* ---------- Moderação de publicações ---------- */

export async function listarPosts({ busca, limite = 60 } = {}) {
  const params = [];
  let where = "";
  if (busca) {
    where = "WHERE (p.texto LIKE ? OR a.titulo LIKE ? OR u.nome LIKE ?)";
    const like = likeSeguro(busca);
    params.push(like, like, like);
  }
  params.push(Math.min(Number(limite) || 60, 200));
  const [linhas] = await pool.query(
    `SELECT p.id_post, p.id_atividade, p.texto, p.midia, p.eh_vaga, p.data_publicacao,
            a.titulo AS projeto, u.nome AS autor
       FROM atividade_post p
       JOIN atividade_academica a ON a.id_atividade = p.id_atividade
       JOIN usuario u ON u.id_usuario = p.id_usuario
       ${where}
      ORDER BY p.data_publicacao DESC LIMIT ?`,
    params
  );
  return linhas;
}

/* ---------- Nível de acesso ---------- */

export async function nivelDoAdministrador(id_usuario) {
  const [[l]] = await pool.query("SELECT nivel_acesso FROM administrador WHERE id_usuario = ?", [id_usuario]);
  return l ? Number(l.nivel_acesso) : 0;
}

/* ---------- Tipo e nível de acesso do usuário ---------- */

export async function definirNivel(id_usuario, nivel) {
  const [r] = await pool.query("UPDATE administrador SET nivel_acesso = ? WHERE id_usuario = ?", [nivel, id_usuario]);
  return r.affectedRows > 0;
}
