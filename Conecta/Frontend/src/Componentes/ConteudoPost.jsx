import { urlArquivo } from "../services/api.js";
import "./ConteudoPost.css";

const REGEX_URL = /(https?:\/\/[^\s]+)/g;

function extrairIdYoutube(url) {
  try {
    const u = new URL(url);

    if (u.hostname === "youtu.be") return u.pathname.slice(1) || null;

    if (u.hostname.endsWith("youtube.com")) {
      if (u.pathname === "/watch") return u.searchParams.get("v");
      if (u.pathname.startsWith("/shorts/")) return u.pathname.split("/")[2];
    }
  } catch {
    // link inválido: ignora
  }
  return null;
}

// Foto ou vídeo hospedado no servidor
function Midia({ item }) {
  const url = urlArquivo(item.url);

  if (item.tipo === "video") {
    return <video src={url} controls className="midia-item midia-video" />;
  }

  return <img src={url} alt={item.nome} className="midia-item" />;
}

function ConteudoPost({ post }) {
  const texto = post.texto || "";
  const midia = post.midia || [];

  const partes = texto.split(REGEX_URL);
  const idsYoutube = [
    ...new Set(
      (texto.match(REGEX_URL) || []).map(extrairIdYoutube).filter(Boolean)
    ),
  ];

  return (
    <div className="conteudo-post">
      {post.ehVaga && (
        <span className="badge-vaga">
          Vaga aberta
          {post.vagas
            ? ` · ${post.vagas} ${post.vagas === 1 ? "vaga" : "vagas"}`
            : ""}
        </span>
      )}

      {texto && (
        <p className="conteudo-post-texto">
          {partes.map((parte, indice) =>
            indice % 2 === 1 ? (
              <a key={indice} href={parte} target="_blank" rel="noopener noreferrer">
                {parte}
              </a>
            ) : (
              parte
            )
          )}
        </p>
      )}

      {idsYoutube.map((idVideo) => (
        <div key={idVideo} className="youtube-embed">
          <iframe
            src={`https://www.youtube.com/embed/${idVideo}`}
            title="Vídeo do YouTube"
            allowFullScreen
          />
        </div>
      ))}

      {midia.length > 0 && (
        <div className="midia-grade">
          {midia.map((item) => (
            <Midia key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}

export default ConteudoPost;