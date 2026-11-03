import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  getUsuarioLogado, logout, contarNaoLidas, ehAluno, podeCoordenar, ehAdmin, buscaGeral,
} from "../services/api.js";
import { getIniciais, ROTULO_TIPO_USUARIO } from "../utils/formato.js";
import {
  Icon, SearchIcon, HomeIcon, CalendarIcon, BellIcon, ChevronDown, HamburgerIcon,
  ClipboardIcon, FolderIcon, PlusCircleIcon, ShieldIcon,
} from "./Icones.jsx";
import "../App.css";
import "./Layout.css";

function itensDoMenu(usuario) {
  const itens = [
    { to: "/", rotulo: "Feed", icone: <HomeIcon /> },
    { to: "/agenda", rotulo: "Agenda", icone: <CalendarIcon /> },
    { to: "/notificacoes", rotulo: "Notificações", icone: <BellIcon />, badge: true },
  ];

  if (ehAluno(usuario)) {
    itens.push({ to: "/candidaturas", rotulo: "Minhas candidaturas", icone: <ClipboardIcon /> });
  }
  if (podeCoordenar(usuario)) {
    itens.push({ to: "/perfil/projetos", rotulo: "Minhas atividades acadêmicas", icone: <FolderIcon /> });
    itens.push({ to: "/projetos/criar", rotulo: "Criar atividade acadêmica", icone: <PlusCircleIcon /> });
  }
  if (ehAdmin(usuario)) {
    itens.push({ to: "/admin", rotulo: "Painel administrativo", icone: <ShieldIcon /> });
  }
  return itens;
}

const MOBILE = "(max-width: 900px)";

function ehTelaPequena() {
  return typeof window !== "undefined" && window.matchMedia(MOBILE).matches;
}

// Janela de confirmação antes de encerrar a sessão
function ConfirmarSaida({ onCancelar, onConfirmar }) {
  useEffect(() => {
    function aoTeclar(e) {
      if (e.key === "Escape") onCancelar();
    }
    document.addEventListener("keydown", aoTeclar);
    return () => document.removeEventListener("keydown", aoTeclar);
  }, [onCancelar]);

  return (
    <div className="modal-fundo" onClick={onCancelar}>
      <div
        className="modal-caixa"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="titulo-sair"
        aria-describedby="texto-sair"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="titulo-sair">Deseja realmente sair?</h2>
        <p id="texto-sair">Você precisará entrar novamente para acessar sua conta.</p>

        <div className="modal-acoes">
          <button type="button" className="modal-btn sec" onClick={onCancelar} autoFocus>
            Cancelar
          </button>
          <button type="button" className="modal-btn perigo" onClick={onConfirmar}>
            Sair
          </button>
        </div>
      </div>
    </div>
  );
}

function Sidebar({ aberto, setAberto, usuario, naoLidas }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [confirmando, setConfirmando] = useState(false);

  function handleLogout() {
    setConfirmando(false);
    logout();
    navigate("/login");
  }

  // em telas pequenas o menu cobre o conteúdo, então fecha ao escolher uma página
  function aoNavegar() {
    if (ehTelaPequena()) setAberto(false);
  }

  return (
    <>
      {aberto && <div className="sidebar-fundo" onClick={() => setAberto(false)} aria-hidden="true" />}

      <aside className={`sidebar${aberto ? " aberta" : ""}`}>
        <div className="sidebar-top">
          <button
            type="button"
            className="collapse-button"
            onClick={() => setAberto(false)}
            aria-label="Fechar menu"
          >
            <Icon>
              <path d="m15 18-6-6 6-6" />
            </Icon>
          </button>

          <div className="menu-title">MENU</div>

          <nav className="menu">
            {itensDoMenu(usuario).map((item) => (
              <Link
                key={item.to}
                to={item.to}
                onClick={aoNavegar}
                className={`menu-item${pathname === item.to ? " active" : ""}${
                  item.badge ? " notification-item" : ""
                }`}
              >
                {item.icone}
                <span>{item.rotulo}</span>
                {item.badge && naoLidas > 0 && (
                  <span className="notification-badge">{naoLidas > 99 ? "99+" : naoLidas}</span>
                )}
              </Link>
            ))}
          </nav>
        </div>

        <div className="sidebar-bottom">
          <img src="/images/logo.png" alt="Conecta CEFET" className="sidebar-bottom-logo" />

          <button type="button" className="logout-button" onClick={() => setConfirmando(true)}>
            <Icon size={20}>
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <path d="m16 17 5-5-5-5" />
              <path d="M21 12H9" />
            </Icon>
            <span>Sair</span>
          </button>
        </div>
      </aside>

      {confirmando && (
        <ConfirmarSaida onCancelar={() => setConfirmando(false)} onConfirmar={handleLogout} />
      )}
    </>
  );
}


