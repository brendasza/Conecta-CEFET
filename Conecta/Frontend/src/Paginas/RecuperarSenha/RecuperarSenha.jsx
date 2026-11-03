import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { recuperarSenha, redefinirSenha } from "../../services/api.js";
import "../login/Login.css";

// Mesma tela para os dois passos: sem ?token= pede o e-mail; com ?token= pede a nova senha.
function RecuperarSenha() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const token = params.get("token");

  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [erro, setErro] = useState("");
  const [aviso, setAviso] = useState("");
  const [linkDev, setLinkDev] = useState("");
  const [enviando, setEnviando] = useState(false);

  async function pedirLink(e) {
    e.preventDefault();
    setErro("");
    setAviso("");
    if (!email.trim()) return setErro("Informe seu e-mail.");

    setEnviando(true);
    try {
      const r = await recuperarSenha(email.trim());
      setAviso(r.mensagem);
      setLinkDev(r.linkDev || "");
    } catch (err) {
      setErro(err.message);
    } finally {
      setEnviando(false);
    }
  }

  async function trocarSenha(e) {
    e.preventDefault();
    setErro("");
    if (senha.length < 8) return setErro("A senha deve ter pelo menos 8 caracteres.");
    if (senha !== confirmar) return setErro("As senhas não conferem.");

    setEnviando(true);
    try {
      await redefinirSenha(token, senha);
      navigate("/login", { state: { senhaAlterada: true } });
    } catch (err) {
      setErro(err.message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <img src="/images/logo.png" alt="Conecta CEFET" className="login-logo" />

        <div className="login-header">
          <h1>{token ? "Nova senha" : "Recuperar senha"}</h1>
          <p>
            {token
              ? "Escolha uma nova senha para a sua conta."
              : "Informe o e-mail da conta e enviaremos um link para redefinir a senha."}
          </p>
        </div>

        {token ? (
          <form className="login-form" onSubmit={trocarSenha}>
            <div className="login-field">
              <label htmlFor="nova">Nova senha</label>
              <input id="nova" type="password" value={senha} onChange={(e) => setSenha(e.target.value)} placeholder="Mínimo de 8 caracteres" />
            </div>
            <div className="login-field">
              <label htmlFor="conf">Confirmar senha</label>
              <input id="conf" type="password" value={confirmar} onChange={(e) => setConfirmar(e.target.value)} placeholder="Repita a senha" />
            </div>
            {erro && <p className="login-erro">{erro}</p>}
            <button type="submit" className="login-button" disabled={enviando}>
              {enviando ? "Salvando..." : "Salvar nova senha"}
            </button>
          </form>
        ) : (
          <form className="login-form" onSubmit={pedirLink}>
            <div className="login-field">
              <label htmlFor="email">E-mail</label>
              <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Digite seu e-mail" />
            </div>
            {erro && <p className="login-erro">{erro}</p>}
            {aviso && <p className="login-sucesso">{aviso}</p>}
            {linkDev && (
              <p className="login-sucesso">
                Ambiente de desenvolvimento (sem e-mail configurado):{" "}
                <a href={linkDev}>abrir link de redefinição</a>
              </p>
            )}
            <button type="submit" className="login-button" disabled={enviando}>
              {enviando ? "Enviando..." : "Enviar link"}
            </button>
          </form>
        )}

        <div className="login-register">
          <Link to="/login">Voltar para o login</Link>
        </div>
      </div>
    </div>
  );
}

export default RecuperarSenha;
