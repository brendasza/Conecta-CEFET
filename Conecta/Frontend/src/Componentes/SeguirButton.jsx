import "./SeguirButton.css";

function SeguirButton({ seguindo, onClick }) {
  return (
    <button
      type="button"
      className={`seguir-button${seguindo ? " ativo" : ""}`}
      onClick={onClick}
      aria-pressed={seguindo}
    >
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
        <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
        <path d="M10 21h4" />
      </svg>
      {seguindo ? "Notificações ativadas" : "Ativar notificações"}
    </button>
  );
}

export default SeguirButton;