// Busca universal (todos os perfis): atividades acadêmicas, professores e outros usuários.
// No feed, o texto digitado também continua filtrando as publicações (setBusca).
function CaixaBusca({ busca, setBusca }) {
  const navigate = useNavigate();
  const controlada = typeof setBusca === "function";
  const [interno, setInterno] = useState("");
  const texto = controlada ? busca : interno;
  const [resultados, setResultados] = useState(null);
  const [aberto, setAberto] = useState(false);
  const caixa = useRef(null);

  useEffect(() => {
    const termo = (texto || "").trim();
    if (termo.length < 2) {
      setResultados(null);
      return undefined;
    }
    let ativo = true;
    const t = setTimeout(() => {
      buscaGeral(termo).then((d) => ativo && setResultados(d)).catch(() => ativo && setResultados(null));
    }, 300);
    return () => {
      ativo = false;
      clearTimeout(t);
    };
  }, [texto]);

  useEffect(() => {
    function fora(e) {
      if (caixa.current && !caixa.current.contains(e.target)) setAberto(false);
    }
    document.addEventListener("mousedown", fora);
    return () => document.removeEventListener("mousedown", fora);
  }, []);

  function ir(destino) {
    setAberto(false);
    navigate(destino);
  }

  const total = resultados
    ? resultados.atividades.length + resultados.professores.length + resultados.usuarios.length
    : 0;
  const ROTULO = { aluno: "Aluno(a)", administrador: "Administrador(a)" };

  return (
    <div className="search-box busca-universal" ref={caixa}>
      <SearchIcon />
      <input
        type="text"
        placeholder="Buscar atividades acadêmicas, professores e pessoas..."
        value={texto}
        onFocus={() => setAberto(true)}
        onChange={(e) => {
          setAberto(true);
          if (controlada) setBusca(e.target.value);
          else setInterno(e.target.value);
        }}
      />

      {aberto && resultados && (
        <div className="busca-resultados">
          {total === 0 && <p className="busca-vazio">Nada encontrado.</p>}

          {resultados.atividades.length > 0 && (
            <div className="busca-grupo">
              <span className="busca-titulo">Atividades acadêmicas</span>
              {resultados.atividades.map((a) => (
                <button key={`a${a.id}`} type="button" className="busca-item" onClick={() => ir(`/projetos/${a.id}`)}>
                  <strong>{a.nome}</strong>
                  <span>{a.tipo} · {a.area}</span>
                </button>
              ))}
            </div>
          )}

          {resultados.professores.length > 0 && (
            <div className="busca-grupo">
              <span className="busca-titulo">Professores</span>
              {resultados.professores.map((p) => (
                <button key={`p${p.id}`} type="button" className="busca-item" onClick={() => ir(`/usuarios/${p.id}`)}>
                  <strong>{p.nome}</strong>
                  <span>{p.departamento}</span>
                </button>
              ))}
            </div>
          )}

          {resultados.usuarios.length > 0 && (
            <div className="busca-grupo">
              <span className="busca-titulo">Outros usuários</span>
              {resultados.usuarios.map((u) => (
                <button key={`u${u.id}`} type="button" className="busca-item" onClick={() => ir(`/usuarios/${u.id}`)}>
                  <strong>{u.nome}</strong>
                  <span>{ROTULO[u.tipo] ?? u.tipo}{u.curso ? ` · ${u.curso}` : ""}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Header({ sidebarAberta, setSidebarAberta, busca, setBusca, usuario }) {
  const [menuPerfilAberto, setMenuPerfilAberto] = useState(false);

  return (
    <header className="topbar">
      {!sidebarAberta && (
        <button
          type="button"
          className="header-menu-button"
          onClick={() => setSidebarAberta(true)}
          aria-label="Abrir menu"
        >
          <HamburgerIcon />
        </button>
      )}

      <img src="/images/Conecta.png" alt="Conecta CEFET" className="header-text-image" />

      <CaixaBusca busca={busca} setBusca={setBusca} />

      <div className="profile">
        <div className="profile-avatar">{getIniciais(usuario?.nome)}</div>

        <div className="profile-info">
          <strong>{usuario?.nome || "Visitante"}</strong>
          <span>{usuario ? ROTULO_TIPO_USUARIO[usuario.tipo] : "Faça login"}</span>
        </div>

        <button
          type="button"
          className="profile-arrow"
          onClick={() => setMenuPerfilAberto((a) => !a)}
          aria-label="Abrir menu do perfil"
          aria-expanded={menuPerfilAberto}
        >
          <ChevronDown />
        </button>

        {menuPerfilAberto && (
          <div className="profile-dropdown">
            <Link to="/perfil" onClick={() => setMenuPerfilAberto(false)}>Ver detalhes</Link>
            <Link to="/perfil/projetos" onClick={() => setMenuPerfilAberto(false)}>Ver atividades acadêmicas</Link>
            <Link to="/notificacoes" onClick={() => setMenuPerfilAberto(false)}>Notificações</Link>
          </div>
        )}
      </div>
    </header>
  );
}

// Moldura das telas internas: menu lateral + barra superior.
// `busca`/`setBusca` são opcionais (só o feed mostra a caixa de busca).
function Layout({ children, busca, setBusca }) {
  const usuario = getUsuarioLogado();
  const [sidebarAberta, setSidebarAberta] = useState(() => !ehTelaPequena());
  const [naoLidas, setNaoLidas] = useState(0);
  const { pathname } = useLocation();

  useEffect(() => {
    let ativo = true;
    contarNaoLidas()
      .then((n) => ativo && setNaoLidas(n))
      .catch(() => {});
    return () => {
      ativo = false;
    };
  }, [pathname]);

  return (
    <div className="app">
      <Sidebar aberto={sidebarAberta} setAberto={setSidebarAberta} usuario={usuario} naoLidas={naoLidas} />

      <div className="main-area">
        <Header
          sidebarAberta={sidebarAberta}
          setSidebarAberta={setSidebarAberta}
          busca={busca}
          setBusca={setBusca}
          usuario={usuario}
        />
        {children}
      </div>
    </div>
  );
}

export default Layout;
