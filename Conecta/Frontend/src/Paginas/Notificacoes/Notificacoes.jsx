import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  listarNotificacoes, marcarNotificacaoLida, marcarTodasLidas, projetosSeguidos, alternarSeguir,
} from "../../services/api.js";
import { Icon, BellIcon, CalendarIcon, ClipboardIcon, FolderIcon } from "../../Componentes/Icones.jsx";
import "./Notificacoes.css";

// ícone e rótulo por tipo de aviso (tipo vem da coluna notificacao.tipo)
const TIPOS = {
  candidatura: { rotulo: "Candidatura", icone: <ClipboardIcon /> },
  prazo: { rotulo: "Prazo", icone: <CalendarIcon /> },
  certificado: {
    rotulo: "Certificado",
    icone: (
      <Icon>
        <circle cx="12" cy="9" r="6" />
        <path d="m8.5 14-1.5 7 5-3 5 3-1.5-7" />
      </Icon>
    ),
  },
  projeto: { rotulo: "Atividade acadêmica", icone: <FolderIcon /> },
  publicacao: {
    rotulo: "Publicação",
    icone: (
      <Icon>
        <path d="M4 5h16v11H9l-5 4Z" />
      </Icon>
    ),
  },
};
const TIPO_PADRAO = { rotulo: "Aviso", icone: <BellIcon /> };

const inicioDoDia = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

function grupoDaData(iso) {
  const dia = inicioDoDia(new Date(iso));
  const hoje = inicioDoDia(new Date());
  const diff = Math.round((hoje - dia) / 86400000);
  if (diff <= 0) return "Hoje";
  if (diff === 1) return "Ontem";
  if (diff < 7) return "Esta semana";
  return "Mais antigas";
}

const ORDEM_GRUPOS = ["Hoje", "Ontem", "Esta semana", "Mais antigas"];

function tempoRelativo(iso) {
  const d = new Date(iso);
  const min = Math.round((Date.now() - d.getTime()) / 60000);
  if (min < 1) return "agora";
  if (min < 60) return `há ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `há ${h} h`;
  const dias = Math.round(h / 24);
  if (dias < 7) return `há ${dias} ${dias === 1 ? "dia" : "dias"}`;
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }).replace(".", "");
}

function Notificacoes() {
  const navigate = useNavigate();
  const [notificacoes, setNotificacoes] = useState([]);
  const [projetos, setProjetos] = useState([]);
  const [aba, setAba] = useState("todas");
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  useEffect(() => {
    Promise.all([listarNotificacoes(), projetosSeguidos()])
      .then(([n, p]) => {
        setNotificacoes(n);
        setProjetos(p);
      })
      .catch((e) => setErro(e.message))
      .finally(() => setCarregando(false));
  }, []);

  const naoLidas = notificacoes.filter((n) => !n.lida).length;

  const grupos = useMemo(() => {
    const visiveis = aba === "nao-lidas" ? notificacoes.filter((n) => !n.lida) : notificacoes;
    const mapa = new Map();
    for (const n of visiveis) {
      const g = grupoDaData(n.data);
      if (!mapa.has(g)) mapa.set(g, []);
      mapa.get(g).push(n);
    }
    return ORDEM_GRUPOS.filter((g) => mapa.has(g)).map((g) => ({ nome: g, itens: mapa.get(g) }));
  }, [notificacoes, aba]);

  async function marcarLida(n) {
    if (n.lida) return;
    await marcarNotificacaoLida(n.id).catch(() => {});
    setNotificacoes((lista) => lista.map((x) => (x.id === n.id ? { ...x, lida: true } : x)));
  }

  async function abrir(n) {
    await marcarLida(n);
    if (n.link) navigate(n.link);
  }

  async function lerTodas() {
    await marcarTodasLidas().catch(() => {});
    setNotificacoes((lista) => lista.map((x) => ({ ...x, lida: true })));
  }

  async function desativar(id) {
    await alternarSeguir(id).catch(() => {});
    setProjetos((lista) => lista.filter((p) => p.id !== id));
  }

  return (
    <div className="notificacoes-page">
      <div className="notificacoes-container">
        <header className="notificacoes-header">
          <div>
            <h1>Notificações</h1>
            <p>Candidaturas, prazos, certificados e novidades das atividades acadêmicas que você acompanha.</p>
          </div>

          {naoLidas > 0 && (
            <button type="button" className="notificacao-ler-todas" onClick={lerTodas}>
              Marcar todas como lidas
            </button>
          )}
        </header>

        {erro && <p className="notificacoes-erro">{erro}</p>}

        <div className="notificacoes-layout">
          <section className="notificacoes-principal">
            <div className="notificacoes-abas" role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={aba === "todas"}
                className={aba === "todas" ? "ativa" : ""}
                onClick={() => setAba("todas")}
              >
                Todas <span>{notificacoes.length}</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={aba === "nao-lidas"}
                className={aba === "nao-lidas" ? "ativa" : ""}
                onClick={() => setAba("nao-lidas")}
              >
                Não lidas <span>{naoLidas}</span>
              </button>
            </div>

            {carregando && <p className="notificacoes-vazio">Carregando...</p>}

            {!carregando && grupos.length === 0 && (
              <div className="notificacoes-vazio caixa">
                <BellIcon />
                <strong>
                  {aba === "nao-lidas" ? "Tudo em dia" : "Nenhum aviso por aqui"}
                </strong>
                <span>
                  {aba === "nao-lidas"
                    ? "Você leu todas as notificações."
                    : "Quando algo acontecer nas suas atividades acadêmicas ou candidaturas, aparece aqui."}
                </span>
              </div>
            )}

            {grupos.map((grupo) => (
              <div key={grupo.nome} className="notificacoes-grupo">
                <h2>{grupo.nome}</h2>

                <ul>
                  {grupo.itens.map((n) => {
                    const tipo = TIPOS[n.tipo] || TIPO_PADRAO;
                    return (
                      <li key={n.id} className={`notificacao-item tipo-${n.tipo || "aviso"}${n.lida ? "" : " nao-lida"}`}>
                        <span className="notificacao-icone" aria-hidden="true">{tipo.icone}</span>

                        <button type="button" className="notificacao-corpo" onClick={() => abrir(n)}>
                          <span className="notificacao-meta">
                            {tipo.rotulo}
                            <i aria-hidden="true">·</i>
                            {tempoRelativo(n.data)}
                          </span>
                          <span className="notificacao-texto">{n.mensagem}</span>
                        </button>

                        {!n.lida && (
                          <button
                            type="button"
                            className="notificacao-lida"
                            onClick={() => marcarLida(n)}
                            aria-label="Marcar como lida"
                            title="Marcar como lida"
                          >
                            <span />
                          </button>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </section>

          <aside className="notificacoes-lateral">
            <h2>Atividades acadêmicas que você acompanha</h2>
            <p>Você recebe um aviso quando algum deles publicar uma novidade.</p>

            {!carregando && projetos.length === 0 && (
              <p className="notificacoes-lateral-vazio">
                Nenhuma atividade acadêmica acompanhada ainda. Ative as notificações pelo feed.
              </p>
            )}

            <ul>
              {projetos.map((p) => (
                <li key={p.id}>
                  <Link to={`/projetos/${p.id}`} className="seguido-nome">{p.nome}</Link>
                  <span className="seguido-info">{p.area} · {p.tipo}</span>
                  <button type="button" className="seguido-desativar" onClick={() => desativar(p.id)}>
                    Parar de acompanhar
                  </button>
                </li>
              ))}
            </ul>
          </aside>
        </div>
      </div>
    </div>
  );
}

export default Notificacoes;
