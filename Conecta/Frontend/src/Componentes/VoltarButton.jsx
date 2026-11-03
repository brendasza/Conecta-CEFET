import { Link } from "react-router-dom";
import "./VoltarButton.css";
function ArrowLeftIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M19 12H5" />
      <path d="m12 19-7-7 7-7" />
    </svg>
  );
}

function VoltarButton({ to = "/", texto = "Voltar para o início" }) {
  return (
    <Link to={to} className="voltar-button">
      <span className="voltar-icon-wrap">
        <ArrowLeftIcon />
      </span>
      <span>{texto}</span>
    </Link>
  );
}

export default VoltarButton;