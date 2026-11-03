import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Layout from "../../Componentes/Layout.jsx";
import {
  listarAgenda, minhaAgenda, criarLembrete, excluirLembrete, getUsuarioLogado, ehAluno, podeCoordenar,
  criarEventoInstitucional, excluirEventoInstitucional,
} from "../../services/api.js";
import { formatarDataHora } from "../../utils/formato.js";
import "./Agenda.css";

const DIAS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

// cor do ponto: dinâmica, vem do tipo do item (evento do ADM, período letivo, prazo ou lembrete)
const classeAgenda = (e) => `${e.origem}${e.categoria ? ` ${e.categoria}` : ""}`;

const ROTULO_ORIGEM = {
  calendario: "Calendário",
  projeto: "Atividade acadêmica",
  periodo: "Ano letivo",
  pessoal: "Meu lembrete",
};

const chaveDia = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

// Todos os dias entre início e fim do evento (para eventos de vários dias)
function diasDoEvento(e) {
  const ini = new Date(e.inicio);
  const fim = new Date(e.fim || e.inicio);
  const dias = [];
  const d = new Date(ini.getFullYear(), ini.getMonth(), ini.getDate());
  const limite = new Date(fim.getFullYear(), fim.getMonth(), fim.getDate());
  while (d <= limite && dias.length < 90) {
    dias.push(chaveDia(d));
    d.setDate(d.getDate() + 1);
  }
  return dias;
}

