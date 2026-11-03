import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import VoltarButton from "../../Componentes/VoltarButton.jsx";
import TagsInput from "../../Componentes/TagsInput.jsx";
import { atualizarMe, useUsuarioLogado } from "../../services/api.js";
import "./EditarPerfil.css";

const DEPARTAMENTOS = [
  "Docência (Professor)",
  "Administração",
  "Setor Pedagógico",
  "Coordenação de Curso",
  "Secretaria Acadêmica",
  "Biblioteca",
  "Outro",
];

const TITULACOES = [
  "Graduação",
  "Especialização",
  "Mestrado",
  "Doutorado",
  "Pós-Doutorado",
];

const CURSOS = [
  "Técnico em Informática",
  "Técnico em Automação",
  "Técnico em Telecomunicações",
  "Técnico em Enfermagem",
  "Outro",
];

const PERIODOS = ["1° Ano", "2° Ano", "3° Ano", "outro"];

// Carrega o usuário do banco e só então monta o formulário
function EditarPerfil() {
  const { usuario, carregando, erro } = useUsuarioLogado();

  if (carregando) {
    return (
      <div className="editar-perfil-page">
        <div className="editar-perfil-card">
          <p>Carregando perfil...</p>
        </div>
      </div>
    );
  }

  if (!usuario) {
    return erro ? (
      <div className="editar-perfil-page">
        <div className="editar-perfil-card">
          <VoltarButton to="/perfil" texto="Voltar para o perfil" />
          <p className="editar-perfil-erro">{erro}</p>
        </div>
      </div>
    ) : (
      <Navigate to="/login" replace />
    );
  }

  return <FormularioPerfil usuario={usuario} />;
}

function FormularioPerfil({ usuario }) {
  const navigate = useNavigate();
  const ehProfessor = usuario?.tipo === "funcionario";

  const [dados, setDados] = useState({
    nome: usuario?.nome || "",
    curso: usuario?.curso || "",
    periodo: usuario?.periodo || "",
    departamento: usuario?.departamento || "",
    titulacao: usuario?.titulacao || "",
    areaAtuacao: usuario?.areaAtuacao || "",
    bio: usuario?.bio || "",
  });
  const [interesses, setInteresses] = useState(usuario?.interesses || []);
  const [habilidades, setHabilidades] = useState(usuario?.habilidades || []);
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);

  function handleChange(evento) {
    const { name, value } = evento.target;
    setDados((atual) => ({ ...atual, [name]: value }));
  }

  // Mantém o valor já salvo caso ele não esteja na lista de opções
  const cursos =
    !dados.curso || CURSOS.includes(dados.curso)
      ? CURSOS
      : [dados.curso, ...CURSOS];

  async function handleSubmit(evento) {
    evento.preventDefault();
    setErro("");

    if (!dados.nome.trim()) {
      setErro("O nome não pode ficar vazio.");
      return;
    }

    const comuns = {
      nome: dados.nome.trim(),
      bio: dados.bio.trim(),
      interesses,
      habilidades,
    };

    let campos;

    if (ehProfessor) {
      if (!dados.departamento || !dados.titulacao || !dados.areaAtuacao.trim()) {
        setErro("Preencha departamento, titulação e área de atuação.");
        return;
      }
      campos = {
        ...comuns,
        departamento: dados.departamento,
        titulacao: dados.titulacao,
        areaAtuacao: dados.areaAtuacao.trim(),
      };
    } else {
      if (!dados.curso || !dados.periodo) {
        setErro("Preencha curso e período.");
        return;
      }
      campos = { ...comuns, curso: dados.curso, periodo: dados.periodo };
    }

    setSalvando(true);
    try {
      await atualizarMe(campos);
      navigate("/perfil");
    } catch (e) {
      setErro(e.message);
      setSalvando(false);
    }
  }

  return (
    <div className="editar-perfil-page">
      <div className="editar-perfil-card">
        <VoltarButton to="/perfil" texto="Voltar para o perfil" />

        <h1>Editar perfil</h1>
        <p className="editar-perfil-subtitulo">
          Atualize suas informações. Elas aparecem na sua página de perfil.
        </p>

        <form onSubmit={handleSubmit} className="editar-perfil-form">
          <label className="editar-perfil-campo">
            Nome completo
            <input
              type="text"
              name="nome"
              value={dados.nome}
              onChange={handleChange}
            />
          </label>

          <label className="editar-perfil-campo">
            E-mail
            <input type="email" value={usuario.email} readOnly />
            <small>O e-mail não pode ser alterado.</small>
          </label>

          {ehProfessor ? (
            <>
              <div className="editar-perfil-linha">
                <label className="editar-perfil-campo">
                  SIAPE
                  <input type="text" value={usuario.siape || ""} readOnly />
                </label>

                <label className="editar-perfil-campo">
                  Titulação
                  <select
                    name="titulacao"
                    value={dados.titulacao}
                    onChange={handleChange}
                  >
                    <option value="" disabled>
                      Selecione
                    </option>
                    {TITULACOES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="editar-perfil-linha">
                <label className="editar-perfil-campo">
                  Departamento
                  <select
                    name="departamento"
                    value={dados.departamento}
                    onChange={handleChange}
                  >
                    <option value="" disabled>
                      Selecione
                    </option>
                    {DEPARTAMENTOS.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="editar-perfil-campo">
                  Área de atuação
                  <input
                    type="text"
                    name="areaAtuacao"
                    value={dados.areaAtuacao}
                    onChange={handleChange}
                  />
                </label>
              </div>
            </>
          ) : (
            <>
              <label className="editar-perfil-campo">
                Matrícula
                <input type="text" value={usuario.matricula || ""} readOnly />
              </label>

              <div className="editar-perfil-linha">
                <label className="editar-perfil-campo">
                  Curso
                  <select
                    name="curso"
                    value={dados.curso}
                    onChange={handleChange}
                  >
                    <option value="" disabled>
                      Selecione
                    </option>
                    {cursos.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="editar-perfil-campo">
                  Período
                  <select
                    name="periodo"
                    value={dados.periodo}
                    onChange={handleChange}
                  >
                    <option value="" disabled>
                      Selecione
                    </option>
                    {PERIODOS.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </>
          )}

          <label className="editar-perfil-campo">
            Sobre mim
            <textarea
              name="bio"
              value={dados.bio}
              onChange={handleChange}
              maxLength={400}
              rows={4}
              placeholder="Conte um pouco sobre você, seus interesses e objetivos"
            />
            <small>{dados.bio.length}/400</small>
          </label>

          <div className="editar-perfil-campo">
            {ehProfessor ? "Linhas de pesquisa" : "Áreas de interesse"}
            <TagsInput
              tags={interesses}
              onChange={setInteresses}
              maximo={10}
              placeholder="Ex: Inteligência Artificial"
            />
          </div>

          <div className="editar-perfil-campo">
            {ehProfessor ? "Disciplinas ministradas" : "Habilidades"}
            <TagsInput
              tags={habilidades}
              onChange={setHabilidades}
              maximo={10}
              placeholder={ehProfessor ? "Ex: Programação I" : "Ex: React"}
            />
          </div>

          {erro && <p className="editar-perfil-erro">{erro}</p>}

          <div className="editar-perfil-botoes">
            <button
              type="button"
              className="editar-perfil-cancelar"
              onClick={() => navigate("/perfil")}
            >
              Cancelar
            </button>
            <button type="submit" className="editar-perfil-salvar" disabled={salvando}>
              {salvando ? "Salvando..." : "Salvar alterações"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default EditarPerfil;