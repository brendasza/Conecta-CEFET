import { useCallback, useEffect, useState } from "react";
import {
  candidaturasDoProjeto, decidirCandidatura, emitirCertificado, baixarCertificado,
} from "../services/api.js";
import { formatarDataHora, ROTULO_STATUS } from "../utils/formato.js";
import "./Layout.css";

function CartaoCandidato({ c, onMudou }) {
  const [justificativa, setJustificativa] = useState(c.justificativa);
  const [horas, setHoras] = useState("");
  const [verMais, setVerMais] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState("");

  async function executar(acao) {
    setErro("");
    setOcupado(true);
    try {
      await acao();
      await onMudou();
    } catch (e) {
      setErro(e.message);
    } finally {
      setOcupado(false);
    }
  }

  const decidir = (status) => executar(() => decidirCandidatura(c.id, status, justificativa.trim()));
  const emitir = () => executar(() => emitirCertificado(c.id, Number(horas)));

  return (
    <div className="candidato">
      <div className="pg-linha">
        <div>
          <h3>{c.nome}</h3>
          <span className="pg-muted">
            Matrícula {c.matricula} · {c.curso}
            {c.periodo ? ` · ${c.periodo}` : ""}
          </span>
        </div>
        <span className="pg-espaco" />
        <span className={`pg-badge ${c.status}`}>{ROTULO_STATUS[c.status]}</span>
      </div>

      <p className="pg-muted" style={{ margin: "6px 0" }}>
        Candidatou-se em {formatarDataHora(c.data)}
      </p>

      <button type="button" className="candidato-mais" onClick={() => setVerMais((v) => !v)}>
        {verMais ? "Ocultar perfil" : "Ver perfil e carta"}
      </button>

      {verMais && (
        <div className="candidato-detalhes">
          <p><strong>E-mail:</strong> {c.email}</p>
          {c.bio && <p><strong>Sobre:</strong> {c.bio}</p>}
          <p><strong>Carta de apresentação:</strong> {c.carta || "Não escreveu carta."}</p>
          {c.interesses.length > 0 && (
            <p><strong>Interesses:</strong> {c.interesses.join(", ")}</p>
          )}
          {c.habilidades.length > 0 && (
            <p><strong>Habilidades:</strong> {c.habilidades.join(", ")}</p>
          )}
        </div>
      )}

      {c.status === "pendente" && (
        <>
          <textarea
            rows={2}
            maxLength={1000}
            value={justificativa}
            onChange={(e) => setJustificativa(e.target.value)}
            placeholder="Justificativa / mensagem para o aluno (opcional)"
          />
          <div className="pg-linha" style={{ marginTop: 10 }}>
            <button type="button" className="pg-btn" disabled={ocupado} onClick={() => decidir("aprovado")}>
              Aprovar
            </button>
            <button type="button" className="pg-btn perigo" disabled={ocupado} onClick={() => decidir("reprovado")}>
              Reprovar
            </button>
          </div>
        </>
      )}

      {c.status !== "pendente" && c.justificativa && (
        <p className="pg-muted"><strong>Justificativa:</strong> {c.justificativa}</p>
      )}

      {c.status === "reprovado" && (
        <div className="pg-linha" style={{ marginTop: 8 }}>
          <button type="button" className="pg-btn sec" disabled={ocupado} onClick={() => decidir("aprovado")}>
            Aprovar mesmo assim
          </button>
        </div>
      )}

      {c.status === "aprovado" && (
        <div className="pg-linha" style={{ marginTop: 10 }}>
          {c.certificado ? (
            <>
              <span className="pg-muted">Certificado emitido ({c.certificado.cargaHoraria} h)</span>
              <button
                type="button"
                className="pg-btn sec"
                onClick={() => executar(() => baixarCertificado(c.certificado.id))}
              >
                Baixar PDF
              </button>
            </>
          ) : (
            <>
              <input
                type="number"
                min="1"
                max="2000"
                style={{ width: 150 }}
                value={horas}
                onChange={(e) => setHoras(e.target.value)}
                placeholder="Carga horária (h)"
              />
              <button type="button" className="pg-btn sec" disabled={ocupado || !horas} onClick={emitir}>
                Emitir certificado
              </button>
              <button type="button" className="pg-btn perigo" disabled={ocupado} onClick={() => decidir("reprovado")}>
                Remover aprovação
              </button>
            </>
          )}
        </div>
      )}

      {erro && <p className="pg-erro">{erro}</p>}
    </div>
  );
}

function GerenciarCandidatos({ projeto, onMudou }) {
  const [lista, setLista] = useState(null);
  const [erro, setErro] = useState("");
  const [filtro, setFiltro] = useState("todos");

  const carregar = useCallback(async () => {
    try {
      setLista(await candidaturasDoProjeto(projeto.id));
      setErro("");
    } catch (e) {
      setErro(e.message);
    }
  }, [projeto.id]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  async function depoisDeMudar() {
    await carregar();
    await onMudou();
  }

  const visiveis = (lista || []).filter((c) => filtro === "todos" || c.status === filtro);

  return (
    <div className="projeto-secao-card pg-escopo">
      <div className="pg-linha" style={{ marginBottom: 12 }}>
        <h2 style={{ margin: 0 }}>Candidaturas</h2>
        <span className="pg-espaco" />
        <select value={filtro} onChange={(e) => setFiltro(e.target.value)}>
          <option value="todos">Todas</option>
          <option value="pendente">Pendentes</option>
          <option value="aprovado">Aprovadas</option>
          <option value="reprovado">Reprovadas</option>
        </select>
      </div>

      {projeto.vagasTotais != null && (
        <p className="pg-muted" style={{ marginTop: 0 }}>
          {projeto.vagasOcupadas} de {projeto.vagasTotais} vagas preenchidas
        </p>
      )}

      {erro && <p className="pg-erro">{erro}</p>}
      {lista && visiveis.length === 0 && <p className="pg-vazio">Nenhuma candidatura por aqui.</p>}

      {visiveis.map((c) => (
        <CartaoCandidato key={c.id} c={c} onMudou={depoisDeMudar} />
      ))}
    </div>
  );
}

export default GerenciarCandidatos;
