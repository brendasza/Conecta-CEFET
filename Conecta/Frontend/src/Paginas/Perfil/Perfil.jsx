import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import "./Perfil.css";
import VoltarButton from "../../Componentes/VoltarButton.jsx";
import { useUsuarioLogado, meusProjetos, meuHistorico, baixarCertificado } from "../../services/api.js";
function Icon({ children, size = 22 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  );
}

function EditIcon() {
  return (
    <Icon size={18}>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z" />
    </Icon>
  );
}

function PlusIcon() {
  return (
    <Icon size={18}>
      <path d="M12 5v14M5 12h14" />
    </Icon>
  );
}

function ChevronRight() {
  return (
    <Icon size={18}>
      <path d="m9 18 6-6-6-6" />
    </Icon>
  );
}

function BellIcon() {
  return (
    <Icon size={15}>
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
      <path d="M10 21h4" />
    </Icon>
  );
}

function CalendarIcon() {
  return (
    <Icon size={18}>
      <rect x="3" y="4" width="18" height="17" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </Icon>
  );
}


function getIniciais(nome = "") {
  const partes = nome.trim().split(" ").filter(Boolean);
  if (partes.length === 0) return "??";
  const primeira = partes[0][0];
  const ultima = partes.length > 1 ? partes[partes.length - 1][0] : "";
  return (primeira + ultima).toUpperCase();
}

