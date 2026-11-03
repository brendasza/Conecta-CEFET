import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { perfilPublico, getUsuarioLogado } from "../../services/api.js";
import { getIniciais, ROTULO_STATUS } from "../../utils/formato.js";
import "./PerfilPublico.css";

function ListaTags({ itens }) {
  if (!itens?.length) return <p className="pg-muted">Nada informado.</p>;
  return (
    <div className="pp-tags">
      {itens.map((i) => (
        <span key={i} className="pg-badge">{i}</span>
      ))}
    </div>
  );
}

function PerfilPublico() {
  const { id } = useParams();
  const logado = getUsuarioLogado();
  const [usuario, setUsuario] = useState(null);
  const [erro, setErro] = useState("");

  useEffect(() => {
    setUsuario(null);
    setErro("");
    perfilPublico(id).then(setUsuario).catch((e) => setErro(e.message));
  }, [id]);

  const professor = usuario?.tipo === "funcionario";
  const admin = usuario?.tipo === "administrador";

  return (
    <main className="pg">
      <div className="pg-container pp">
        {erro && <p className="pg-erro">{erro}</p>}
        {!usuario && !erro && <p className="pg-vazio">Carregando...</p>}

        {usuario && (
          <>
            <section className="pg-card pp-topo">
              <div className="pp-avatar">{getIniciais(usuario.nome)}</div>
              <div>
                <h1>{usuario.nome}</h1>
                <p className="pg-sub" style={{ margin: 0 }}>
                  {admin
                    ? `Administrador(a)${usuario.setor ? ` · ${usuario.setor}` : ""}`
                    : professor
                      ? `Professor(a) · ${usuario.departamento}${usuario.titulacao ? ` · ${usuario.titulacao}` : ""}`
                      : `Aluno(a) · ${usuario.curso}${usuario.periodo ? ` · ${usuario.periodo}` : ""}`}
                </p>
                {usuario.email && (
                  <p className="pg-muted" style={{ margin: "4px 0 0" }}>
                    Contato: <a href={`mailto:${usuario.email}`}>{usuario.email}</a>
                  </p>
                )}
                {String(logado?.id) === String(usuario.id) && (
                  <Link to="/perfil" className="pp-meu">Este é o seu perfil</Link>
                )}
              </div>
            </section>

            {usuario.bio && (
              <section className="pg-card">
                <h2>Sobre</h2>
                <p className="pp-bio">{usuario.bio}</p>
              </section>
            )}

            {professor && usuario.areaAtuacao && (
              <section className="pg-card">
                <h2>Área de atuação</h2>
                <p className="pp-bio">{usuario.areaAtuacao}</p>
              </section>
            )}

            {!admin && (
              <>
                <section className="pg-card">
                  <h2>Áreas de interesse</h2>
                  <ListaTags itens={usuario.interesses} />
                </section>

                <section className="pg-card">
                  <h2>Habilidades</h2>
                  <ListaTags itens={usuario.habilidades} />
                </section>
              </>
            )}

            {professor && (
              <section className="pg-card">
                <h2>Atividades acadêmicas que coordena</h2>
                {usuario.projetos.length === 0 && <p className="pg-muted">Nenhuma atividade acadêmica no momento.</p>}
                {usuario.projetos.map((p) => (
                  <div key={p.id} className="pp-projeto">
                    <div>
                      <Link to={`/projetos/${p.id}`}><strong>{p.nome}</strong></Link>
                      <span className="pg-muted"> · {p.area} · {p.tipo}</span>
                    </div>
                    <span className={`pg-badge ${p.status}`}>{ROTULO_STATUS[p.status] ?? p.status}</span>
                  </div>
                ))}
              </section>
            )}
          </>
        )}
      </div>
    </main>
  );
}

export default PerfilPublico;
