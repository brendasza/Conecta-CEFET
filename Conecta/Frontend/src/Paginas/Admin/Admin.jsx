import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Layout from "../../Componentes/Layout.jsx";
import {
  adminDashboard, adminUsuarios, adminDefinirAtivo,
  adminProjetos, excluirProjeto, listarNoticias, adminCriarNoticia, adminAtualizarNoticia,
  adminExcluirNoticia, listarAgenda, adminCriarEvento, adminAtualizarEvento, adminExcluirEvento,
  getUsuarioLogado, adminApoio, adminCriarApoio, adminRenomearApoio, adminExcluirApoio,
  adminPosts, adminRemoverPost, adminLogs, ativarProjeto,
  adminAnosLetivos, adminSalvarAnoLetivo, adminExcluirAnoLetivo, adminCriarPeriodo,
  adminAtualizarPeriodo, adminExcluirPeriodo,
} from "../../services/api.js";
import { formatarDataHora, paraInputData, ROTULO_STATUS, ROTULO_TIPO_USUARIO } from "../../utils/formato.js";

const ABAS = [
  ["dashboard", "Dashboard"],
  ["usuarios", "Usuários"],
  ["projetos", "Atividades acadêmicas"],
  ["noticias", "Mural de avisos"],
  ["calendario", "Calendário"],
  ["anoletivo", "Ano letivo"],
  ["cadastros", "Cadastros"],
  ["publicacoes", "Publicações"],
  ["logs", "Logs"],
];

function Barras({ itens, rotuloDe = (i) => i.nome }) {
  const max = Math.max(1, ...itens.map((i) => i.total));
  if (itens.length === 0) return <p className="pg-vazio">Sem dados ainda.</p>;
  return itens.map((i) => (
    <div className="pg-barra" key={rotuloDe(i)}>
      <span className="pg-barra-rotulo" title={rotuloDe(i)}>{rotuloDe(i)}</span>
      <div className="pg-barra-trilho">
        <div className="pg-barra-preench" style={{ width: `${(i.total / max) * 100}%` }} />
      </div>
      <span className="pg-barra-valor">{i.total}</span>
    </div>
  ));
}

/* ---------------- Dashboard ---------------- */