function Agenda() {
  const hoje = new Date();
  const [mes, setMes] = useState(new Date(hoje.getFullYear(), hoje.getMonth(), 1));
  const [eventos, setEventos] = useState([]);
  const [selecionado, setSelecionado] = useState(chaveDia(hoje));
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  // agenda pessoal (aluno e professor): lembretes próprios sobrepostos ao calendário oficial
  const usuario = getUsuarioLogado();
  const professor = podeCoordenar(usuario); // professor e administrador
  const aluno = ehAluno(usuario);
  const temLembretes = aluno || professor;
  const [pessoais, setPessoais] = useState([]);
  const [lembrete, setLembrete] = useState({ titulo: "", descricao: "" });

  // professor: evento institucional (entra no calendário de todos)
  const [evento, setEvento] = useState({ titulo: "", descricao: "", ate: "" });

  const carregarPessoais = useCallback(() => {
    if (!temLembretes) return;
    minhaAgenda().then(setPessoais).catch((e) => setErro(e.message));
  }, [temLembretes]);

  const carregarEventos = useCallback(() => {
    listarAgenda()
      .then(setEventos)
      .catch((e) => setErro(e.message))
      .finally(() => setCarregando(false));
  }, []);

  useEffect(() => {
    carregarEventos();
    carregarPessoais();
  }, [carregarEventos, carregarPessoais]);

  async function adicionarLembrete(e) {
    e.preventDefault();
    if (!lembrete.titulo.trim()) return;
    try {
      await criarLembrete({
        titulo: lembrete.titulo,
        descricao: lembrete.descricao,
        inicio: `${selecionado}T08:00`,
        fim: `${selecionado}T08:00`,
      });
      setLembrete({ titulo: "", descricao: "" });
      carregarPessoais();
    } catch (err) {
      setErro(err.message);
    }
  }

  async function adicionarEvento(e) {
    e.preventDefault();
    if (!evento.titulo.trim()) return;
    if (evento.ate && evento.ate < selecionado) {
      setErro("A data final do evento não pode ser antes do dia selecionado.");
      return;
    }
    setErro("");
    try {
      await criarEventoInstitucional({
        titulo: evento.titulo,
        descricao: evento.descricao,
        inicio: `${selecionado}T00:00`,
        fim: `${evento.ate || selecionado}T23:59`,
      });
      setEvento({ titulo: "", descricao: "", ate: "" });
      carregarEventos();
    } catch (err) {
      setErro(err.message);
    }
  }

  // remove lembrete pessoal ou evento institucional criado pelo próprio professor
  async function removerLembrete(item) {
    try {
      if (item.origem === "pessoal") {
        await excluirLembrete(item.itemId);
        carregarPessoais();
      } else {
        await excluirEventoInstitucional(item.eventoId);
        carregarEventos();
      }
    } catch (err) {
      setErro(err.message);
    }
  }

  // calendário oficial + lembretes pessoais (sem alterar os dados globais)
  const todos = useMemo(
    () => [...eventos, ...pessoais].sort((a, b) => (a.inicio < b.inicio ? -1 : 1)),
    [eventos, pessoais]
  );

  const porDia = useMemo(() => {
    const mapa = new Map();
    for (const e of todos) {
      for (const dia of diasDoEvento(e)) {
        if (!mapa.has(dia)) mapa.set(dia, []);
        mapa.get(dia).push(e);
      }
    }
    return mapa;
  }, [todos]);

  const celulas = useMemo(() => {
    const primeiro = new Date(mes.getFullYear(), mes.getMonth(), 1);
    const total = new Date(mes.getFullYear(), mes.getMonth() + 1, 0).getDate();
    const lista = Array(primeiro.getDay()).fill(null);
    for (let d = 1; d <= total; d++) lista.push(new Date(mes.getFullYear(), mes.getMonth(), d));
    return lista;
  }, [mes]);

  const tituloMes = mes.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  const doDia = porDia.get(selecionado) || [];

  const proximos = todos
    .filter((e) => new Date(e.fim || e.inicio) >= hoje)
    .slice(0, 6);

  function mudarMes(delta) {
    setMes(new Date(mes.getFullYear(), mes.getMonth() + delta, 1));
  }

  return (
    <Layout>
      <main className="pg">
        <div className="pg-container">
          <h1>Agenda</h1>
          <p className="pg-sub">
            Calendário acadêmico, ano letivo e prazos de inscrição das atividades acadêmicas
            {temLembretes ? ", além dos seus lembretes pessoais" : ""}
            {professor ? " e dos eventos institucionais que você cadastrar" : ""}.
          </p>

          {erro && <p className="pg-erro">{erro}</p>}

          <div className="agenda-layout">
            <section className="pg-card">
              <div className="pg-linha" style={{ marginBottom: 14 }}>
                <button type="button" className="pg-btn sec" onClick={() => mudarMes(-1)}>‹</button>
                <h2 style={{ margin: 0, textTransform: "capitalize" }}>{tituloMes}</h2>
                <button type="button" className="pg-btn sec" onClick={() => mudarMes(1)}>›</button>
                <span className="pg-espaco" />
                <button
                  type="button"
                  className="pg-btn sec"
                  onClick={() => {
                    setMes(new Date(hoje.getFullYear(), hoje.getMonth(), 1));
                    setSelecionado(chaveDia(hoje));
                  }}
                >
                  Hoje
                </button>
              </div>

              <div className="agenda-grade">
                {DIAS.map((d) => (
                  <div key={d} className="agenda-cab">{d}</div>
                ))}

                {celulas.map((data, i) => {
                  if (!data) return <div key={`v${i}`} className="agenda-vazia" />;
                  const chave = chaveDia(data);
                  const itens = porDia.get(chave) || [];
                  const ehHoje = chave === chaveDia(hoje);

                  return (
                    <button
                      type="button"
                      key={chave}
                      className={`agenda-dia${ehHoje ? " hoje" : ""}${chave === selecionado ? " selecionado" : ""}`}
                      onClick={() => setSelecionado(chave)}
                    >
                      <span>{data.getDate()}</span>
                      <div className="agenda-pontos">
                        {itens.slice(0, 3).map((e) => (
                          <i key={e.id} className={classeAgenda(e)} />
                        ))}
                      </div>
                    </button>
                  );
                })}
              </div>

              <p className="pg-muted agenda-legendas" style={{ marginBottom: 0 }}>
                <span><i className="agenda-legenda calendario" /> Eventos institucionais</span>
                <span><i className="agenda-legenda periodo aulas" /> Início/fim das aulas</span>
                <span><i className="agenda-legenda periodo semestre" /> Semestre</span>
                <span><i className="agenda-legenda periodo recesso" /> Recesso</span>
                <span><i className="agenda-legenda projeto" /> Prazos de atividades</span>
                {temLembretes && <span><i className="agenda-legenda pessoal" /> Meus lembretes</span>}
              </p>
            </section>

            <aside>
              <div className="pg-card">
                <h2>
                  {new Date(`${selecionado}T12:00:00`).toLocaleDateString("pt-BR", {
                    day: "numeric", month: "long",
                  })}
                </h2>
                {doDia.length === 0 ? (
                  <p className="pg-vazio">Nada marcado para este dia.</p>
                ) : (
                  doDia.map((e) => <ItemAgenda key={e.id} e={e} onRemover={removerLembrete} />)
                )}

                {temLembretes && (
                  <form className="agenda-lembrete" onSubmit={adicionarLembrete}>
                    <strong>Novo lembrete neste dia</strong>
                    <input
                      placeholder="Título (ex: entregar relatório)"
                      value={lembrete.titulo}
                      maxLength={150}
                      onChange={(e) => setLembrete({ ...lembrete, titulo: e.target.value })}
                    />
                    <input
                      placeholder="Observação (opcional)"
                      value={lembrete.descricao}
                      onChange={(e) => setLembrete({ ...lembrete, descricao: e.target.value })}
                    />
                    <button type="submit" className="pg-btn">Adicionar à minha agenda</button>
                  </form>
                )}

                {professor && (
                  <form className="agenda-lembrete" onSubmit={adicionarEvento}>
                    <strong>Novo evento institucional neste dia</strong>
                    <input
                      placeholder="Título (ex: Semana de Extensão)"
                      value={evento.titulo}
                      maxLength={150}
                      onChange={(e) => setEvento({ ...evento, titulo: e.target.value })}
                    />
                    <input
                      placeholder="Descrição (opcional)"
                      value={evento.descricao}
                      onChange={(e) => setEvento({ ...evento, descricao: e.target.value })}
                    />
                    <label className="agenda-ate">
                      Termina em (opcional)
                      <input
                        type="date"
                        min={selecionado}
                        value={evento.ate}
                        onChange={(e) => setEvento({ ...evento, ate: e.target.value })}
                      />
                    </label>
                    <button type="submit" className="pg-btn">Publicar no calendário</button>
                    <span className="pg-muted">Visível para todos. Você só pode remover os eventos que criou.</span>
                  </form>
                )}
              </div>

              <div className="pg-card">
                <h2>Próximos</h2>
                {carregando && <p className="pg-vazio">Carregando...</p>}
                {!carregando && proximos.length === 0 && <p className="pg-vazio">Nenhum evento à vista.</p>}
                {proximos.map((e) => <ItemAgenda key={e.id} e={e} mostrarData onRemover={removerLembrete} />)}
              </div>
            </aside>
          </div>
        </div>
      </main>
    </Layout>
  );
}

function ItemAgenda({ e, mostrarData = false, onRemover }) {
  const conteudo = (
    <>
      <span className={`agenda-etiqueta ${classeAgenda(e)}`}>
        {ROTULO_ORIGEM[e.origem] ?? "Calendário"}
      </span>
      <strong>{e.titulo}</strong>
      {(mostrarData || e.origem === "projeto" || e.origem === "pessoal") && e.origem !== "periodo" && (
        <span className="pg-muted">{formatarDataHora(e.inicio)}</span>
      )}
      {e.descricao && <span className="pg-muted">{e.descricao}</span>}
      {(e.origem === "pessoal" || (e.origem === "calendario" && e.meu)) && onRemover && (
        <button type="button" className="pg-btn perigo agenda-remover" onClick={() => onRemover(e)}>Remover</button>
      )}
    </>
  );

  return e.projetoId ? (
    <Link to={`/projetos/${e.projetoId}`} className="agenda-item">{conteudo}</Link>
  ) : (
    <div className="agenda-item">{conteudo}</div>
  );
}

export default Agenda;
