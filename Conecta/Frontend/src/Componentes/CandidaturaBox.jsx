import { useState } from "react";
import { candidatar, cancelarCandidatura } from "../services/api.js";
import { formatarDataHora, ROTULO_STATUS } from "../utils/formato.js";
import "./Layout.css";

// Por que o aluno não pode se candidatar agora (null = pode)
function motivoBloqueio(p) {
  const agora = new Date();
  if (p.status !== "ativo") return "Esta atividade acadêmica foi encerrada e não recebe mais inscrições.";
  if (p.vagasTotais == null) return "Esta atividade acadêmica não possui vagas abertas no momento.";
  if (p.inicioInscricao && agora < new Date(p.inicioInscricao)) {
    return `As inscrições começam em ${formatarDataHora(p.inicioInscricao)}.`;
  }
  if (p.fimInscricao && agora > new Date(p.fimInscricao)) {
    return `O prazo de inscrição terminou em ${formatarDataHora(p.fimInscricao)}.`;
  }
  if (p.vagasDisponiveis === 0) return "Todas as vagas desta atividade acadêmica já foram preenchidas.";
  return null;
}

function CandidaturaBox({ projeto, candidatura, onMudou }) {
  const [carta, setCarta] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");

  async function handleCandidatar(e) {
    e.preventDefault();
    setErro("");
    setEnviando(true);
    try {
      await candidatar(projeto.id, carta.trim());
      setCarta("");
      await onMudou();
    } catch (err) {
      setErro(err.message);
    } finally {
      setEnviando(false);
    }
  }

  async function handleCancelar() {
    if (!window.confirm("Cancelar sua candidatura?")) return;
    setErro("");
    try {
      await cancelarCandidatura(candidatura.id);
      await onMudou();
    } catch (err) {
      setErro(err.message);
    }
  }

  if (candidatura) {
    return (
      <div className="projeto-secao-card pg-escopo">
        <h2>Sua candidatura</h2>
        <div className="pg-linha">
          <span className={`pg-badge ${candidatura.status}`}>{ROTULO_STATUS[candidatura.status]}</span>
          {candidatura.status === "pendente" && (
            <>
              <span className="pg-muted">Aguardando análise do professor.</span>
              <span className="pg-espaco" />
              <button type="button" className="pg-btn perigo" onClick={handleCancelar}>
                Cancelar candidatura
              </button>
            </>
          )}
          {candidatura.status === "aprovado" && (
            <span className="pg-muted">Parabéns! Você participa desta atividade acadêmica.</span>
          )}
        </div>
        {candidatura.justificativa && (
          <p className="pg-muted" style={{ marginTop: 12 }}>
            <strong>Mensagem do professor:</strong> {candidatura.justificativa}
          </p>
        )}
        {erro && <p className="pg-erro">{erro}</p>}
      </div>
    );
  }

  const bloqueio = motivoBloqueio(projeto);

  return (
    <div className="projeto-secao-card pg-escopo">
      <h2>Candidatar-se</h2>

      {bloqueio ? (
        <p className="pg-vazio">{bloqueio}</p>
      ) : (
        <form onSubmit={handleCandidatar}>
          <p className="pg-muted" style={{ marginTop: 0 }}>
            {projeto.vagasDisponiveis} {projeto.vagasDisponiveis === 1 ? "vaga disponível" : "vagas disponíveis"}
            {projeto.fimInscricao && ` · inscrições até ${formatarDataHora(projeto.fimInscricao)}`}
          </p>
          <textarea
            rows={4}
            maxLength={3000}
            value={carta}
            onChange={(e) => setCarta(e.target.value)}
            placeholder="Carta de apresentação (opcional): conte por que você quer participar"
          />
          {erro && <p className="pg-erro">{erro}</p>}
          <div style={{ marginTop: 12 }}>
            <button type="submit" className="pg-btn" disabled={enviando}>
              {enviando ? "Enviando..." : "Enviar candidatura"}
            </button>
          </div>
        </form>
      )}
      {bloqueio && erro && <p className="pg-erro">{erro}</p>}
    </div>
  );
}

export default CandidaturaBox;
