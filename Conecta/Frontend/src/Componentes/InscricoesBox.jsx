import { useState } from "react";
import { atualizarInscricoes } from "../services/api.js";
import { paraInputData } from "../utils/formato.js";
import "./Inscricoes.css";

const montar = (p) => ({
  vagas: p.vagasTotais ?? "",
  inicioInscricao: paraInputData(p.inicioInscricao),
  fimInscricao: paraInputData(p.fimInscricao),
  requisitos: p.requisitos ?? "",
  criterios: p.criterios ?? "",
});

// Inscrições são opcionais: só quem abre vagas preenche esta parte (perfil do projeto, coordenador)
function InscricoesBox({ projeto, onMudou }) {
  const aberta = projeto.vagasTotais != null;
  const [editando, setEditando] = useState(false);
  const [dados, setDados] = useState(montar(projeto));
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);

  function abrirEdicao() {
    setDados(montar(projeto));
    setErro("");
    setEditando(true);
  }

  const mudar = (campo, valor) => setDados((d) => ({ ...d, [campo]: valor }));

  async function salvar(corpo) {
    setErro("");
    setSalvando(true);
    try {
      await atualizarInscricoes(projeto.id, corpo);
      setEditando(false);
      await onMudou?.();
    } catch (e) {
      setErro(e.message);
    } finally {
      setSalvando(false);
    }
  }

  function handleSubmit(evento) {
    evento.preventDefault();
    if (dados.vagas === "" && (dados.inicioInscricao || dados.fimInscricao)) {
      setErro("Informe o número de vagas para definir um período de inscrição.");
      return;
    }
    if (dados.vagas !== "" && (Number(dados.vagas) < 1 || Number(dados.vagas) > 1000)) {
      setErro("O número de vagas deve ficar entre 1 e 1000.");
      return;
    }
    if (dados.inicioInscricao && dados.fimInscricao && dados.fimInscricao <= dados.inicioInscricao) {
      setErro("O fim das inscrições deve ser depois do início.");
      return;
    }
    salvar({ ...dados, vagas: dados.vagas === "" ? "" : Number(dados.vagas) });
  }

  function handleFechar() {
    if (!window.confirm("Fechar as inscrições? As vagas e o período serão removidos.")) return;
    salvar({ vagas: "", inicioInscricao: "", fimInscricao: "", requisitos: projeto.requisitos, criterios: projeto.criterios });
  }

  return (
    <div className="projeto-secao-card inscricoes-box">
      <div className="inscricoes-topo">
        <h2>Inscrições</h2>
        {!editando && (
          <button type="button" className="pg-btn sec" onClick={abrirEdicao}>
            {aberta ? "Editar inscrições" : "Abrir inscrições"}
          </button>
        )}
      </div>

      {!editando && (
        <p className="inscricoes-resumo">
          {aberta
            ? "Esta atividade recebe candidaturas (vagas, período, requisitos e critérios aparecem no topo da página)."
            : "Esta atividade não tem inscrições abertas. Abra inscrições apenas se quiser receber candidaturas de alunos."}
        </p>
      )}

      {editando && (
        <form className="inscricoes-form" onSubmit={handleSubmit}>
          <div className="inscricoes-linha">
            <label>
              Número de vagas
              <input
                type="number"
                min="1"
                max="1000"
                value={dados.vagas}
                onChange={(e) => mudar("vagas", e.target.value)}
                placeholder="Ex: 5"
              />
            </label>
            <label>
              Início das inscrições
              <input
                type="datetime-local"
                value={dados.inicioInscricao}
                onChange={(e) => mudar("inicioInscricao", e.target.value)}
              />
            </label>
            <label>
              Fim das inscrições
              <input
                type="datetime-local"
                value={dados.fimInscricao}
                onChange={(e) => mudar("fimInscricao", e.target.value)}
              />
            </label>
          </div>

          <label>
            Requisitos para participar
            <textarea
              rows={2}
              value={dados.requisitos}
              onChange={(e) => mudar("requisitos", e.target.value)}
              placeholder="Ex: estar cursando a partir do 2º período"
            />
          </label>

          <label>
            Critérios de seleção
            <textarea
              rows={2}
              value={dados.criterios}
              onChange={(e) => mudar("criterios", e.target.value)}
              placeholder="Ex: análise da carta de apresentação e entrevista"
            />
          </label>

          {erro && <p className="erro-post">{erro}</p>}

          <div className="inscricoes-acoes">
            <button type="submit" className="pg-btn" disabled={salvando}>
              {salvando ? "Salvando..." : "Salvar inscrições"}
            </button>
            <button type="button" className="pg-btn sec" onClick={() => setEditando(false)} disabled={salvando}>
              Cancelar
            </button>
            {aberta && (
              <button type="button" className="pg-btn perigo" onClick={handleFechar} disabled={salvando}>
                Fechar inscrições
              </button>
            )}
          </div>
        </form>
      )}

      {!editando && erro && <p className="erro-post">{erro}</p>}
    </div>
  );
}

export default InscricoesBox;
