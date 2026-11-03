import pool from "../config/database.js";
import { likeSeguro } from "../utils/texto.js";

export async function buscarIdTipoPorNome(nome, executor = pool) {
  const [linhas] = await executor.query(
    "SELECT id_tipo FROM tipo_atividade WHERE nome = ?",
    [nome]
  );
  return linhas.length ? linhas[0].id_tipo : null;
}

export async function listarTipos() {
  const [linhas] = await pool.query("SELECT nome FROM tipo_atividade ORDER BY nome");
  return linhas.map((l) => l.nome);
}

export async function listarAreas() {
  const [linhas] = await pool.query("SELECT nome FROM area_conhecimento ORDER BY nome");
  return linhas.map((l) => l.nome);
}

export async function obterOuCriarArea(nome, executor = pool) {
  await executor.query("INSERT IGNORE INTO area_conhecimento (nome) VALUES (?)", [nome]);
  const [[linha]] = await executor.query(
    "SELECT id_area FROM area_conhecimento WHERE nome = ?",
    [nome]
  );
  return linha.id_area;
}

export async function criar(d, executor = pool) {
  const [resultado] = await executor.query(
    `INSERT INTO atividade_academica
       (id_professor, id_area, id_tipo, titulo, objetivo, descricao, requisitos,
        criterios_selecao, vagas_totais, data_inicio_inscricao, data_fim_inscricao)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      d.id_professor, d.id_area, d.id_tipo, d.titulo, d.objetivo, d.descricao,
      d.requisitos, d.criterios_selecao, d.vagas_totais, d.inicio, d.fim,
    ]
  );
  return resultado.insertId;
}

export async function atualizar(id, d, executor = pool) {
  await executor.query(
    `UPDATE atividade_academica
        SET id_area = ?, id_tipo = ?, titulo = ?, objetivo = ?, descricao = ?
      WHERE id_atividade = ?`,
    [d.id_area, d.id_tipo, d.titulo, d.objetivo, d.descricao, id]
  );
}

// Inscrição (opcional): vagas, período, requisitos e critérios
export async function atualizarInscricao(id, d, executor = pool) {
  await executor.query(
    `UPDATE atividade_academica
        SET requisitos = ?, criterios_selecao = ?, vagas_totais = ?,
            data_inicio_inscricao = ?, data_fim_inscricao = ?
      WHERE id_atividade = ?`,
    [d.requisitos, d.criterios_selecao, d.vagas_totais, d.inicio, d.fim, id]
  );
}

export async function atualizarStatus(id, status, executor = pool) {
  await executor.query("UPDATE atividade_academica SET status = ? WHERE id_atividade = ?", [
    status,
    id,
  ]);
}

export async function adicionarTags(id_atividade, tags, executor = pool) {
  for (const tag of tags) {
    await executor.query(
      "INSERT IGNORE INTO atividade_tag (id_atividade, tag) VALUES (?, ?)",
      [id_atividade, tag]
    );
  }
}

export async function substituirTags(id_atividade, tags, executor = pool) {
  await executor.query("DELETE FROM atividade_tag WHERE id_atividade = ?", [id_atividade]);
  await adicionarTags(id_atividade, tags, executor);
}

export async function adicionarCoordenador(id_atividade, id_usuario, executor = pool) {
  await executor.query(
    "INSERT IGNORE INTO atividade_coordenador (id_atividade, id_usuario) VALUES (?, ?)",
    [id_atividade, id_usuario]
  );
}

export async function registrarTimeline(id_atividade, titulo, descricao, executor = pool) {
  await executor.query(
    "INSERT INTO atividade_timeline (id_atividade, titulo, descricao) VALUES (?, ?, ?)",
    [id_atividade, titulo, descricao]
  );
}

/* ---------- Linha do tempo editável (ano + o que aconteceu) ---------- */

export async function criarHistorico(id_atividade, { ano, titulo, descricao }, executor = pool) {
  const [r] = await executor.query(
    "INSERT INTO atividade_historico (id_atividade, ano, titulo, descricao) VALUES (?, ?, ?, ?)",
    [id_atividade, ano, titulo, descricao]
  );
  return r.insertId;
}

export async function atualizarHistorico(id_atividade, id_historico, { ano, titulo, descricao }) {
  const [r] = await pool.query(
    `UPDATE atividade_historico SET ano = ?, titulo = ?, descricao = ?
      WHERE id_historico = ? AND id_atividade = ?`,
    [ano, titulo, descricao, id_historico, id_atividade]
  );
  return r.affectedRows > 0;
}

export async function excluirHistorico(id_atividade, id_historico) {
  const [r] = await pool.query(
    "DELETE FROM atividade_historico WHERE id_historico = ? AND id_atividade = ?",
    [id_historico, id_atividade]
  );
  return r.affectedRows > 0;
}

export async function ehCoordenador(id_atividade, id_usuario, executor = pool) {
  const [linhas] = await executor.query(
    "SELECT 1 FROM atividade_coordenador WHERE id_atividade = ? AND id_usuario = ?",
    [id_atividade, id_usuario]
  );
  return linhas.length > 0;
}

export async function idsCoordenadores(id_atividade, executor = pool) {
  const [linhas] = await executor.query(
    "SELECT id_usuario FROM atividade_coordenador WHERE id_atividade = ?",
    [id_atividade]
  );
  return linhas.map((l) => l.id_usuario);
}

// Linha crua da atividade (com trava opcional para controlar vagas sem corrida)
export async function buscarBruto(id_atividade, executor = pool, travar = false) {
  const [linhas] = await executor.query(
    `SELECT *,
            ((data_inicio_inscricao IS NULL OR data_inicio_inscricao <= NOW())
              AND (data_fim_inscricao IS NULL OR data_fim_inscricao >= NOW())) AS prazo_aberto,
            (data_inicio_inscricao IS NOT NULL AND data_inicio_inscricao > NOW()) AS nao_iniciado
       FROM atividade_academica WHERE id_atividade = ? ${travar ? "FOR UPDATE" : ""}`,
    [id_atividade]
  );
  return linhas[0] || null;
}

export async function contarAprovados(id_atividade, executor = pool) {
  const [[l]] = await executor.query(
    "SELECT COUNT(*) AS total FROM candidatura WHERE id_atividade = ? AND status = 'aprovado'",
    [id_atividade]
  );
  return Number(l.total);
}

/* ---------- Consulta completa (cartões, feed, detalhe) ---------- */

const COLUNAS = `
  a.id_atividade, a.id_professor, a.titulo, a.objetivo, a.descricao, a.requisitos,
  a.criterios_selecao, a.vagas_totais, a.data_inicio_inscricao, a.data_fim_inscricao,
  a.status, a.created_at, ar.nome AS area, t.nome AS tipo,
  (SELECT COUNT(*) FROM candidatura c
     WHERE c.id_atividade = a.id_atividade AND c.status = 'aprovado') AS vagas_ocupadas,
  (SELECT COUNT(*) FROM candidatura c
     WHERE c.id_atividade = a.id_atividade AND c.status = 'pendente') AS pendentes,
  (SELECT COUNT(*) FROM atividade_seguidor s
     WHERE s.id_atividade = a.id_atividade) AS seguidores,
  ((a.data_inicio_inscricao IS NULL OR a.data_inicio_inscricao <= NOW())
    AND (a.data_fim_inscricao IS NULL OR a.data_fim_inscricao >= NOW())) AS prazo_aberto`;

const ORIGEM = `
  FROM atividade_academica a
  JOIN area_conhecimento ar ON ar.id_area = a.id_area
  JOIN tipo_atividade t ON t.id_tipo = a.id_tipo`;

function agrupar(linhas) {
  const mapa = new Map();
  for (const l of linhas) {
    if (!mapa.has(l.id_atividade)) mapa.set(l.id_atividade, []);
    mapa.get(l.id_atividade).push(l);
  }
  return mapa;
}

export function lerMidia(valor) {
  if (!valor) return [];
  try {
    return typeof valor === "string" ? JSON.parse(valor) : valor;
  } catch {
    return [];
  }
}

export async function postsDosProjetos(ids, limite = 300) {
  if (ids.length === 0) return [];
  const [linhas] = await pool.query(
    `SELECT p.id_post, p.id_atividade, p.texto, p.midia, p.eh_vaga, p.vagas,
            p.data_publicacao, u.nome AS autor_nome
       FROM atividade_post p
       JOIN usuario u ON u.id_usuario = p.id_usuario
      WHERE p.id_atividade IN (?)
      ORDER BY p.data_publicacao DESC, p.id_post DESC
      LIMIT ?`,
    [ids, limite]
  );
  return linhas.map((l) => ({ ...l, midia: lerMidia(l.midia) }));
}

// Junta tags, coordenadores, integrantes e linha do tempo (1 query para cada, para todos os projetos)
async function completar(projetos, { comPosts = false, comTimeline = true } = {}) {
  if (projetos.length === 0) return [];
  const ids = projetos.map((p) => p.id_atividade);

  const [tags] = await pool.query(
    "SELECT id_atividade, tag FROM atividade_tag WHERE id_atividade IN (?) ORDER BY tag",
    [ids]
  );
  const [coordenadores] = await pool.query(
    `SELECT ac.id_atividade, u.id_usuario, u.nome, u.email
       FROM atividade_coordenador ac
       JOIN usuario u ON u.id_usuario = ac.id_usuario
      WHERE ac.id_atividade IN (?) ORDER BY ac.data_entrada`,
    [ids]
  );
  const [integrantes] = await pool.query(
    `SELECT c.id_atividade, u.id_usuario, u.nome, u.email, al.matricula, al.curso
       FROM candidatura c
       JOIN usuario u ON u.id_usuario = c.id_usuario
       JOIN aluno al ON al.id_usuario = c.id_usuario
      WHERE c.id_atividade IN (?) AND c.status = 'aprovado' ORDER BY u.nome`,
    [ids]
  );

  let timeline = [];
  if (comTimeline) {
    [timeline] = await pool.query(
      `SELECT id_historico, id_atividade, ano, titulo, descricao
         FROM atividade_historico
        WHERE id_atividade IN (?) ORDER BY ano DESC, id_historico DESC`,
      [ids]
    );
  }

  const posts = comPosts ? await postsDosProjetos(ids) : [];

  const porTag = agrupar(tags);
  const porCoord = agrupar(coordenadores);
  const porInteg = agrupar(integrantes);
  const porTimeline = agrupar(timeline);
  const porPost = agrupar(posts);

  return projetos.map((p) => ({
    ...p,
    tags: (porTag.get(p.id_atividade) || []).map((l) => l.tag),
    coordenadores: (porCoord.get(p.id_atividade) || []).map((l) => ({
      id: l.id_usuario, nome: l.nome, email: l.email,
    })),
    integrantes: (porInteg.get(p.id_atividade) || []).map((l) => ({
      id: l.id_usuario, nome: l.nome, email: l.email, matricula: l.matricula, curso: l.curso,
    })),
    timeline: porTimeline.get(p.id_atividade) || [],
    posts: porPost.get(p.id_atividade) || [],
  }));
}

// status: "ativo" (padrão), "encerrado" ou "todos" (cancelados nunca aparecem)
export async function listar({ busca, area, tipo, status = "ativo", incluirDesativadas = false } = {}) {
  const where = incluirDesativadas ? ["1 = 1"] : ["a.status <> 'cancelado'"];
  const params = [];

  if (status && status !== "todos") {
    where.push("a.status = ?");
    params.push(status);
  }
  if (area) {
    where.push("ar.nome = ?");
    params.push(area);
  }
  if (tipo) {
    where.push("t.nome = ?");
    params.push(tipo);
  }
  if (busca) {
    const like = likeSeguro(busca);
    // FULLTEXT (ft_atividade_busca: título + descrição) para termos de 3+ letras; LIKE cobre o resto
    // (objetivo, tags, área, tipo, coordenador e termos curtos).
    const termos = String(busca).normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .split(/[^\p{L}\p{N}]+/u).filter((t) => t.length >= 3).slice(0, 8);
    const booleano = termos.map((t) => `+${t}*`).join(" ");
    const ft = booleano ? "MATCH(a.titulo, a.descricao) AGAINST (? IN BOOLEAN MODE) OR " : "";
    if (booleano) params.push(booleano);
    where.push(`(
      ${ft}a.titulo LIKE ? OR a.objetivo LIKE ? OR a.descricao LIKE ?
      OR ar.nome LIKE ? OR t.nome LIKE ?
      OR EXISTS (SELECT 1 FROM atividade_tag tg
                  WHERE tg.id_atividade = a.id_atividade AND tg.tag LIKE ?)
      OR EXISTS (SELECT 1 FROM atividade_coordenador ac
                   JOIN usuario u ON u.id_usuario = ac.id_usuario
                  WHERE ac.id_atividade = a.id_atividade AND u.nome LIKE ?)
    )`);
    params.push(like, like, like, like, like, like, like);
  }

  const [linhas] = await pool.query(
    `SELECT ${COLUNAS} ${ORIGEM}
      WHERE ${where.join(" AND ")}
      ORDER BY a.created_at DESC, a.id_atividade DESC`,
    params
  );
  return completar(linhas, { comTimeline: false });
}

export async function buscarPorId(id_atividade, incluirDesativadas = false) {
  const [linhas] = await pool.query(
    `SELECT ${COLUNAS} ${ORIGEM}
      WHERE a.id_atividade = ? ${incluirDesativadas ? "" : "AND a.status <> 'cancelado'"}`,
    [id_atividade]
  );
  const [projeto] = await completar(linhas, { comPosts: true });
  return projeto || null;
}

// Projetos que o usuário coordena ou em que participa (inclui encerrados)
export async function listarDoUsuario(id_usuario) {
  const [linhas] = await pool.query(
    `SELECT ${COLUNAS} ${ORIGEM}
      WHERE a.status <> 'cancelado'
        AND (
          a.id_atividade IN (SELECT id_atividade FROM atividade_coordenador WHERE id_usuario = ?)
          OR a.id_atividade IN (SELECT id_atividade FROM candidatura
                                 WHERE id_usuario = ? AND status = 'aprovado')
        )
      ORDER BY a.created_at DESC, a.id_atividade DESC`,
    [id_usuario, id_usuario]
  );
  return completar(linhas, { comTimeline: false });
}

/* ---------- Publicações ---------- */

export async function criarPost(
  { id_atividade, id_usuario, texto, midia, eh_vaga, vagas },
  executor = pool
) {
  const [r] = await executor.query(
    `INSERT INTO atividade_post (id_atividade, id_usuario, texto, midia, eh_vaga, vagas)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [id_atividade, id_usuario, texto || null, JSON.stringify(midia || []), eh_vaga, vagas]
  );
  return r.insertId;
}

