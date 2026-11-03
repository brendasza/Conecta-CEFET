import { useState } from "react";
import { criarHistorico, atualizarHistorico, excluirHistorico } from "../services/api.js";
import "./Inscricoes.css";

const anoAtual = () => new Date().getFullYear();
const VAZIO = () => ({ ano: String(anoAtual()), titulo: "", descricao: "" });

// Linha do tempo editável: o coordenador registra o ano e o que aconteceu no projeto
function HistoricoProjeto({ projeto, podeEditar, onMudou }) {
  const [novo, setNovo] = useState(VAZIO());
  const [editandoId, setEditandoId] = useState(null);
  const [rascunho, setRascunho] = useState(VAZIO());
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);

  async function executar(acao) {
    setErro("");
    setEnviando(true);
    try {
      await acao();
      await onMudou?.();
      return true;
    } catch (e) {
      setErro(e.message);
      return false;
    } finally {
      setEnviando(false);
    }
  }

  function validar(d) {
    if (!d.ano || Number(d.ano) < 1900 || Number(d.ano) > 2100) return "Informe um ano válido (ex: 2024).";
    if (!d.titulo.trim()) return "Escreva o que aconteceu.";
    return "";
  }

  async function handleAdicionar(evento) {
    evento.preventDefault();
    const problema = validar(novo);
    if (problema) return setErro(problema);
    const ok = await executar(() =>
      criarHistorico(projeto.id, { ano: Number(novo.ano), titulo: novo.titulo, descricao: novo.descricao })
    );
    if (ok) setNovo(VAZIO());
  }

  function iniciarEdicao(item) {
    setErro("");
    setEditandoId(item.id);
    setRascunho({ ano: String(item.ano), titulo: item.titulo, descricao: item.descricao });
  }

  async function handleSalvarEdicao(evento) {
    evento.preventDefault();
    const problema = validar(rascunho);
    if (problema) return setErro(problema);
    const ok = await executar(() =>
      atualizarHistorico(projeto.id, editandoId, {
        ano: Number(rascunho.ano), titulo: rascunho.titulo, descricao: rascunho.descricao,
      })
    );
    if (ok) setEditandoId(null);
  }

  function handleExcluir(item) {
    if (!window.confirm("Remover este item da linha do tempo?")) return;
    executar(() => excluirHistorico(projeto.id, item.id));
  }

  return (
    <div className="projeto-secao-card">
      <h2>Linha do tempo</h2>

      {podeEditar && (
        <form className="historico-form" onSubmit={handleAdicionar}>
          <input
            type="number"
            min="1900"
            max="2100"
            className="historico-ano"
            value={novo.ano}
            onChange={(e) => setNovo({ ...novo, ano: e.target.value })}
            aria-label="Ano"
            placeholder="Ano"
          />
          <input
            type="text"
            maxLength={150}
            className="historico-titulo"
            value={novo.titulo}
            onChange={(e) => setNovo({ ...novo, titulo: e.target.value })}
            placeholder="O que aconteceu? (ex: Primeira turma formada)"
          />
          <input
            type="text"
            className="historico-descricao"
            value={novo.descricao}
            onChange={(e) => setNovo({ ...novo, descricao: e.target.value })}
            placeholder="Detalhes (opcional)"
          />
          <button type="submit" className="pg-btn" disabled={enviando}>Adicionar</button>
        </form>
      )}

      {erro && <p className="erro-post">{erro}</p>}

      {projeto.timeline.length === 0 ? (
        <p className="vazio-mensagem">
          {podeEditar
            ? "Ainda não há registros. Adicione o ano e o que aconteceu no projeto."
            : "Ainda não há registros na linha do tempo."}
        </p>
      ) : (
        <div className="timeline-projeto">
          {projeto.timeline.map((item) => (
            <div key={item.id} className="timeline-projeto-item">
              <div className="timeline-projeto-marcador" />
              {editandoId === item.id ? (
                <form className="historico-form editando" onSubmit={handleSalvarEdicao}>
                  <input
                    type="number"
                    min="1900"
                    max="2100"
                    className="historico-ano"
                    value={rascunho.ano}
                    onChange={(e) => setRascunho({ ...rascunho, ano: e.target.value })}
                    aria-label="Ano"
                  />
                  <input
                    type="text"
                    maxLength={150}
                    className="historico-titulo"
                    value={rascunho.titulo}
                    onChange={(e) => setRascunho({ ...rascunho, titulo: e.target.value })}
                  />
                  <input
                    type="text"
                    className="historico-descricao"
                    value={rascunho.descricao}
                    onChange={(e) => setRascunho({ ...rascunho, descricao: e.target.value })}
                  />
                  <button type="submit" className="pg-btn" disabled={enviando}>Salvar</button>
                  <button type="button" className="pg-btn sec" onClick={() => setEditandoId(null)}>Cancelar</button>
                </form>
              ) : (
                <div className="timeline-projeto-conteudo">
                  <span className="timeline-projeto-data">{item.ano}</span>
                  <strong>{item.titulo}</strong>
                  {item.descricao && <p>{item.descricao}</p>}
                  {podeEditar && (
                    <div className="historico-acoes">
                      <button type="button" className="pg-btn sec" onClick={() => iniciarEdicao(item)}>Editar</button>
                      <button type="button" className="pg-btn perigo" onClick={() => handleExcluir(item)}>Remover</button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default HistoricoProjeto;