function AbaDashboard() {
  const [d, setD] = useState(null);
  const [erro, setErro] = useState("");

  useEffect(() => {
    adminDashboard().then(setD).catch((e) => setErro(e.message));
  }, []);

  if (erro) return <p className="pg-erro">{erro}</p>;
  if (!d) return <p className="pg-vazio">Carregando...</p>;

  const totalUsuarios = d.usuarios.reduce((s, u) => s + u.total, 0);
  const contar = (lista, chave) => lista.find((x) => x.status === chave)?.total ?? 0;
  const ativos = contar(d.projetosPorStatus, "ativo");
  const PLURAL = { aluno: "Alunos", professor: "Professores", administrador: "Administradores" };
  const porTipoUsuario = d.usuarios.map((u) => ({ nome: PLURAL[u.tipo] ?? u.tipo, total: u.total }));
  const meses = d.candidaturasPorMes.map((m) => ({ ...m, nome: m.mes }));

  return (
    <>
      <div className="pg-grid" style={{ marginBottom: 18 }}>
        <div className="pg-card" style={{ marginBottom: 0 }}>
          <div className="pg-numero">{totalUsuarios}</div>
          <span className="pg-muted">usuários cadastrados</span>
        </div>
        <div className="pg-card" style={{ marginBottom: 0 }}>
          <div className="pg-numero">{ativos}</div>
          <span className="pg-muted">atividades acadêmicas ativas</span>
        </div>
        <div className="pg-card" style={{ marginBottom: 0 }}>
          <div className="pg-numero">{d.candidaturasPorStatus.reduce((s, c) => s + c.total, 0)}</div>
          <span className="pg-muted">candidaturas realizadas</span>
        </div>
        <div className="pg-card" style={{ marginBottom: 0 }}>
          <div className="pg-numero">{d.vagas.totais - d.vagas.ocupadas}</div>
          <span className="pg-muted">vagas disponíveis ({d.vagas.ocupadas}/{d.vagas.totais} ocupadas)</span>
        </div>
        <div className="pg-card" style={{ marginBottom: 0 }}>
          <div className="pg-numero">{d.certificados.total}</div>
          <span className="pg-muted">certificados ({d.certificados.horas} h)</span>
        </div>
      </div>

      <div className="pg-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))" }}>
        <div className="pg-card">
          <h2>Usuários por perfil</h2>
          <Barras itens={porTipoUsuario} />
        </div>
        <div className="pg-card">
          <h2>Atividades acadêmicas por tipo</h2>
          <Barras itens={d.projetosPorTipo} />
        </div>
        <div className="pg-card">
          <h2>Atividades acadêmicas por área</h2>
          <Barras itens={d.projetosPorArea} />
        </div>
        <div className="pg-card">
          <h2>Candidaturas por situação</h2>
          <Barras itens={d.candidaturasPorStatus.map((c) => ({ ...c, nome: ROTULO_STATUS[c.status] }))} />
        </div>
        <div className="pg-card">
          <h2>Candidaturas por mês</h2>
          <Barras itens={meses} />
        </div>
        <div className="pg-card">
          <h2>Atividades acadêmicas mais procuradas</h2>
          {d.maisProcurados.length === 0 ? (
            <p className="pg-vazio">Sem dados ainda.</p>
          ) : (
            d.maisProcurados.map((p) => (
              <div className="pg-barra" key={p.id}>
                <Link to={`/projetos/${p.id}`} className="pg-barra-rotulo" style={{ width: "auto", flex: 1 }}>
                  {p.titulo}
                </Link>
                <span className="pg-barra-valor">{p.total}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}

/* ---------------- Usuários ---------------- */

function AbaUsuarios() {
  const eu = getUsuarioLogado();
  const [lista, setLista] = useState([]);
  const [busca, setBusca] = useState("");
  const [tipo, setTipo] = useState("");
  const [msg, setMsg] = useState({ tipo: "", texto: "" });

  const carregar = useCallback(() => {
    adminUsuarios({ busca: busca.trim(), tipo })
      .then(setLista)
      .catch((e) => setMsg({ tipo: "erro", texto: e.message }));
  }, [busca, tipo]);

  useEffect(() => {
    const t = setTimeout(carregar, 250);
    return () => clearTimeout(t);
  }, [carregar]);

  async function alternar(u) {
    setMsg({ tipo: "", texto: "" });
    try {
      await adminDefinirAtivo(u.id, !u.ativo);
      carregar();
    } catch (e) {
      setMsg({ tipo: "erro", texto: e.message });
    }
  }

  return (
    <div className="pg-card">
      <div className="pg-linha" style={{ marginBottom: 14 }}>
        <input placeholder="Buscar por nome ou e-mail" value={busca} onChange={(e) => setBusca(e.target.value)} style={{ minWidth: 260 }} />
        <select value={tipo} onChange={(e) => setTipo(e.target.value)}>
          <option value="">Todos os perfis</option>
          <option value="aluno">Alunos</option>
          <option value="professor">Professores</option>
          <option value="administrador">Administradores</option>
        </select>
      </div>

      {msg.texto && <p className={msg.tipo === "ok" ? "pg-ok" : "pg-erro"}>{msg.texto}</p>}

      <div style={{ overflowX: "auto" }}>
        <table className="pg-tabela">
          <thead>
            <tr><th>Nome</th><th>E-mail</th><th>Perfil</th><th>Matrícula/SIAPE</th><th>Situação</th><th /></tr>
          </thead>
          <tbody>
            {lista.map((u) => (
              <tr key={u.id}>
                <td>{u.nome}</td>
                <td>{u.email}</td>
                <td>{ROTULO_TIPO_USUARIO[u.tipo]}</td>
                <td>{u.identificador || "—"}</td>
                <td><span className={`pg-badge ${u.ativo ? "ativo" : "cancelado"}`}>{u.ativo ? "Ativo" : "Desativado"}</span></td>
                <td>
                  <div className="pg-linha" style={{ gap: 8, flexWrap: "nowrap" }}>
                    {u.id !== eu?.id && (
                      <button type="button" className={`pg-btn ${u.ativo ? "perigo" : "sec"}`} onClick={() => alternar(u)}>
                        {u.ativo ? "Desativar" : "Reativar"}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {lista.length === 0 && <p className="pg-vazio">Nenhum usuário encontrado.</p>}
      </div>
    </div>
  );
}

/* ---------------- Projetos (moderação) ---------------- */

function AbaProjetos() {
  const [lista, setLista] = useState([]);
  const [busca, setBusca] = useState("");
  const [erro, setErro] = useState("");

  const carregar = useCallback(() => {
    adminProjetos(busca.trim()).then(setLista).catch((e) => setErro(e.message));
  }, [busca]);

  useEffect(() => {
    const t = setTimeout(carregar, 250);
    return () => clearTimeout(t);
  }, [carregar]);

  async function desativar(p) {
    if (!window.confirm(`Desativar "${p.nome}"? Ela some para os usuários, mas você pode ativar novamente.`)) return;
    setErro("");
    try {
      await excluirProjeto(p.id);
      carregar();
    } catch (e) {
      setErro(e.message);
    }
  }

  async function ativar(p) {
    setErro("");
    try {
      await ativarProjeto(p.id);
      carregar();
    } catch (e) {
      setErro(e.message);
    }
  }

  return (
    <div className="pg-card">
      <div className="pg-linha" style={{ marginBottom: 14 }}>
        <input placeholder="Buscar projeto" value={busca} onChange={(e) => setBusca(e.target.value)} style={{ minWidth: 260 }} />
      </div>
      {erro && <p className="pg-erro">{erro}</p>}
      <div style={{ overflowX: "auto" }}>
        <table className="pg-tabela">
          <thead>
            <tr><th>Projeto</th><th>Tipo</th><th>Coordenação</th><th>Vagas</th><th>Situação</th><th /></tr>
          </thead>
          <tbody>
            {lista.map((p) => (
              <tr key={p.id}>
                <td><Link to={`/projetos/${p.id}`}>{p.nome}</Link></td>
                <td>{p.tipo}</td>
                <td>{p.coordenadores.map((c) => c.nome).join(", ")}</td>
                <td>{p.vagasTotais == null ? "—" : `${p.vagasOcupadas}/${p.vagasTotais}`}</td>
                <td><span className={`pg-badge ${p.status}`}>{ROTULO_STATUS[p.status]}</span></td>
                <td>
                  {p.status === "cancelado" ? (
                    <button type="button" className="pg-btn" onClick={() => ativar(p)}>Ativar</button>
                  ) : (
                    <button type="button" className="pg-btn perigo" onClick={() => desativar(p)}>Desativar</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {lista.length === 0 && <p className="pg-vazio">Nenhuma atividade acadêmica encontrada.</p>}
      </div>
    </div>
  );
}

/* ---------------- Mural de avisos ---------------- */

const NOTICIA_VAZIA = { titulo: "", conteudo: "", imagem: "", fixado: false };

function AbaNoticias() {
  const [lista, setLista] = useState([]);
  const [form, setForm] = useState(NOTICIA_VAZIA);
  const [editando, setEditando] = useState(null);
  const [erro, setErro] = useState("");

  const carregar = useCallback(() => {
    listarNoticias().then(setLista).catch((e) => setErro(e.message));
  }, []);

  useEffect(carregar, [carregar]);

  async function salvar(e) {
    e.preventDefault();
    setErro("");
    try {
      if (editando) await adminAtualizarNoticia(editando, form);
      else await adminCriarNoticia(form);
      setForm(NOTICIA_VAZIA);
      setEditando(null);
      carregar();
    } catch (err) {
      setErro(err.message);
    }
  }

  async function remover(n) {
    if (!window.confirm(`Excluir o aviso "${n.titulo}"?`)) return;
    try {
      await adminExcluirNoticia(n.id);
      carregar();
    } catch (err) {
      setErro(err.message);
    }
  }

  function editar(n) {
    setEditando(n.id);
    setForm({ titulo: n.titulo, conteudo: n.conteudo, imagem: n.imagem, fixado: n.fixado });
  }

  return (
    <>
      <form className="pg-card" onSubmit={salvar}>
        <h2>{editando ? "Editar aviso" : "Novo aviso"}</h2>
        <div className="pg-form-grid">
          <label className="campo">Título<input value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} /></label>
          <label className="campo">Link de imagem (opcional)<input value={form.imagem} onChange={(e) => setForm({ ...form, imagem: e.target.value })} placeholder="https://..." /></label>
        </div>
        <label className="campo" style={{ marginBottom: 12 }}>
          Conteúdo
          <textarea rows={4} value={form.conteudo} onChange={(e) => setForm({ ...form, conteudo: e.target.value })} />
        </label>
        <div className="pg-linha">
          <label className="pg-linha" style={{ gap: 8 }}>
            <input type="checkbox" checked={form.fixado} onChange={(e) => setForm({ ...form, fixado: e.target.checked })} />
            Fixar no topo do mural
          </label>
          <span className="pg-espaco" />
          {editando && (
            <button type="button" className="pg-btn sec" onClick={() => { setEditando(null); setForm(NOTICIA_VAZIA); }}>
              Cancelar edição
            </button>
          )}
          <button type="submit" className="pg-btn">{editando ? "Salvar" : "Publicar aviso"}</button>
        </div>
        {erro && <p className="pg-erro">{erro}</p>}
      </form>

      {lista.length === 0 && <p className="pg-vazio">Nenhum aviso publicado.</p>}
      {lista.map((n) => (
        <div key={n.id} className="pg-card">
          <div className="pg-linha">
            <h3>{n.fixado ? "📌 " : ""}{n.titulo}</h3>
            <span className="pg-espaco" />
            <span className="pg-muted">{formatarDataHora(n.data)} · {n.autor}</span>
          </div>
          <p>{n.conteudo}</p>
          <div className="pg-linha">
            <button type="button" className="pg-btn sec" onClick={() => editar(n)}>Editar</button>
            <button type="button" className="pg-btn perigo" onClick={() => remover(n)}>Excluir</button>
          </div>
        </div>
      ))}
    </>
  );
}

/* ---------------- Calendário ---------------- */

const EVENTO_VAZIO = { titulo: "", descricao: "", inicio: "", fim: "" };

function AbaCalendario() {
  const [lista, setLista] = useState([]);
  const [form, setForm] = useState(EVENTO_VAZIO);
  const [editando, setEditando] = useState(null);
  const [erro, setErro] = useState("");

  const carregar = useCallback(() => {
    listarAgenda()
      .then((l) => setLista(l.filter((e) => e.origem === "calendario")))
      .catch((e) => setErro(e.message));
  }, []);

  useEffect(carregar, [carregar]);

  async function salvar(e) {
    e.preventDefault();
    setErro("");
    try {
      if (editando) await adminAtualizarEvento(editando, form);
      else await adminCriarEvento(form);
      setForm(EVENTO_VAZIO);
      setEditando(null);
      carregar();
    } catch (err) {
      setErro(err.message);
    }
  }

  async function remover(ev) {
    if (!window.confirm(`Excluir o evento "${ev.titulo}"?`)) return;
    try {
      await adminExcluirEvento(ev.eventoId);
      carregar();
    } catch (err) {
      setErro(err.message);
    }
  }

  function editar(ev) {
    setEditando(ev.eventoId);
    setForm({ titulo: ev.titulo, descricao: ev.descricao, inicio: paraInputData(ev.inicio), fim: paraInputData(ev.fim) });
  }

  return (
    <>
      <form className="pg-card" onSubmit={salvar}>
        <h2>{editando ? "Editar evento" : "Novo evento do calendário acadêmico"}</h2>
        <div className="pg-form-grid">
          <label className="campo">Título<input value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} /></label>
          <label className="campo">Início<input type="datetime-local" value={form.inicio} onChange={(e) => setForm({ ...form, inicio: e.target.value })} /></label>
          <label className="campo">Fim (opcional)<input type="datetime-local" value={form.fim} onChange={(e) => setForm({ ...form, fim: e.target.value })} /></label>
        </div>
        <label className="campo" style={{ marginBottom: 12 }}>
          Descrição (opcional)
          <textarea rows={2} value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} />
        </label>
        <div className="pg-linha">
          <span className="pg-espaco" />
          {editando && (
            <button type="button" className="pg-btn sec" onClick={() => { setEditando(null); setForm(EVENTO_VAZIO); }}>
              Cancelar edição
            </button>
          )}
          <button type="submit" className="pg-btn">{editando ? "Salvar" : "Adicionar evento"}</button>
        </div>
        {erro && <p className="pg-erro">{erro}</p>}
      </form>

      <div className="pg-card">
        <h2>Eventos cadastrados</h2>
        {lista.length === 0 && <p className="pg-vazio">Nenhum evento cadastrado.</p>}
        {lista.map((ev) => (
          <div key={ev.id} className="pg-linha" style={{ padding: "10px 0", borderBottom: "1px solid #f0f3f8" }}>
            <div>
              <strong>{ev.titulo}</strong>
              <div className="pg-muted">{formatarDataHora(ev.inicio)}{ev.fim !== ev.inicio ? ` até ${formatarDataHora(ev.fim)}` : ""}</div>
            </div>
            <span className="pg-espaco" />
            <button type="button" className="pg-btn sec" onClick={() => editar(ev)}>Editar</button>
            <button type="button" className="pg-btn perigo" onClick={() => remover(ev)}>Excluir</button>
          </div>
        ))}
      </div>
    </>
  );
}

/* ---------------- Ano letivo ---------------- */

const ANO_VAZIO = { ano: String(new Date().getFullYear()), inicioAulas: "", fimAulas: "" };
const PERIODO_VAZIO = { tipo: "semestre", titulo: "", inicio: "", fim: "" };

const dataBr = (d) => (d ? new Date(`${d}T12:00:00`).toLocaleDateString("pt-BR") : "");

function AbaAnoLetivo() {
  const [anos, setAnos] = useState([]);
  const [formAno, setFormAno] = useState(ANO_VAZIO);
  const [periodo, setPeriodo] = useState(PERIODO_VAZIO);
  const [anoDoPeriodo, setAnoDoPeriodo] = useState("");
  const [editandoPeriodo, setEditandoPeriodo] = useState(null);
  const [msg, setMsg] = useState({ tipo: "", texto: "" });

  const carregar = useCallback(() => {
    adminAnosLetivos()
      .then(setAnos)
      .catch((e) => setMsg({ tipo: "erro", texto: e.message }));
  }, []);

  useEffect(carregar, [carregar]);

  async function salvarAno(e) {
    e.preventDefault();
    setMsg({ tipo: "", texto: "" });
    try {
      await adminSalvarAnoLetivo(formAno);
      setMsg({ tipo: "ok", texto: `Ano letivo ${formAno.ano} salvo.` });
      setAnoDoPeriodo(formAno.ano);
      carregar();
    } catch (err) {
      setMsg({ tipo: "erro", texto: err.message });
    }
  }

  async function excluirAno(a) {
    if (!window.confirm(`Excluir o ano letivo ${a.ano} e todos os seus períodos?`)) return;
    try {
      await adminExcluirAnoLetivo(a.ano);
      carregar();
    } catch (err) {
      setMsg({ tipo: "erro", texto: err.message });
    }
  }

  async function salvarPeriodo(e) {
    e.preventDefault();
    setMsg({ tipo: "", texto: "" });
    try {
      if (editandoPeriodo) await adminAtualizarPeriodo(editandoPeriodo, periodo);
      else await adminCriarPeriodo(anoDoPeriodo, periodo);
      setPeriodo(PERIODO_VAZIO);
      setEditandoPeriodo(null);
      carregar();
    } catch (err) {
      setMsg({ tipo: "erro", texto: err.message });
    }
  }

  async function excluirPeriodo(p) {
    if (!window.confirm(`Excluir "${p.titulo}"?`)) return;
    try {
      await adminExcluirPeriodo(p.id);
      carregar();
    } catch (err) {
      setMsg({ tipo: "erro", texto: err.message });
    }
  }

  function editarPeriodo(p) {
    setEditandoPeriodo(p.id);
    setAnoDoPeriodo(p.ano);
    setPeriodo({ tipo: p.tipo, titulo: p.titulo, inicio: p.inicio, fim: p.fim });
  }

  return (
    <>
      <form className="pg-card" onSubmit={salvarAno}>
        <h2>Cadastrar ano letivo</h2>
        <p className="pg-muted">Defina o ano vigente e o período de aulas. Salvar de novo o mesmo ano atualiza as datas.</p>
        <div className="pg-form-grid">
          <label className="campo">Ano<input value={formAno.ano} maxLength={4} onChange={(e) => setFormAno({ ...formAno, ano: e.target.value })} /></label>
          <label className="campo">Início das aulas<input type="date" value={formAno.inicioAulas} onChange={(e) => setFormAno({ ...formAno, inicioAulas: e.target.value })} /></label>
          <label className="campo">Fim das aulas<input type="date" value={formAno.fimAulas} onChange={(e) => setFormAno({ ...formAno, fimAulas: e.target.value })} /></label>
        </div>
        <div className="pg-linha">
          <span className="pg-espaco" />
          <button type="submit" className="pg-btn">Salvar ano letivo</button>
        </div>
        {msg.texto && <p className={msg.tipo === "ok" ? "pg-ok" : "pg-erro"}>{msg.texto}</p>}
      </form>

      <form className="pg-card" onSubmit={salvarPeriodo}>
        <h2>{editandoPeriodo ? "Editar período" : "Períodos semestrais e recessos"}</h2>
        <div className="pg-form-grid">
          <label className="campo">
            Ano letivo
            <select value={anoDoPeriodo} disabled={Boolean(editandoPeriodo)} onChange={(e) => setAnoDoPeriodo(e.target.value)}>
              <option value="">Selecione</option>
              {anos.map((a) => <option key={a.ano} value={a.ano}>{a.ano}</option>)}
            </select>
          </label>
          <label className="campo">
            Tipo
            <select value={periodo.tipo} onChange={(e) => setPeriodo({ ...periodo, tipo: e.target.value })}>
              <option value="semestre">Período semestral</option>
              <option value="recesso">Recesso institucional</option>
            </select>
          </label>
          <label className="campo">Título<input value={periodo.titulo} placeholder="Ex: 1º semestre" onChange={(e) => setPeriodo({ ...periodo, titulo: e.target.value })} /></label>
          <label className="campo">Início<input type="date" value={periodo.inicio} onChange={(e) => setPeriodo({ ...periodo, inicio: e.target.value })} /></label>
          <label className="campo">Fim<input type="date" value={periodo.fim} onChange={(e) => setPeriodo({ ...periodo, fim: e.target.value })} /></label>
        </div>
        <div className="pg-linha">
          <span className="pg-espaco" />
          {editandoPeriodo && (
            <button type="button" className="pg-btn sec" onClick={() => { setEditandoPeriodo(null); setPeriodo(PERIODO_VAZIO); }}>
              Cancelar edição
            </button>
          )}
          <button type="submit" className="pg-btn" disabled={!anoDoPeriodo}>{editandoPeriodo ? "Salvar" : "Adicionar período"}</button>
        </div>
      </form>

      {anos.length === 0 && <div className="pg-card"><p className="pg-vazio">Nenhum ano letivo cadastrado.</p></div>}

      {anos.map((a) => (
        <div className="pg-card" key={a.ano}>
          <div className="pg-linha">
            <div>
              <h2 style={{ margin: 0 }}>Ano letivo {a.ano}</h2>
              <span className="pg-muted">Aulas de {dataBr(a.inicioAulas)} a {dataBr(a.fimAulas)}</span>
            </div>
            <span className="pg-espaco" />
            <button type="button" className="pg-btn perigo" onClick={() => excluirAno(a)}>Excluir ano</button>
          </div>

          {a.periodos.length === 0 && <p className="pg-vazio">Nenhum período cadastrado.</p>}
          {a.periodos.map((p) => (
            <div key={p.id} className="pg-linha" style={{ padding: "10px 0", borderBottom: "1px solid #f0f3f8" }}>
              <div>
                <strong>{p.titulo}</strong>
                <div className="pg-muted">
                  {p.tipo === "recesso" ? "Recesso institucional" : "Período semestral"} · {dataBr(p.inicio)} a {dataBr(p.fim)}
                </div>
              </div>
              <span className="pg-espaco" />
              <button type="button" className="pg-btn sec" onClick={() => editarPeriodo(p)}>Editar</button>
              <button type="button" className="pg-btn perigo" onClick={() => excluirPeriodo(p)}>Excluir</button>
            </div>
          ))}
        </div>
      ))}
    </>
  );
}

/* ---------------- Cadastros de apoio ---------------- */


const CATEGORIAS = [
  ["areas", "Áreas de conhecimento"],
  ["tipos", "Tipos de atividade"],
  ["habilidades", "Habilidades"],
];

function AbaCadastros() {
  const [categoria, setCategoria] = useState("areas");
  const [itens, setItens] = useState([]);
  const [novo, setNovo] = useState("");
  const [editando, setEditando] = useState(null); // { id, nome }
  const [erro, setErro] = useState("");

  const carregar = useCallback(() => {
    adminApoio(categoria).then(setItens).catch((e) => setErro(e.message));
  }, [categoria]);

  useEffect(carregar, [carregar]);

  function trocar(id) {
    setCategoria(id);
    setItens([]);
    setEditando(null);
    setErro("");
  }

  async function executar(acao) {
    setErro("");
    try {
      await acao();
      carregar();
    } catch (e) {
      setErro(e.message);
    }
  }

  async function adicionar(e) {
    e.preventDefault();
    if (!novo.trim()) return;
    await executar(async () => {
      await adminCriarApoio(categoria, novo.trim());
      setNovo("");
    });
  }

  async function salvarEdicao() {
    await executar(async () => {
      await adminRenomearApoio(categoria, editando.id, editando.nome.trim());
      setEditando(null);
    });
  }

  async function remover(item) {
    if (!window.confirm(`Excluir "${item.nome}"?`)) return;
    await executar(() => adminExcluirApoio(categoria, item.id));
  }

  return (
    <div className="pg-card">
      <div className="pg-abas" style={{ marginBottom: 16 }}>
        {CATEGORIAS.map(([id, nome]) => (
          <button key={id} type="button" className={`pg-aba${categoria === id ? " ativa" : ""}`} onClick={() => trocar(id)}>
            {nome}
          </button>
        ))}
      </div>

      <form className="pg-linha" onSubmit={adicionar} style={{ marginBottom: 14 }}>
        <input placeholder="Novo item" value={novo} onChange={(e) => setNovo(e.target.value)} style={{ minWidth: 260 }} />
        <button type="submit" className="pg-btn">Adicionar</button>
      </form>

      {erro && <p className="pg-erro">{erro}</p>}

      <table className="pg-tabela">
        <thead>
          <tr><th>Nome</th><th>Em uso</th><th /></tr>
        </thead>
        <tbody>
          {itens.map((i) => (
            <tr key={i.id}>
              <td>
                {editando?.id === i.id ? (
                  <input value={editando.nome} onChange={(e) => setEditando({ ...editando, nome: e.target.value })} />
                ) : (
                  i.nome
                )}
              </td>
              <td>{i.usos}</td>
              <td>
                <div className="pg-linha" style={{ justifyContent: "flex-end" }}>
                  {editando?.id === i.id ? (
                    <>
                      <button type="button" className="pg-btn" onClick={salvarEdicao}>Salvar</button>
                      <button type="button" className="pg-btn sec" onClick={() => setEditando(null)}>Cancelar</button>
                    </>
                  ) : (
                    <>
                      <button type="button" className="pg-btn sec" onClick={() => setEditando({ id: i.id, nome: i.nome })}>Renomear</button>
                      <button type="button" className="pg-btn perigo" onClick={() => remover(i)} disabled={i.usos > 0} title={i.usos > 0 ? "Item em uso" : ""}>Excluir</button>
                    </>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {itens.length === 0 && !erro && <p className="pg-vazio">Nenhum item cadastrado.</p>}
    </div>
  );
}

/* ---------------- Moderação de publicações ---------------- */

function AbaPublicacoes() {
  const [lista, setLista] = useState([]);
  const [busca, setBusca] = useState("");
  const [erro, setErro] = useState("");

  const carregar = useCallback(() => {
    adminPosts(busca.trim()).then(setLista).catch((e) => setErro(e.message));
  }, [busca]);

  useEffect(() => {
    const t = setTimeout(carregar, 250);
    return () => clearTimeout(t);
  }, [carregar]);

  async function remover(p) {
    if (!window.confirm("Remover esta publicação da plataforma?")) return;
    try {
      await adminRemoverPost(p.id);
      carregar();
    } catch (e) {
      setErro(e.message);
    }
  }

  return (
    <div className="pg-card">
      <div className="pg-linha" style={{ marginBottom: 14 }}>
        <input placeholder="Buscar por texto, atividade acadêmica ou autor" value={busca} onChange={(e) => setBusca(e.target.value)} style={{ minWidth: 300 }} />
      </div>
      {erro && <p className="pg-erro">{erro}</p>}

      {lista.map((p) => (
        <div key={p.id} className="candidato">
          <div className="pg-linha">
            <div>
              <strong>{p.autor}</strong>
              <span className="pg-muted"> em </span>
              <Link to={`/projetos/${p.projetoId}`}>{p.projeto}</Link>
              <div className="pg-muted">{formatarDataHora(p.data)}{p.temMidia ? " · com mídia" : ""}{p.ehVaga ? " · vaga" : ""}</div>
            </div>
            <span className="pg-espaco" />
            <button type="button" className="pg-btn perigo" onClick={() => remover(p)}>Remover</button>
          </div>
          {p.texto && <p style={{ margin: "10px 0 0", whiteSpace: "pre-wrap" }}>{p.texto.length > 400 ? `${p.texto.slice(0, 400)}…` : p.texto}</p>}
        </div>
      ))}
      {lista.length === 0 && !erro && <p className="pg-vazio">Nenhuma publicação encontrada.</p>}
    </div>
  );
}

/* ---------------- Logs de atividade ---------------- */

function AbaLogs() {
  const [logs, setLogs] = useState([]);
  const [erro, setErro] = useState("");

  useEffect(() => {
    adminLogs({ limite: 150 }).then(setLogs).catch((e) => setErro(e.message));
  }, []);

  return (
    <div className="pg-card">
      <h2>Atividade recente</h2>
      {erro && <p className="pg-erro">{erro}</p>}
      <div style={{ overflowX: "auto" }}>
        <table className="pg-tabela">
          <thead>
            <tr><th>Quando</th><th>Quem</th><th>Ação</th><th>Detalhe</th></tr>
          </thead>
          <tbody>
            {logs.map((l) => (
              <tr key={l.id}>
                <td>{formatarDataHora(l.data)}</td>
                <td>{l.usuario}</td>
                <td><span className="pg-badge">{l.acao}</span></td>
                <td>{l.detalhe}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {logs.length === 0 && !erro && <p className="pg-vazio">Nenhum registro ainda.</p>}
      </div>
    </div>
  );
}

/* ---------------- Página ---------------- */

function Admin() {
  const [aba, setAba] = useState("dashboard");

  return (
    <Layout>
      <main className="pg">
        <div className="pg-container">
          <h1>Painel administrativo</h1>
          <p className="pg-sub">Indicadores, usuários, projetos, publicações, mural de avisos, calendário, cadastros e logs.</p>

          <div className="pg-abas">
            {ABAS.map(([id, nome]) => (
              <button key={id} type="button" className={`pg-aba${aba === id ? " ativa" : ""}`} onClick={() => setAba(id)}>
                {nome}
              </button>
            ))}
          </div>

          {aba === "dashboard" && <AbaDashboard />}
          {aba === "usuarios" && <AbaUsuarios />}
          {aba === "projetos" && <AbaProjetos />}
          {aba === "noticias" && <AbaNoticias />}
          {aba === "calendario" && <AbaCalendario />}
          {aba === "anoletivo" && <AbaAnoLetivo />}
          {aba === "cadastros" && <AbaCadastros />}
          {aba === "publicacoes" && <AbaPublicacoes />}
          {aba === "logs" && <AbaLogs />}
        </div>
      </main>
    </Layout>
  );
}

export default Admin;
