import { Navigate } from "react-router-dom";
import { getToken, getUsuarioLogado } from "../services/api.js";
import VoltarButton from "./VoltarButton.jsx";

// Exige login e, opcionalmente, um tipo de usuário: aluno | funcionario | administrador.
// (O servidor também confere tudo; isto só evita mostrar telas que não são do perfil.)
function RotaProtegida({ tipos, children }) {
  const usuario = getUsuarioLogado();

  if (!getToken() || !usuario) {
    return <Navigate to="/login" replace />;
  }

  if (tipos && !tipos.includes(usuario.tipo)) {
    return (
      <div style={{ padding: 40, maxWidth: 560, margin: "0 auto" }}>
        <VoltarButton to="/" texto="Voltar para o feed" />
        <h1>Acesso restrito</h1>
        <p>Seu perfil não tem permissão para acessar esta página.</p>
      </div>
    );
  }

  return children;
}

export default RotaProtegida;
