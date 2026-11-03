import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import VoltarButton from "../../Componentes/VoltarButton.jsx";
import TagsInput from "../../Componentes/TagsInput.jsx";
import {
  getUsuarioLogado, podeCoordenar, buscarOpcoes, buscarProjeto, criarProjeto, atualizarProjeto,
} from "../../services/api.js";
import "./CriarProjeto.css";

const TIPOS_PADRAO = ["Extensão", "Iniciação Científica", "Monitoria", "Ensino", "Pesquisa"];
const MINIMO_TAGS = 3;

const VAZIO = {
  nome: "",
  objetivo: "",
  descricao: "",
  area: "",
  tipo: TIPOS_PADRAO[0],
  tags: [],
};

// Serve para criar (/projetos/criar) e para editar (/projetos/:id/editar)
function CriarProjeto() {
  const navigate = useNavigate();
  const { id } = useParams();
  const editando = Boolean(id);
  const usuarioLogado = getUsuarioLogado();

  const [dados, setDados] = useState(VAZIO);
  const [opcoes, setOpcoes] = useState({ areas: [], tipos: TIPOS_PADRAO });
  const [carregando, setCarregando] = useState(editando);
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    buscarOpcoes()
      .then((o) => setOpcoes({ areas: o.areas, tipos: o.tipos.length ? o.tipos : TIPOS_PADRAO }))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!editando) return;
    buscarProjeto(id)
      .then(({ projeto }) => {
        const souCoordenador = projeto.coordenadores.some((c) => c.id === usuarioLogado?.id);
        if (!souCoordenador || projeto.status !== "ativo") {
          setErro("Você não pode editar esta atividade acadêmica.");
          return;
        }
        setDados({
          nome: projeto.nome,
          objetivo: projeto.objetivo,
          descricao: projeto.descricao,
          area: projeto.area,
          tipo: projeto.tipo,
          tags: projeto.tags,
        });
      })
      .catch((e) => setErro(e.message))
      .finally(() => setCarregando(false));
  }, [editando, id, usuarioLogado?.id]);

  function handleChange(campo, valor) {
    setDados((atual) => ({ ...atual, [campo]: valor }));
  }

  async function handleSubmit(evento) {
    evento.preventDefault();
    setErro("");

    if (!dados.nome.trim() || !dados.objetivo.trim() || !dados.area.trim()) {
      setErro("Preencha nome, objetivo e área da atividade acadêmica.");
      return;
    }
    if (dados.tags.length < MINIMO_TAGS) {
      setErro(`Adicione pelo menos ${MINIMO_TAGS} tags que descrevam a atividade (ex: robótica, educação, IoT).`);
      return;
    }

    setEnviando(true);
    try {
      const corpo = {
        ...dados,
        nome: dados.nome.trim(),
        objetivo: dados.objetivo.trim(),
        area: dados.area.trim(),
      };
      const projeto = editando ? await atualizarProjeto(id, corpo) : await criarProjeto(corpo);
      navigate(`/projetos/${projeto.id}`);
    } catch (e) {
      setErro(e.message);
      setEnviando(false);
    }
  }

  if (!podeCoordenar(usuarioLogado)) {
    return (
      <div className="criar-projeto-page">
        <div className="criar-projeto-card acesso-negado">
          <VoltarButton />
          <h1>Acesso restrito</h1>
          <p>Apenas professores e administradores podem criar atividades acadêmicas. Se você é professor e está vendo esta mensagem, verifique se fez login com a conta correta.</p>
        </div>
      </div>
    );
  }

  if (carregando) {
    return (
      <div className="criar-projeto-page">
        <div className="criar-projeto-card"><p>Carregando...</p></div>
      </div>
    );
  }

  return (
    <div className="criar-projeto-page">
      <div className="criar-projeto-card">
        <VoltarButton
          to={editando ? `/projetos/${id}` : "/perfil"}
          texto={editando ? "Voltar para a atividade acadêmica" : "Voltar para o perfil"}
        />

        <h1>{editando ? "Editar atividade acadêmica" : "Criar nova atividade acadêmica"}</h1>
        <p className="subtitulo">
          {editando
            ? "Atualize as informações da atividade acadêmica. Quem a acompanha será avisado."
            : "Preencha as informações abaixo para criar uma nova atividade acadêmica. Vagas e inscrições são opcionais: você pode configurá-las depois, no perfil da atividade."}
        </p>

        <form onSubmit={handleSubmit} className="criar-projeto-form">
          <label>
            Nome da atividade acadêmica
            <input
              type="text"
              value={dados.nome}
              onChange={(e) => handleChange("nome", e.target.value)}
              placeholder="Ex: Robótica Educacional"
            />
          </label>

          <label>
            Objetivo
            <textarea
              value={dados.objetivo}
              onChange={(e) => handleChange("objetivo", e.target.value)}
              placeholder="Qual o principal objetivo da atividade acadêmica?"
              rows={3}
            />
          </label>

          <label>
            Descrição
            <textarea
              value={dados.descricao}
              onChange={(e) => handleChange("descricao", e.target.value)}
              placeholder="Descreva a atividade acadêmica com mais detalhes"
              rows={4}
            />
          </label>

          <div className="form-row">
            <label>
              Área
              <input
                type="text"
                list="lista-areas"
                value={dados.area}
                onChange={(e) => handleChange("area", e.target.value)}
                placeholder="Ex: Tecnologia"
              />
              <datalist id="lista-areas">
                {opcoes.areas.map((a) => <option key={a} value={a} />)}
              </datalist>
            </label>

            <label>
              Tipo
              <select value={dados.tipo} onChange={(e) => handleChange("tipo", e.target.value)}>
                {opcoes.tipos.map((tipo) => (
                  <option key={tipo} value={tipo}>{tipo}</option>
                ))}
              </select>
            </label>
          </div>

          <div className="campo-tags">
            Tags da atividade (mínimo {MINIMO_TAGS})
            <TagsInput
              tags={dados.tags}
              onChange={(novas) => handleChange("tags", novas)}
              minimo={MINIMO_TAGS}
              maximo={8}
              placeholder="Ex: robótica, educação, Arduino"
            />
          </div>

          {erro && <p className="erro-mensagem">{erro}</p>}

          <button type="submit" className="criar-projeto-submit" disabled={enviando}>
            {enviando ? "Salvando..." : editando ? "Salvar alterações" : "Criar atividade acadêmica"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default CriarProjeto;
