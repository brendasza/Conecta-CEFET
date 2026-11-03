import { useState } from "react";
import "./TagsInput.css";

function TagsInput({
  tags,
  onChange,
  minimo = 0,
  maximo = 8,
  placeholder = "Digite e pressione Enter",
}) {
  const [texto, setTexto] = useState("");

  function adicionar(valor) {
    const limpo = valor.replace(/,/g, "").trim();
    if (!limpo) return;

    const jaExiste = tags.some((t) => t.toLowerCase() === limpo.toLowerCase());
    if (!jaExiste && tags.length < maximo) {
      onChange([...tags, limpo]);
    }
    setTexto("");
  }

  function remover(tag) {
    onChange(tags.filter((t) => t !== tag));
  }

  function handleKeyDown(evento) {
    if (evento.key === "Enter" || evento.key === ",") {
      evento.preventDefault();
      adicionar(texto);
    } else if (evento.key === "Backspace" && !texto && tags.length > 0) {
      onChange(tags.slice(0, -1));
    }
  }

  const faltam = Math.max(minimo - tags.length, 0);

  return (
    <div className="tags-input">
      <div className="tags-input-campo">
        {tags.map((tag) => (
          <span className="tags-input-tag" key={tag}>
            {tag}
            <button
              type="button"
              onClick={() => remover(tag)}
              aria-label={`Remover ${tag}`}
            >
              ×
            </button>
          </span>
        ))}

        <input
          type="text"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => adicionar(texto)}
          placeholder={tags.length >= maximo ? "" : placeholder}
          disabled={tags.length >= maximo}
        />
      </div>

      <small className={`tags-input-ajuda${faltam > 0 ? " pendente" : ""}`}>
        {faltam > 0
          ? `Adicione mais ${faltam} tag${faltam === 1 ? "" : "s"} (mínimo ${minimo}). `
          : ""}
        {tags.length}/{maximo} · Enter ou vírgula para adicionar
      </small>
    </div>
  );
}

export default TagsInput;