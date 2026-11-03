import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { login } from "../../services/api.js";
import "./Login.css";

function Login() {
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);

  const cadastroSucesso = location.state?.cadastroSucesso;
  const senhaAlterada = location.state?.senhaAlterada;
  const sessaoExpirou = new URLSearchParams(location.search).get("expirou") === "1";

  async function handleSubmit(evento) {
    evento.preventDefault();
    setErro("");

    if (!email || !senha) {
      setErro("Preencha e-mail e senha.");
      return;
    }

    setEnviando(true);
    try {
      const usuario = await login(email.trim(), senha);
      navigate(usuario.tipo === "administrador" ? "/admin" : "/");
    } catch (e) {
      setErro(e.message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">

        <img
          src="/images/logo.png"
          alt="Conecta CEFET"
          className="login-logo"
        />

        <div className="login-header">
          <h1>Bem-vindo!</h1>
          <p>Entre na sua conta para continuar.</p>
        </div>

        {cadastroSucesso && (
          <p className="login-sucesso">
            Conta criada com sucesso! Faça login para continuar.
          </p>
        )}

        {senhaAlterada && (
          <p className="login-sucesso">Senha alterada com sucesso! Entre com a nova senha.</p>
        )}

        {sessaoExpirou && (
          <p className="login-erro">Sua sessão expirou. Entre novamente para continuar.</p>
        )}

        <form className="login-form" onSubmit={handleSubmit}>

          <div className="login-field">
            <label htmlFor="email">E-mail</label>

            <input
              id="email"
              type="email"
              placeholder="Digite seu e-mail"
              value={email}
              onChange={(evento) => setEmail(evento.target.value)}
            />
          </div>

          <div className="login-field">
            <div className="password-label">
              <label htmlFor="password">Senha</label>

              <Link to="/recuperar-senha" className="forgot-password">
                Esqueci minha senha
              </Link>
            </div>

            <input
              id="password"
              type="password"
              placeholder="Digite sua senha"
              value={senha}
              onChange={(evento) => setSenha(evento.target.value)}
            />
          </div>

          {erro && <p className="login-erro">{erro}</p>}

          <button
            type="submit"
            className="login-button"
            disabled={enviando}
          >
            {enviando ? "Entrando..." : "Entrar"}
          </button>

        </form>

        <div className="login-register">
          <span>Não possui uma conta?</span>

          <button type="button" onClick={() => navigate("/cadastro")}>
            Cadastre-se
          </button>
        </div>

      </div>
    </div>
  );
}

export default Login;