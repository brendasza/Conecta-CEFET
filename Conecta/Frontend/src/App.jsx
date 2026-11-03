import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Layout from "./Componentes/Layout.jsx";
import ConteudoPost from "./Componentes/ConteudoPost.jsx";
import SeguirButton from "./Componentes/SeguirButton.jsx";
import { ChevronRight } from "./Componentes/Icones.jsx";
import {
  buscarFeed, buscarOpcoes, listarNoticias, alternarSeguir,
} from "./services/api.js";
import { getIniciais, formatarData, ehProjetoDeExtensao } from "./utils/formato.js";
import "./App.css";

function PostItem({ post, seguindo, onSeguir }) {
  return (
    <article className="feed-item">
      <header className="feed-item-header">
        <div className="feed-item-avatar">{getIniciais(post.autorNome)}</div>

        <div className="feed-item-autor">
          <strong>{post.autorNome}</strong>
          <Link to={`/projetos/${post.projetoId}`}>{post.projetoNome}</Link>
        </div>

        <span className="feed-item-data">{formatarData(post.data, { day: "2-digit", month: "short" })}</span>
      </header>

      <ConteudoPost post={post} />

      <footer className="feed-item-footer">
        <SeguirButton seguindo={seguindo} onClick={onSeguir} />

        <Link to={`/projetos/${post.projetoId}`} className="feed-item-link">
          Ver atividade
          <ChevronRight />
        </Link>
      </footer>
    </article>
  );
}

function NovoProjetoItem({ item, seguindo, onSeguir }) {
  return (
    <article className="feed-item">
      <span className="feed-item-etiqueta">
        {ehProjetoDeExtensao(item.tipo) ? "Novo projeto de extensão" : "Nova atividade acadêmica"}
      </span>

      <h3 className="feed-item-titulo">
        <Link to={`/projetos/${item.projetoId}`}>{item.projetoNome}</Link>
      </h3>

      <p className="feed-item-texto">{item.objetivo}</p>

      <div className="feed-item-tags">
        <span className="area-tag">{item.area}</span>
        <span className="area-tag">{item.tipo}</span>
        {item.ehVaga && (
          <span className="badge-vaga">
            Inscrições abertas
            {item.vagasDisponiveis != null
              ? ` · ${item.vagasDisponiveis} ${item.vagasDisponiveis === 1 ? "vaga" : "vagas"}`
              : ""}
          </span>
        )}
      </div>

      <footer className="feed-item-footer">
        <SeguirButton seguindo={seguindo} onClick={onSeguir} />

        <Link to={`/projetos/${item.projetoId}`} className="feed-item-link">
          Ver atividade
          <ChevronRight />
        </Link>
      </footer>
    </article>
  );
}

const ABAS_FILTRO = [
  { id: "todos", nome: "Todos" },
  { id: "vagas", nome: "Vagas abertas" },
  { id: "seguindo", nome: "Acompanhando" },
];