function Perfil({ focarProjetos = false }) {
  const { usuario: usuarioLogado, carregando, erro } = useUsuarioLogado();
  const [meus, setMeus] = useState({ coordenados: [], integrando: [] });
  const [historico, setHistorico] = useState(null);
  const [erroCertificado, setErroCertificado] = useState("");

  useEffect(() => {
    if (!usuarioLogado) return;
    meusProjetos().then(setMeus).catch(() => {});
    if (usuarioLogado.tipo === "aluno") meuHistorico().then(setHistorico).catch(() => {});
  }, [usuarioLogado]);

  useEffect(() => {
    if (focarProjetos) {
      setTimeout(() => {
        document
          .getElementById("projetos")
          ?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }
  }, [focarProjetos]);

  if (carregando) {
    return (
      <div className="perfil-page">
        <div className="perfil-container">
          <p>Carregando perfil...</p>
        </div>
      </div>
    );
  }

  if (!usuarioLogado) {
    return erro ? (
      <div className="perfil-page">
        <div className="perfil-container">
          <VoltarButton />
          <p>{erro}</p>
        </div>
      </div>
    ) : (
      <Navigate to="/login" replace />
    );
  }

  const ehProfessor = usuarioLogado?.tipo === "funcionario";

  const aluno = {
    nome: usuarioLogado?.nome || "",
    curso: usuarioLogado?.curso || "",
    matricula: usuarioLogado?.matricula || "",
    periodo: usuarioLogado?.periodo || "",
  };

  const professor = {
    nome: usuarioLogado?.nome || "",
    departamento: usuarioLogado?.departamento || " ",
    siape: usuarioLogado?.siape || "",
    titulacao: usuarioLogado?.titulacao || "",
    areaAtuacao: usuarioLogado?.areaAtuacao || " ",
  };

  const ehAdministrador = usuarioLogado?.tipo === "administrador";
  // professor e administrador coordenam atividades acadêmicas do mesmo jeito
  const coordena = ehProfessor || ehAdministrador;

  const resumo = (p) => ({
    id: p.id,
    nome: p.nome,
    descricao: p.descricao || p.objetivo,
    area: p.area,
    tipo: p.tipo,
    status: p.status,
  });

  const projetosAluno = meus.integrando.map(resumo);
  const projetosProfessor = meus.coordenados.map((p) => ({
    ...resumo(p),
    candidaturas: p.integrantes.length,
    pendentes: p.pendentes,
    notificacoesAtivas: p.seguidores,
  }));

  const anoDe = (iso) => (iso ? String(iso).slice(0, 4) : "");

  const timelineAluno = (historico?.participacoes || []).map((p) => ({
    ano: anoDe(p.data),
    titulo: p.projetoNome,
    tipo: p.tipo,
    descricao: p.certificado
      ? `Participação concluída com certificado de ${p.certificado.cargaHoraria} h.`
      : `Participação em ${p.tipo.toLowerCase()} na área de ${p.area}.`,
    certificado: p.certificado,
  }));

  const timelineProfessor = meus.coordenados.map((p) => ({
    ano: anoDe(p.dataCriacao),
    titulo: p.nome,
    tipo: "Coordenação",
    descricao: `Atividade acadêmica (${p.tipo.toLowerCase()}) na área de ${p.area}.`,
  }));

  const projetos = coordena ? projetosProfessor : projetosAluno;
  const timeline = ehProfessor ? timelineProfessor : timelineAluno;

  const totalCandidaturas = projetosProfessor.reduce(
    (soma, projeto) => soma + (projeto.candidaturas || 0),
    0
  );

  return (
    <div className="perfil-page">
      <div className="perfil-container">

        <VoltarButton />

        <section className="perfil-header-card">
          <div className="perfil-header-top">

            <div className="perfil-avatar">
              {getIniciais(ehProfessor ? professor.nome : aluno.nome)}
            </div>

            <div className="perfil-main-info">
              <h1>{ehProfessor ? professor.nome : aluno.nome}</h1>

              <span className="perfil-role">
                {ehAdministrador ? "Administrador" : ehProfessor ? "Professor" : "Estudante"}
              </span>

              <div className="perfil-academic-info">
                {ehAdministrador ? (
                  <>
                    <span>Setor: {usuarioLogado.setor}</span>
                    <span>E-mail: {usuarioLogado.email}</span>
                  </>
                ) : ehProfessor ? (
                  <>
                    <span>Departamento: {professor.departamento}</span>
                    <span>SIAPE: {professor.siape}</span>
                    <span>Titulação: {professor.titulacao}</span>
                    <span>Área: {professor.areaAtuacao}</span>
                  </>
                ) : (
                  <>
                    <span>Curso: {aluno.curso}</span>
                    <span>Matrícula: {aluno.matricula}</span>
                    <span>{aluno.periodo}</span>
                  </>
                )}
              </div>
            </div>

            <div className="perfil-header-actions">
              {coordena && (
                <Link to="/projetos/criar" className="criar-projeto-button">
                  <PlusIcon />
                  Criar atividade acadêmica
                </Link>
              )}

              <Link to="/perfil/editar" className="editar-perfil-button">
                <EditIcon />
                Editar perfil
              </Link>
            </div>
          </div>

          <div className="perfil-bio">
            <h3>Sobre mim</h3>

              <p>
              {usuarioLogado?.bio ||
                "Você ainda não escreveu nada aqui. Clique em Editar perfil para se apresentar."}
            </p>
          </div>

          {erroCertificado && <p style={{ color: "#c0392b" }}>{erroCertificado}</p>}

          <div className="perfil-stats">

            <Link to="/perfil/projetos" className="perfil-stat">
              <strong>{projetos.length}</strong>
              <span>{coordena ? "Atividades coordenadas" : "Atividades acadêmicas"}</span>
            </Link>

            {!ehProfessor && !ehAdministrador && historico && (
              <div className="perfil-stat perfil-stat-static">
                <strong>{historico.totalHoras} h</strong>
                <span>Em certificados</span>
              </div>
            )}

            {coordena && (
              <div className="perfil-stat perfil-stat-static">
                <strong>{totalCandidaturas}</strong>
                <span>Alunos nas atividades acadêmicas</span>
              </div>
            )}

          </div>
        </section>


        <>
        <section
          className="perfil-section"
          id="projetos"
        >
          <div className="section-title-row">
            <div>
              <h2>{coordena ? "Atividades acadêmicas que coordeno" : "Atividades acadêmicas que participo"}</h2>
              <p>
                {coordena
                  ? "Atividades acadêmicas sob sua coordenação ou orientação."
                  : "Atividades acadêmicas das quais participo atualmente."}
              </p>
            </div>
          </div>

          <div className="perfil-projects">
                        {projetos.length === 0 && (
              <p style={{ color: "#556987" }}>
                {coordena
                  ? "Você ainda não criou nenhuma atividade acadêmica."
                  : "Você ainda não participa de nenhuma atividade acadêmica."}
              </p>
            )}

            {projetos.map((projeto) => (
              <article
                className="perfil-project-card"
                key={projeto.id || projeto.nome}
              >
                <div className="project-card-top">
                  <span className="project-type">
                    {projeto.tipo}
                  </span>

                  {coordena && (
                    <span className="project-candidaturas-badge">
                      {projeto.candidaturas} aluno{projeto.candidaturas === 1 ? "" : "s"}
                    </span>
                  )}
                </div>

                <h3>{projeto.nome}</h3>

                <p>
                  {projeto.descricao}
                </p>

                {coordena && (
                  <p className="project-notificacoes-info">
                    <BellIcon />
                    {projeto.notificacoesAtivas} acompanhando · {projeto.pendentes} candidatura{projeto.pendentes === 1 ? "" : "s"} pendente{projeto.pendentes === 1 ? "" : "s"}
                  </p>
                )}

                <div className="project-card-bottom">
                  <span className="project-area">
                    {projeto.area}
                  </span>

                  {projeto.id ? (
                    <Link to={`/projetos/${projeto.id}`} className="ver-projeto-button">
{coordena ? "Gerenciar atividade" : "Ver atividade"}                      <ChevronRight />
                    </Link>
                  ) : (
                    <button className="ver-projeto-button">
                      {coordena ? "Gerenciar atividade" : "Ver atividade"}
                      <ChevronRight />
                    </button>
                  )}
                </div>
              </article>
            ))}

          </div>
        </section>
        </>

        {!ehAdministrador && (
          <>
        <section className="perfil-section">

          <div className="section-title-row">
            <div>
              <h2>{ehProfessor ? "Histórico acadêmico" : "Linha do tempo"}</h2>
              <p>
                {ehProfessor
                  ? "Histórico de atividades acadêmicas coordenadas e orientações realizadas."
                  : "Histórico de atividades e experiências acadêmicas."}
              </p>
            </div>
          </div>

          <div className="timeline">

            {timeline.map((item) => (
              <div
                className="timeline-item"
                key={`${item.ano}-${item.titulo}-${item.tipo}`}
              >

                <div className="timeline-marker">
                  <span></span>
                </div>

                <div className="timeline-content">

                  <div className="timeline-date">
                    <CalendarIcon />
                    {item.ano}
                  </div>

                  <div className="timeline-card">

                    <span className="timeline-type">
                      {item.tipo}
                    </span>

                    <h3>{item.titulo}</h3>

                    <p>{item.descricao}</p>

                    {item.certificado && (
                      <button
                        type="button"
                        className="ver-projeto-button"
                        onClick={() =>
                          baixarCertificado(item.certificado.id).catch((e) =>
                            setErroCertificado(e.message)
                          )
                        }
                      >
                        Baixar certificado
                      </button>
                    )}

                  </div>

                </div>

              </div>
            ))}

          </div>
        </section>


          </>
        )}

        <section className="perfil-section interesses-section">

          <div className="interesses-grid">

            <div className="interesses-card">

              <h2>{ehProfessor ? "Linhas de pesquisa" : "Áreas de interesse"}</h2>

              <p>
                {ehProfessor
                  ? "Temas de pesquisa e extensão conduzidos pelo docente."
                  : "Temas e áreas que despertam o interesse do estudante."}
              </p>

                <div className="tags-list">
                {(usuarioLogado?.interesses || []).map((tag) => (
                  <span key={tag}>{tag}</span>
                ))}
                {!usuarioLogado?.interesses?.length && (
                  <p style={{ color: "#556987", fontSize: 15, margin: 0 }}>
                    Nada adicionado ainda.
                  </p>
                )}
              </div>

            </div>


            <div className="interesses-card">

              <h2>{ehProfessor ? "Disciplinas ministradas" : "Habilidades"}</h2>

              <p>
                {ehProfessor
                  ? "Disciplinas sob responsabilidade do docente no período atual."
                  : "Conhecimentos e ferramentas que o estudante domina."}
              </p>

                <div className="tags-list">
                {(usuarioLogado?.habilidades || []).map((tag) => (
                  <span key={tag}>{tag}</span>
                ))}
                {!usuarioLogado?.habilidades?.length && (
                  <p style={{ color: "#556987", fontSize: 15, margin: 0 }}>
                    Nada adicionado ainda.
                  </p>
                )}
              </div>

            </div>

          </div>

        </section>

      </div>
    </div>
  );
}

export default Perfil;