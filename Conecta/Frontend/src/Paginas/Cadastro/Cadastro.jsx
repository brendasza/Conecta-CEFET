import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { cadastrar } from "../../services/api.js";
import "./Cadastro.css";

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
 "Técnico em Enfermgem",

  "Outro",
];

const valorInicial = {
  nome: "",
  email: "",
  senha: "",
  confirmarSenha: "",
  matricula: "",
  curso: "",
  periodo: "",
  
  siape: "",
  departamento: "",
  titulacao: "",
  areaAtuacao: "",
};

function Cadastro() {
  const navigate = useNavigate();

  const [tipoUsuario, setTipoUsuario] = useState("");
  const [dados, setDados] = useState(valorInicial);
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);

  function handleChange(evento) {
    const { name, value } = evento.target;
    setDados((anterior) => ({ ...anterior, [name]: value }));
  }

  function handleTipoUsuarioChange(evento) {
    setTipoUsuario(evento.target.value);
  }

  async function handleSubmit(evento) {
    evento.preventDefault();
    setErro("");

    if (!tipoUsuario) {
      setErro("Selecione o tipo de usuário.");
      return;
    }

    if (!dados.nome || !dados.email || !dados.senha || !dados.confirmarSenha) {
      setErro("Preencha todos os campos obrigatórios.");
      return;
    }

    if (tipoUsuario === "aluno" && (!dados.matricula || !dados.curso || !dados.periodo)) {
      setErro("Preencha os dados acadêmicos (matrícula, curso e período).");
      return;
    }

    if (
      tipoUsuario === "funcionario" &&
      (!dados.siape || !dados.departamento || !dados.titulacao || !dados.areaAtuacao)
    ) {
      setErro("Preencha os dados profissionais (SIAPE, departamento, titulação e área de atuação).");
      return;
    }

    if (dados.senha !== dados.confirmarSenha) {
      setErro("As senhas não coincidem.");
      return;
    }

    const novoUsuario = {
      tipo: tipoUsuario,
      nome: dados.nome.trim(),
      email: dados.email.trim(),
      senha: dados.senha,
      ...(tipoUsuario === "aluno"
        ? {
            matricula: dados.matricula,
            curso: dados.curso,
            periodo: dados.periodo,
          }
        : {
            siape: dados.siape,
            departamento: dados.departamento,
            titulacao: dados.titulacao,
            areaAtuacao: dados.areaAtuacao,
          }),
    };

    setEnviando(true);
    try {
      await cadastrar(novoUsuario);
      navigate("/login", { state: { cadastroSucesso: true } });
    } catch (e) {
      setErro(e.message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="cadastro-page">
      <div className="cadastro-card">

        <img
          src="/images/logo.png"
          alt="Conecta CEFET"
          className="login-logo"
        />
        <div className="cadastro-header">
          <h1>Crie sua conta</h1>

          <p>
            Cadastre-se para acessar o Conecta CEFET.
          </p>
        </div>

        <form className="cadastro-form" onSubmit={handleSubmit}>

          <div className="cadastro-field">
            <label htmlFor="nome">Nome completo</label>

            <input
              id="nome"
              name="nome"
              type="text"
              placeholder="Digite seu nome completo"
              value={dados.nome}
              onChange={handleChange}
            />
          </div>

          <div className="cadastro-field">
            <label htmlFor="cadastro-email">E-mail</label>

            <input
              id="cadastro-email"
              name="email"
              type="email"
              placeholder="Digite seu e-mail"
              value={dados.email}
              onChange={handleChange}
            />
          </div>

          <div className="cadastro-field">
            <label htmlFor="perfil">Tipo de usuário</label>

            <select
              id="perfil"
              name="perfil"
              value={tipoUsuario}
              onChange={handleTipoUsuarioChange}
            >
              <option value="" disabled>
                Selecione seu perfil
              </option>

              <option value="aluno">
                Aluno
              </option>

              <option value="funcionario">
                Professor
              </option>
            </select>
          </div>

          {tipoUsuario === "aluno" && (
            <div className="cadastro-subsection">
              <h3 className="cadastro-subsection-title">Dados acadêmicos</h3>

              <div className="cadastro-field">
                <label htmlFor="matricula">Matrícula</label>

                <input
                  id="matricula"
                  name="matricula"
                  type="text"
                  placeholder="Digite sua matrícula"
                  value={dados.matricula}
                  onChange={handleChange}
                />
              </div>

              <div className="cadastro-row">
                <div className="cadastro-field">
                  <label htmlFor="curso">Curso</label>

                  <select
                    id="curso"
                    name="curso"
                    value={dados.curso}
                    onChange={handleChange}
                  >
                    <option value="" disabled>
                      Selecione o curso
                    </option>

                    {CURSOS.map((curso) => (
                      <option key={curso} value={curso}>
                        {curso}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="cadastro-field">
                  <label htmlFor="periodo">Período</label>

                  <select
                    id="periodo"
                    name="periodo"
                    value={dados.periodo}
                    onChange={handleChange}
                  >
                    <option value="" disabled>
                      Selecione o período
                    </option>

                    {["1° Ano", "2° Ano", "3° Ano", "outro"].map(
                      (serie) => (
                        <option key={serie} value={serie}>
                          {serie}
                        </option>
                      )
                    )}
                  </select>
                </div>
              </div>
            </div>
          )}

          {tipoUsuario === "funcionario" && (
            <div className="cadastro-subsection">
              <h3 className="cadastro-subsection-title">Dados profissionais</h3>

              <div className="cadastro-row">
                <div className="cadastro-field">
                  <label htmlFor="siape">SIAPE</label>

                  <input
                    id="siape"
                    name="siape"
                    type="text"
                    placeholder="Digite seu SIAPE"
                    value={dados.siape}
                    onChange={handleChange}
                  />
                </div>

                <div className="cadastro-field">
                  <label htmlFor="departamento">Departamento</label>

                  <select
                    id="departamento"
                    name="departamento"
                    value={dados.departamento}
                    onChange={handleChange}
                  >
                    <option value="" disabled>
                      Selecione o departamento
                    </option>

                    {DEPARTAMENTOS.map((departamento) => (
                      <option key={departamento} value={departamento}>
                        {departamento}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="cadastro-row">
                <div className="cadastro-field">
                  <label htmlFor="titulacao">Titulação</label>

                  <select
                    id="titulacao"
                    name="titulacao"
                    value={dados.titulacao}
                    onChange={handleChange}
                  >
                    <option value="" disabled>
                      Selecione a titulação
                    </option>

                    {TITULACOES.map((titulacao) => (
                      <option key={titulacao} value={titulacao}>
                        {titulacao}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="cadastro-field">
                  <label htmlFor="areaAtuacao">Área de atuação</label>

                  <input
                    id="areaAtuacao"
                    name="areaAtuacao"
                    type="text"
                    placeholder="Ex.: Informática, Matemática..."
                    value={dados.areaAtuacao}
                    onChange={handleChange}
                  />
                </div>
              </div>
            </div>
          )}

          <div className="cadastro-row">

            <div className="cadastro-field">
              <label htmlFor="senha">Senha</label>

              <input
                id="senha"
                name="senha"
                type="password"
                placeholder="Digite sua senha"
                value={dados.senha}
                onChange={handleChange}
              />
            </div>

            <div className="cadastro-field">
              <label htmlFor="confirmar-senha">
                Confirmar senha
              </label>

              <input
                id="confirmar-senha"
                name="confirmarSenha"
                type="password"
                placeholder="Confirme sua senha"
                value={dados.confirmarSenha}
                onChange={handleChange}
              />
            </div>

          </div>

          {erro && <p className="cadastro-erro">{erro}</p>}

          <button
            type="submit"
            className="cadastro-button"
            disabled={enviando}
          >
            {enviando ? "Criando conta..." : "Criar conta"}
          </button>

        </form>

        <div className="cadastro-login">
          <span>Já possui uma conta?</span>

          <button type="button" onClick={() => navigate("/login")}>
            Entrar
          </button>
        </div>

      </div>
    </div>
  );
}

export default Cadastro;