function FilterBar({ filtro, setFiltro, opcoes, area, setArea, tipo, setTipo, status, setStatus }) {
  return (
    <div className="filter-bar">
      <div className="filter-tabs">
        {ABAS_FILTRO.map((aba) => (
          <button
            key={aba.id}
            type="button"
            className={`filter-tab${filtro === aba.id ? " selected" : ""}`}
            onClick={() => setFiltro(aba.id)}
          >
            {aba.nome}
          </button>
        ))}
      </div>

      <div className="filter-selects">
        <select value={area} onChange={(e) => setArea(e.target.value)} aria-label="Filtrar por área">
          <option value="">Todas as áreas</option>
          {opcoes.areas.map((a) => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>

        <select value={tipo} onChange={(e) => setTipo(e.target.value)} aria-label="Filtrar por tipo">
          <option value="">Todos os tipos</option>
          {opcoes.tipos.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>

        <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filtrar por status">
          <option value="ativo">Atividades ativas</option>
          <option value="encerrado">Encerrados</option>
          <option value="todos">Todos os status</option>
        </select>
      </div>
    </div>
  );
}

// "Destaque da Semana": lê a tabela feed_noticias (via /noticias).
// Prioridade: notícia fixada > mais recente da última semana > mais recente.
function DestaqueDaSemana({ noticias }) {
  if (noticias.length === 0) return null;

  const umaSemana = 7 * 24 * 60 * 60 * 1000;
  const recentes = noticias.filter((n) => Date.now() - new Date(n.data).getTime() <= umaSemana);
  const destaque =
    noticias.find((n) => n.fixado) ||
    [...recentes].sort((a, b) => new Date(b.data) - new Date(a.data))[0] ||
    [...noticias].sort((a, b) => new Date(b.data) - new Date(a.data))[0];

  return (
    <div className="destaque-semana">
      <span className="destaque-etiqueta">Destaque da Semana</span>
      {destaque.imagem && <img src={destaque.imagem} alt="" className="destaque-imagem" />}
      <strong>{destaque.titulo}</strong>
      <p>{destaque.conteudo.length > 220 ? `${destaque.conteudo.slice(0, 220)}…` : destaque.conteudo}</p>
    </div>
  );
}

function Mural({ noticias }) {
  return (
    <aside className="highlight">
      <DestaqueDaSemana noticias={noticias} />
      <h2>Mural de avisos</h2>

      {noticias.length === 0 ? (
        <p>Nenhuma novidade por enquanto.</p>
      ) : (
        noticias.slice(0, 3).map((n) => (
          <div key={n.id} className="mural-item">
            <strong>
              {n.fixado ? "📌 " : ""}
              {n.titulo}
            </strong>
            <p>{n.conteudo.length > 160 ? `${n.conteudo.slice(0, 160)}…` : n.conteudo}</p>
          </div>
        ))
      )}
    </aside>
  );
}

const MENSAGEM_VAZIO = {
  todos: "Ainda não há publicações no feed.",
  vagas: "Nenhuma vaga aberta no momento.",
  seguindo:
    "Você ainda não ativou notificações em nenhuma atividade acadêmica. Toque em \"Ativar notificações\" nas atividades acadêmicas para ver as novidades deles aqui.",
};

function App() {
  const navigate = useNavigate();

  const [filtro, setFiltro] = useState("todos");
  const [busca, setBusca] = useState("");
  const [buscaAplicada, setBuscaAplicada] = useState("");
  const [area, setArea] = useState("");
  const [tipo, setTipo] = useState("");
  const [status, setStatus] = useState("ativo");

  const [itens, setItens] = useState([]);
  const [seguindo, setSeguindo] = useState([]);
  const [opcoes, setOpcoes] = useState({ areas: [], tipos: [] });
  const [noticias, setNoticias] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  // espera o usuário parar de digitar antes de buscar no servidor
  useEffect(() => {
    const t = setTimeout(() => setBuscaAplicada(busca.trim()), 350);
    return () => clearTimeout(t);
  }, [busca]);

  useEffect(() => {
    buscarOpcoes().then(setOpcoes).catch(() => {});
    listarNoticias().then(setNoticias).catch(() => {});
  }, []);

  useEffect(() => {
    let ativo = true;
    setCarregando(true);
    buscarFeed({ busca: buscaAplicada, area, tipo, status })
      .then((dados) => {
        if (!ativo) return;
        setItens(dados.itens);
        setSeguindo(dados.seguindo);
        setErro("");
      })
      .catch((e) => ativo && setErro(e.message))
      .finally(() => ativo && setCarregando(false));
    return () => {
      ativo = false;
    };
  }, [buscaAplicada, area, tipo, status]);

  async function handleSeguir(projetoId) {
    try {
      const { seguindo: agora } = await alternarSeguir(projetoId);
      setSeguindo((atual) =>
        agora ? [...new Set([...atual, projetoId])] : atual.filter((id) => id !== projetoId)
      );
    } catch (e) {
      if (e.status === 401) navigate("/login");
    }
  }

  const itensFiltrados = itens.filter((item) => {
    if (filtro === "vagas") return item.ehVaga;
    if (filtro === "seguindo") return seguindo.includes(item.projetoId);
    return true;
  });

  return (
    <Layout busca={busca} setBusca={setBusca}>
      <main className="feed">
        <div className="feed-layout">
          <section className="projects-section">
            <FilterBar
              filtro={filtro} setFiltro={setFiltro} opcoes={opcoes}
              area={area} setArea={setArea} tipo={tipo} setTipo={setTipo}
              status={status} setStatus={setStatus}
            />

            <h1>
              {itensFiltrados.length}{" "}
              {itensFiltrados.length === 1 ? "publicação" : "publicações"}
            </h1>

            {erro && <p className="feed-vazio">{erro}</p>}

            {!erro && carregando && itens.length === 0 ? (
              <p className="feed-vazio">Carregando...</p>
            ) : !erro && itensFiltrados.length === 0 ? (
              <p className="feed-vazio">
                {buscaAplicada || area || tipo || status !== "ativo"
                  ? "Nenhum resultado para a sua busca."
                  : MENSAGEM_VAZIO[filtro]}
              </p>
            ) : (
              <div className="projects-list">
                {itensFiltrados.map((item) => {
                  const chave = `${item.kind}-${item.id}`;
                  const segue = seguindo.includes(item.projetoId);
                  const aoSeguir = () => handleSeguir(item.projetoId);

                  return item.kind === "projeto" ? (
                    <NovoProjetoItem key={chave} item={item} seguindo={segue} onSeguir={aoSeguir} />
                  ) : (
                    <PostItem key={chave} post={item} seguindo={segue} onSeguir={aoSeguir} />
                  );
                })}
              </div>
            )}
          </section>

          <Mural noticias={noticias} />
        </div>
      </main>
    </Layout>
  );
}

export default App;
