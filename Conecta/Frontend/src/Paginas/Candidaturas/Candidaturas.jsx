import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Layout from "../../Componentes/Layout.jsx";
import {
  minhasCandidaturas, meuHistorico, cancelarCandidatura, baixarCertificado,
} from "../../services/api.js";
import { formatarData, formatarDataHora, ROTULO_STATUS } from "../../utils/formato.js";

function Candidaturas() {
  const [candidaturas, setCandidaturas] = useState([]);
  const [historico, setHistorico] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [aba, setAba] = useState("candidaturas");

  const carregar = useCallback(async () => {
    try {
      const [c, h] = await Promise.all([minhasCandidaturas(), meuHistorico()]);
      setCandidaturas(c);
      setHistorico(h);
      setErro("");
    } catch (e) {
      setErro(e.message);
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  async function cancelar(id) {
    if (!window.confirm("Cancelar esta candidatura?")) return;
    try {
      await cancelarCandidatura(id);
      await carregar();
    } catch (e) {
      setErro(e.message);
    }
  }

  async function baixar(id) {
    try {
      await baixarCertificado(id);
    } catch (e) {
      setErro(e.message);
    }
  }

  const certificados = candidaturas.filter((c) => c.certificado);

  return (
    <Layout>
      <main className="pg">
        <div className="pg-container">
          <h1>Minhas candidaturas</h1>
          <p className="pg-sub">Acompanhe suas inscrições, seu histórico de participação e seus certificados.</p>

          {erro && <p className="pg-erro">{erro}</p>}

          {historico && (
            <div className="pg-grid" style={{ marginBottom: 22 }}>
              <div className="pg-card" style={{ marginBottom: 0 }}>
                <div className="pg-numero">{candidaturas.length}</div>
                <span className="pg-muted">candidaturas enviadas</span>
              </div>
              <div className="pg-card" style={{ marginBottom: 0 }}>
                <div className="pg-numero">{historico.totalAtividades}</div>
                <span className="pg-muted">atividades em que participo</span>
              </div>
              <div className="pg-card" style={{ marginBottom: 0 }}>
                <div className="pg-numero">{historico.totalHoras} h</div>
                <span className="pg-muted">em certificados</span>
              </div>
            </div>
          )}

          <div className="pg-abas">
            {[
              ["candidaturas", "Candidaturas"],
              ["participacao", "Histórico de participação"],
              ["certificados", `Certificados (${certificados.length})`],
            ].map(([id, nome]) => (
              <button key={id} type="button" className={`pg-aba${aba === id ? " ativa" : ""}`} onClick={() => setAba(id)}>
                {nome}
              </button>
            ))}
          </div>

          {carregando && <p className="pg-vazio">Carregando...</p>}

          {aba === "candidaturas" && (
            <>
              {!carregando && candidaturas.length === 0 && (
                <div className="pg-card">
                  <p className="pg-vazio">
                    Você ainda não se candidatou a nenhuma atividade acadêmica. <Link to="/">Veja as vagas abertas no feed.</Link>
                  </p>
                </div>
              )}

              {candidaturas.map((c) => (
                <div key={c.id} className="pg-card">
                  <div className="pg-linha">
                    <div>
                      <h3><Link to={`/projetos/${c.projetoId}`}>{c.projetoNome}</Link></h3>
                      <span className="pg-muted">
                        {c.tipo} · {c.area} · enviada em {formatarDataHora(c.data)}
                      </span>
                    </div>
                    <span className="pg-espaco" />
                    <span className={`pg-badge ${c.status}`}>{ROTULO_STATUS[c.status]}</span>
                  </div>

                  {c.justificativa && (
                    <p className="pg-muted" style={{ marginBottom: 0 }}>
                      <strong>Mensagem do professor:</strong> {c.justificativa}
                    </p>
                  )}

                  {c.status === "pendente" && (
                    <div style={{ marginTop: 12 }}>
                      <button type="button" className="pg-btn perigo" onClick={() => cancelar(c.id)}>
                        Cancelar candidatura
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </>
          )}

          {aba === "participacao" && historico && (
            <>
              {historico.participacoes.length === 0 && (
                <div className="pg-card">
                  <p className="pg-vazio">Quando você for aprovado em uma atividade acadêmica, ele aparece aqui.</p>
                </div>
              )}
              {historico.participacoes.map((p) => (
                <div key={p.id} className="pg-card">
                  <div className="pg-linha">
                    <div>
                      <h3><Link to={`/projetos/${p.projetoId}`}>{p.projetoNome}</Link></h3>
                      <span className="pg-muted">{p.tipo} · {p.area} · desde {formatarData(p.data)}</span>
                    </div>
                    <span className="pg-espaco" />
                    <span className={`pg-badge ${p.projetoStatus}`}>
                      {p.projetoStatus === "ativo" ? "Em andamento" : "Encerrado"}
                    </span>
                  </div>
                </div>
              ))}
            </>
          )}

          {aba === "certificados" && (
            <>
              {!carregando && certificados.length === 0 && (
                <div className="pg-card">
                  <p className="pg-vazio">Nenhum certificado emitido ainda. Eles são liberados pelo professor responsável.</p>
                </div>
              )}
              {certificados.map((c) => (
                <div key={c.id} className="pg-card">
                  <div className="pg-linha">
                    <div>
                      <h3>{c.projetoNome}</h3>
                      <span className="pg-muted">
                        {c.tipo} · {c.certificado.cargaHoraria} h · emitido em {formatarData(c.certificado.dataEmissao)}
                      </span>
                    </div>
                    <span className="pg-espaco" />
                    <button type="button" className="pg-btn" onClick={() => baixar(c.certificado.id)}>
                      Baixar PDF
                    </button>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      </main>
    </Layout>
  );
}

export default Candidaturas;
