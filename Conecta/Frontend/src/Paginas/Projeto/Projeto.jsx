import { useCallback, useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import VoltarButton from "../../Componentes/VoltarButton.jsx";
import ConteudoPost from "../../Componentes/ConteudoPost.jsx";
import SeguirButton from "../../Componentes/SeguirButton.jsx";
import CandidaturaBox from "../../Componentes/CandidaturaBox.jsx";
import GerenciarCandidatos from "../../Componentes/GerenciarCandidatos.jsx";
import InscricoesBox from "../../Componentes/InscricoesBox.jsx";
import HistoricoProjeto from "../../Componentes/HistoricoProjeto.jsx";
import {
  getUsuarioLogado, ehAluno, ehAdmin,
  buscarProjeto, publicarPost, excluirPost, excluirProjeto, encerrarProjeto,
  alternarSeguir, ativarProjeto, listarProfessores, buscarAlunos,
  adicionarCoordenador, adicionarIntegrante, removerIntegrante,
} from "../../services/api.js";
import { getIniciais, formatarData, formatarDataHora, ROTULO_STATUS } from "../../utils/formato.js";
import "./Projeto.css";

const LIMITE_IMAGEM_MB = 10;
const LIMITE_VIDEO_MB = 200;

function Projeto() {
  const { id } = useParams();
  const navigate = useNavigate();
  const usuarioLogado = getUsuarioLogado();

  const [dados, setDados] = useState(null); // { projeto, seguindo, candidatura }
  const [carregando, setCarregando] = useState(true);
  const [erroGeral, setErroGeral] = useState("");

  const [textoPost, setTextoPost] = useState("");
  const [arquivos, setArquivos] = useState([]);
  const [ehVaga, setEhVaga] = useState(false);
  const [quantidadeVagas, setQuantidadeVagas] = useState("");
  const [erroPost, setErroPost] = useState("");
  const [publicando, setPublicando] = useState(false);
  const [chaveInputArquivo, setChaveInputArquivo] = useState(0);

  const [professores, setProfessores] = useState([]);
  const [idNovoCoordenador, setIdNovoCoordenador] = useState("");
  const [buscaAluno, setBuscaAluno] = useState("");
  const [resultadoBusca, setResultadoBusca] = useState(null); // null = ainda não buscou
  const [erroEquipe, setErroEquipe] = useState("");

  const recarregar = useCallback(async () => {
    try {
      setDados(await buscarProjeto(id));
      setErroGeral("");
    } catch (e) {
      setDados(null);
      setErroGeral(e.status === 404 ? "" : e.message);
    } finally {
      setCarregando(false);
    }
  }, [id]);

  useEffect(() => {
    recarregar();
  }, [recarregar]);

  const projeto = dados?.projeto;
  const ehCoordenador = Boolean(projeto?.coordenadores.some((c) => c.id === usuarioLogado?.id));
  const admin = ehAdmin(usuarioLogado);
  const ativo = projeto?.status === "ativo";

  useEffect(() => {
    if (ehCoordenador) listarProfessores().then(setProfessores).catch(() => {});
  }, [ehCoordenador]);

  if (carregando) {
    return (
      <div className="projeto-page">
        <div className="projeto-container">
          <VoltarButton />
          <p>Carregando atividade acadêmica...</p>
        </div>
      </div>
    );
  }

  if (!projeto) {
    return (
      <div className="projeto-page">
        <div className="projeto-container">
          <VoltarButton />
          <h1>Atividade acadêmica não encontrada</h1>
          <p>{erroGeral || "Essa atividade acadêmica não existe ou foi removida."}</p>
        </div>
      </div>
    );
  }

  async function handleSeguir() {
    try {
      const { seguindo } = await alternarSeguir(id);
      setDados((d) => ({ ...d, seguindo }));
    } catch (e) {
      setErroGeral(e.message);
    }
  }

  async function handleExcluirProjeto() {
    const aviso = admin
      ? "Desativar esta atividade acadêmica? Ela some para os usuários, mas você pode ativar novamente."
      : "Excluir esta atividade acadêmica e todas as suas publicações? Essa ação não pode ser desfeita.";
    if (!window.confirm(aviso)) return;
    try {
      await excluirProjeto(id);
      navigate(admin ? "/admin" : "/");
    } catch (e) {
      setErroGeral(e.message);
    }
  }

  async function handleAtivar() {
    try {
      await ativarProjeto(id);
      await recarregar();
    } catch (e) {
      setErroGeral(e.message);
    }
  }

  async function handleEncerrar() {
    if (!window.confirm("Encerrar a atividade acadêmica? Ela deixará de receber candidaturas e novas aprovações.")) return;
    try {
      await encerrarProjeto(id);
      await recarregar();
    } catch (e) {
      setErroGeral(e.message);
    }
  }

  async function handleExcluirPost(postId) {
    if (!window.confirm("Excluir esta publicação?")) return;
    try {
      await excluirPost(id, postId);
      await recarregar();
    } catch (e) {
      setErroGeral(e.message);
    }
  }

  function handleEscolherArquivos(evento) {
    const escolhidos = Array.from(evento.target.files);
    setErroPost("");

    for (const arquivo of escolhidos) {
      const ehImagem = arquivo.type.startsWith("image/");
      const ehVideo = arquivo.type.startsWith("video/");
      const tamanhoMb = arquivo.size / (1024 * 1024);

      if (!ehImagem && !ehVideo) {
        setErroPost(`"${arquivo.name}" não é uma foto nem um vídeo.`);
        return;
      }
      if (ehImagem && tamanhoMb > LIMITE_IMAGEM_MB) {
        setErroPost(`A foto "${arquivo.name}" passa de ${LIMITE_IMAGEM_MB} MB.`);
        return;
      }
      if (ehVideo && tamanhoMb > LIMITE_VIDEO_MB) {
        setErroPost(`O vídeo "${arquivo.name}" passa de ${LIMITE_VIDEO_MB} MB.`);
        return;
      }
    }

    setArquivos((atuais) => [...atuais, ...escolhidos].slice(0, 6));
    setChaveInputArquivo((chave) => chave + 1);
  }

  function removerArquivo(indice) {
    setArquivos((atuais) => atuais.filter((_, i) => i !== indice));
  }

  async function handlePublicar(evento) {
    evento.preventDefault();
    setErroPost("");

    if (!textoPost.trim() && arquivos.length === 0) {
      setErroPost("Escreva algo ou anexe uma foto ou vídeo.");
      return;
    }

    setPublicando(true);
    try {
      await publicarPost(id, { texto: textoPost, ehVaga, vagas: quantidadeVagas, arquivos });
      setTextoPost("");
      setArquivos([]);
      setEhVaga(false);
      setQuantidadeVagas("");
      await recarregar();
    } catch (e) {
      setErroPost(e.message);
    } finally {
      setPublicando(false);
    }
  }

  async function executarEquipe(acao) {
    setErroEquipe("");
    try {
      await acao();
      await recarregar();
    } catch (e) {
      setErroEquipe(e.message);
    }
  }

  function handleAdicionarCoordenador(evento) {
    evento.preventDefault();
    executarEquipe(async () => {
      await adicionarCoordenador(id, Number(idNovoCoordenador));
      setIdNovoCoordenador("");
    });
  }

  async function handleBuscarAluno(evento) {
    evento.preventDefault();
    setErroEquipe("");
    try {
      setResultadoBusca(await buscarAlunos(buscaAluno.trim()));
    } catch (e) {
      setErroEquipe(e.message);
    }
  }

  function handleAdicionarAluno(aluno) {
    executarEquipe(async () => {
      await adicionarIntegrante(id, aluno.id);
      setBuscaAluno("");
      setResultadoBusca(null);
    });
  }

  function handleRemoverIntegrante(idAluno) {
    if (!window.confirm("Remover este aluno da atividade acadêmica?")) return;
    executarEquipe(() => removerIntegrante(id, idAluno));
  }

  const professoresDisponiveis = professores.filter(
    (p) => !projeto.coordenadores.some((c) => c.id === p.id)
  );

  return (
    <div className="projeto-page">
      <div className="projeto-container">
        <VoltarButton to="/" texto="Voltar para o feed" />

        {/* CABEÇALHO */}
        <section className="projeto-header-card">
          <div className="projeto-header-topo">
            <div className="projeto-header-tags">
              <span className="tag-area">{projeto.area}</span>
              <span className="tag-tipo">{projeto.tipo}</span>
              {projeto.status !== "ativo" && (
                <span className={`pg-badge ${projeto.status}`}>{ROTULO_STATUS[projeto.status]}</span>
              )}
              {projeto.tags.map((tag) => (
                <span key={tag} className="tag-assunto">#{tag}</span>
              ))}
            </div>

            <div className="projeto-header-acoes">
              {usuarioLogado && <SeguirButton seguindo={dados.seguindo} onClick={handleSeguir} />}

              {ehCoordenador && ativo && (
                <>
                  <Link to={`/projetos/${id}/editar`} className="pg-btn sec">Editar</Link>
                  <button type="button" className="pg-btn sec" onClick={handleEncerrar}>Encerrar</button>
                </>
              )}

              {admin && projeto.status === "cancelado" && (
                <button type="button" className="pg-btn" onClick={handleAtivar}>Ativar atividade</button>
              )}

              {(ehCoordenador || admin) && projeto.status !== "cancelado" && (
                <button type="button" className="botao-excluir-projeto" onClick={handleExcluirProjeto}>
                  {admin ? "Desativar atividade" : "Excluir atividade"}
                </button>
              )}
            </div>
          </div>

          <h1>{projeto.nome}</h1>

          {erroGeral && <p className="erro-post">{erroGeral}</p>}

          <div className="projeto-objetivo">
            <h3>Objetivo</h3>
            <p>{projeto.objetivo}</p>
          </div>

          {projeto.descricao && (
            <div className="projeto-descricao">
              <h3>Sobre a atividade acadêmica</h3>
              <p>{projeto.descricao}</p>
            </div>
          )}

          <div className="projeto-info-grid">
            <div>
              <span>Vagas</span>
              <strong>
                {projeto.vagasTotais == null
                  ? "Sem vagas abertas"
                  : `${projeto.vagasOcupadas} de ${projeto.vagasTotais} preenchidas`}
              </strong>
            </div>
            <div>
              <span>Período de inscrição</span>
              <strong>
                {projeto.inicioInscricao && projeto.fimInscricao
                  ? `${formatarDataHora(projeto.inicioInscricao)} até ${formatarDataHora(projeto.fimInscricao)}`
                  : projeto.vagasTotais == null ? "Sem inscrições abertas" : "Sem prazo definido"}
              </strong>
            </div>
            {projeto.requisitos && (
              <div>
                <span>Requisitos</span>
                <strong>{projeto.requisitos}</strong>
              </div>
            )}
            {projeto.criterios && (
              <div>
                <span>Critérios de seleção</span>
                <strong>{projeto.criterios}</strong>
              </div>
            )}
          </div>
        </section>

        <div className="projeto-grid">
          {/* COLUNA PRINCIPAL */}
          <section className="projeto-coluna-principal">
            {ehAluno(usuarioLogado) && (
              <CandidaturaBox projeto={projeto} candidatura={dados.candidatura} onMudou={recarregar} />
            )}

            {ehCoordenador && ativo && <InscricoesBox projeto={projeto} onMudou={recarregar} />}

            {ehCoordenador && <GerenciarCandidatos projeto={projeto} onMudou={recarregar} />}

            <div className="projeto-secao-card">
              <h2>Publicações</h2>

              {ehCoordenador && (
                <form onSubmit={handlePublicar} className="form-post">
                  <textarea
                    placeholder="Compartilhe uma novidade, cole um link..."
                    value={textoPost}
                    onChange={(e) => setTextoPost(e.target.value)}
                    rows={3}
                  />

                  {arquivos.length > 0 && (
                    <ul className="arquivos-selecionados">
                      {arquivos.map((arquivo, indice) => (
                        <li key={`${arquivo.name}-${indice}`}>
                          <span>{arquivo.name}</span>
                          <button type="button" onClick={() => removerArquivo(indice)} aria-label={`Remover ${arquivo.name}`}>
                            ×
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}

                  <div className="form-post-opcoes">
                    <label className="botao-anexar">
                      Adicionar foto ou vídeo
                      <input
                        key={chaveInputArquivo}
                        type="file"
                        accept="image/*,video/*"
                        multiple
                        onChange={handleEscolherArquivos}
                      />
                    </label>

                    <label className="opcao-vaga">
                      <input type="checkbox" checked={ehVaga} onChange={(e) => setEhVaga(e.target.checked)} />
                      Esta publicação é uma vaga aberta
                    </label>

                    {ehVaga && (
                      <input
                        type="number"
                        min="1"
                        className="campo-vagas"
                        placeholder="Nº de vagas"
                        value={quantidadeVagas}
                        onChange={(e) => setQuantidadeVagas(e.target.value)}
                      />
                    )}
                  </div>

                  {erroPost && <p className="erro-post">{erroPost}</p>}

                  <button type="submit" className="botao-publicar" disabled={publicando}>
                    {publicando ? "Publicando..." : "Publicar no feed"}
                  </button>
                </form>
              )}

              {projeto.posts.length === 0 ? (
                <p className="vazio-mensagem">Ainda não há publicações neste projeto.</p>
              ) : (
                <div className="lista-posts">
                  {projeto.posts.map((post) => (
                    <article key={post.id} className="post-card">
                      <div className="post-avatar">{getIniciais(post.autorNome)}</div>
                      <div className="post-conteudo">
                        <div className="post-cabecalho">
                          <strong>{post.autorNome}</strong>
                          <span>{formatarData(post.data)}</span>

                          {(ehCoordenador || admin) && (
                            <button
                              type="button"
                              className="botao-excluir-post"
                              onClick={() => handleExcluirPost(post.id)}
                              aria-label="Excluir publicação"
                            >
                              Excluir
                            </button>
                          )}
                        </div>
                        <ConteudoPost post={post} />
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>

            {/* LINHA DO TEMPO (editável pelo coordenador: ano + o que aconteceu) */}
            <HistoricoProjeto projeto={projeto} podeEditar={ehCoordenador} onMudou={recarregar} />
          </section>

          {/* COLUNA LATERAL: EQUIPE */}
          <aside className="projeto-coluna-lateral">
            <div className="projeto-secao-card">
              <h2>Coordenadores</h2>
              <ul className="lista-membros">
                {projeto.coordenadores.map((c) => (
                  <li key={c.id}>
                    <span className="membro-avatar">{getIniciais(c.nome)}</span>
                    <Link to={`/usuarios/${c.id}`} className="membro-link">{c.nome}</Link>
                  </li>
                ))}
              </ul>

              {ehCoordenador && ativo && (
                <form onSubmit={handleAdicionarCoordenador} className="form-adicionar">
                  <select value={idNovoCoordenador} onChange={(e) => setIdNovoCoordenador(e.target.value)}>
                    <option value="">Adicionar coordenador...</option>
                    {professoresDisponiveis.map((p) => (
                      <option key={p.id} value={p.id}>{p.nome}</option>
                    ))}
                  </select>
                  <button type="submit" disabled={!idNovoCoordenador}>Adicionar</button>
                </form>
              )}
            </div>

            <div className="projeto-secao-card">
              <h2>Alunos participantes</h2>

              {projeto.integrantes.length === 0 ? (
                <p className="vazio-mensagem">Nenhum aluno participando ainda.</p>
              ) : (
                <ul className="lista-membros">
                  {projeto.integrantes.map((i) => (
                    <li key={i.id}>
                      <span className="membro-avatar">{getIniciais(i.nome)}</span>
                      <span className="membro-info">
                        <Link to={`/usuarios/${i.id}`} className="membro-link">{i.nome}</Link>
                        {i.matricula && ehCoordenador && <small>Matrícula {i.matricula}</small>}
                      </span>

                      {ehCoordenador && (
                        <button
                          type="button"
                          className="botao-remover-membro"
                          onClick={() => handleRemoverIntegrante(i.id)}
                          aria-label={`Remover ${i.nome}`}
                        >
                          ×
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              )}

              {ehCoordenador && ativo && (
                <div className="busca-aluno">
                  <form onSubmit={handleBuscarAluno} className="form-adicionar">
                    <input
                      type="text"
                      value={buscaAluno}
                      onChange={(e) => {
                        setBuscaAluno(e.target.value);
                        setResultadoBusca(null);
                      }}
                      placeholder="Nome ou matrícula do aluno"
                    />
                    <button type="submit" disabled={buscaAluno.trim().length < 2}>Buscar</button>
                  </form>

                  {resultadoBusca && resultadoBusca.length === 0 && (
                    <p className="busca-aluno-vazio">
                      Nenhum aluno encontrado. Confira o nome ou a matrícula.
                    </p>
                  )}

                  {resultadoBusca &&
                    resultadoBusca.map((aluno) => {
                      const jaParticipa = projeto.integrantes.some((i) => i.id === aluno.id);

                      return (
                        <div key={aluno.id} className="resultado-aluno">
                          <span className="resultado-aluno-dados">
                            {aluno.nome}
                            <small>Matrícula {aluno.matricula} · {aluno.curso}</small>
                          </span>

                          {jaParticipa ? (
                            <span className="resultado-aluno-ja">Já participa</span>
                          ) : (
                            <button type="button" onClick={() => handleAdicionarAluno(aluno)}>
                              Adicionar
                            </button>
                          )}
                        </div>
                      );
                    })}
                </div>
              )}

              {erroEquipe && <p className="erro-post">{erroEquipe}</p>}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

export default Projeto;