export async function buscarPost(id_post) {
  const [[p]] = await pool.query("SELECT * FROM atividade_post WHERE id_post = ?", [id_post]);
  return p ? { ...p, midia: lerMidia(p.midia) } : null;
}

export async function excluirPost(id_post) {
  await pool.query("DELETE FROM atividade_post WHERE id_post = ?", [id_post]);
}

/* ---------- Seguidores (notificações do projeto) ---------- */

export async function estaSeguindo(id_usuario, id_atividade) {
  const [l] = await pool.query(
    "SELECT 1 FROM atividade_seguidor WHERE id_usuario = ? AND id_atividade = ?",
    [id_usuario, id_atividade]
  );
  return l.length > 0;
}

export async function seguir(id_usuario, id_atividade) {
  await pool.query(
    "INSERT IGNORE INTO atividade_seguidor (id_atividade, id_usuario) VALUES (?, ?)",
    [id_atividade, id_usuario]
  );
}

export async function deixarDeSeguir(id_usuario, id_atividade) {
  await pool.query(
    "DELETE FROM atividade_seguidor WHERE id_atividade = ? AND id_usuario = ?",
    [id_atividade, id_usuario]
  );
}

export async function idsSeguidos(id_usuario) {
  const [l] = await pool.query(
    "SELECT id_atividade FROM atividade_seguidor WHERE id_usuario = ?",
    [id_usuario]
  );
  return l.map((x) => String(x.id_atividade));
}

export async function idsSeguidores(id_atividade) {
  const [l] = await pool.query(
    "SELECT id_usuario FROM atividade_seguidor WHERE id_atividade = ?",
    [id_atividade]
  );
  return l.map((x) => x.id_usuario);
}

export async function listarSeguidos(id_usuario) {
  const [linhas] = await pool.query(
    `SELECT ${COLUNAS} ${ORIGEM}
      WHERE a.status <> 'cancelado'
        AND a.id_atividade IN (SELECT id_atividade FROM atividade_seguidor WHERE id_usuario = ?)
      ORDER BY a.created_at DESC`,
    [id_usuario]
  );
  return completar(linhas, { comTimeline: false });
}
