import { useEffect, useState } from "react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000/api";
// Fotos e vídeos das publicações ficam em http://servidor/uploads/...
const SERVIDOR_URL = API_URL.replace(/\/api\/?$/, "");

const CHAVE_TOKEN = "conecta_token";
// Cópia do usuário só para as telas que leem de forma síncrona.
// A fonte da verdade é o banco: GET /api/me atualiza esta cópia.
const CHAVE_USUARIO = "conecta_usuario_logado";

export function urlArquivo(caminho) {
  if (!caminho) return "";
  return /^https?:\/\//.test(caminho) ? caminho : `${SERVIDOR_URL}${caminho}`;
}

export function getToken() {
  try {
    return localStorage.getItem(CHAVE_TOKEN);
  } catch {
    return null;
  }
}

export function getUsuarioLogado() {
  try {
    return JSON.parse(localStorage.getItem(CHAVE_USUARIO));
  } catch {
    return null;
  }
}

export function salvarSessao(token, usuario) {
  localStorage.setItem(CHAVE_TOKEN, token);
  localStorage.setItem(CHAVE_USUARIO, JSON.stringify(usuario));
}

export function limparSessao() {
  localStorage.removeItem(CHAVE_TOKEN);
  localStorage.removeItem(CHAVE_USUARIO);
}

export const ehProfessor = (u) => u?.tipo === "funcionario";
export const ehAluno = (u) => u?.tipo === "aluno";
export const ehAdmin = (u) => u?.tipo === "administrador";
// professor e administrador têm as mesmas funções de coordenação de atividades acadêmicas
export const podeCoordenar = (u) => ehProfessor(u) || ehAdmin(u);

function consulta(parametros = {}) {
  const p = new URLSearchParams();
  Object.entries(parametros).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") p.set(k, v);
  });
  const texto = p.toString();
  return texto ? `?${texto}` : "";
}

async function enviar(caminho, { metodo = "GET", corpo, formulario } = {}) {
  const token = getToken();

  let resposta;
  try {
    resposta = await fetch(`${API_URL}${caminho}`, {
      method: metodo,
      headers: {
        ...(corpo ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: formulario ?? (corpo ? JSON.stringify(corpo) : undefined),
    });
  } catch {
    const erro = new Error("Não foi possível conectar ao servidor.");
    erro.rede = true;
    throw erro;
  }

  // Token expirado/inválido (ou conta desativada): derruba a sessão e volta ao login
  if (resposta.status === 401 && token) {
    limparSessao();
    if (!window.location.pathname.startsWith("/login")) {
      window.location.assign("/login?expirou=1");
    }
  }

  return resposta;
}

async function requisitar(caminho, opcoes) {
  const resposta = await enviar(caminho, opcoes);
  const dados = await resposta.json().catch(() => ({}));

  if (!resposta.ok) {
    const erro = new Error(dados.erro || "Erro inesperado.");
    erro.status = resposta.status;
    throw erro;
  }

  return dados;
}

const post = (caminho, corpo) => requisitar(caminho, { metodo: "POST", corpo });
const put = (caminho, corpo) => requisitar(caminho, { metodo: "PUT", corpo });
const del = (caminho) => requisitar(caminho, { metodo: "DELETE" });

/* ---------- conta ---------- */

export async function cadastrar(dados) {
  return post("/cadastro", dados);
}

export async function login(email, senha) {
  const { token, usuario } = await post("/login", { email, senha });
  salvarSessao(token, usuario);
  return usuario;
}

export function logout() {
  limparSessao();
}

export async function buscarMe() {
  const { usuario } = await requisitar("/me");
  localStorage.setItem(CHAVE_USUARIO, JSON.stringify(usuario));
  return usuario;
}

export async function atualizarMe(dados) {
  const { usuario } = await put("/me", dados);
  localStorage.setItem(CHAVE_USUARIO, JSON.stringify(usuario));
  return usuario;
}

// Carrega o usuário logado direto do banco (GET /api/me).
// Sem token ou com token inválido, `usuario` fica null e `carregando` false.
export function useUsuarioLogado() {
  const [usuario, setUsuario] = useState(null);
  const [carregando, setCarregando] = useState(() => Boolean(getToken()));
  const [erro, setErro] = useState("");

  useEffect(() => {
    if (!getToken()) return; // sem sessão: nada a buscar

    let ativo = true;
    buscarMe()
      .then((u) => ativo && setUsuario(u))
      .catch((e) => ativo && e.status !== 401 && setErro(e.message))
      .finally(() => ativo && setCarregando(false));

    return () => {
      ativo = false;
    };
  }, []);

  return { usuario, carregando, erro };
}

/* ---------- projetos e feed ---------- */

export const buscarFeed = (filtros) => requisitar(`/feed${consulta(filtros)}`);
export const buscarOpcoes = () => requisitar("/opcoes");
export const listarProjetos = (filtros) =>
  requisitar(`/projetos${consulta(filtros)}`).then((d) => d.projetos);
export const buscarProjeto = (id) => requisitar(`/projetos/${id}`);
export const meusProjetos = () => requisitar("/me/projetos");
export const projetosSeguidos = () => requisitar("/me/seguindo").then((d) => d.projetos);

export const criarProjeto = (dados) => post("/projetos", dados).then((d) => d.projeto);
export const atualizarProjeto = (id, dados) => put(`/projetos/${id}`, dados).then((d) => d.projeto);
export const ativarProjeto = (id) => post(`/projetos/${id}/ativar`).then((d) => d.projeto);
export const atualizarInscricoes = (id, dados) => put(`/projetos/${id}/inscricoes`, dados).then((d) => d.projeto);

// linha do tempo editável do projeto (ano + o que aconteceu)
export const criarHistorico = (id, dados) => post(`/projetos/${id}/historico`, dados);
export const atualizarHistorico = (id, idItem, dados) => put(`/projetos/${id}/historico/${idItem}`, dados);
export const excluirHistorico = (id, idItem) => del(`/projetos/${id}/historico/${idItem}`);
export const encerrarProjeto = (id) => post(`/projetos/${id}/encerrar`).then((d) => d.projeto);
export const excluirProjeto = (id) => del(`/projetos/${id}`);

export const alternarSeguir = (id) => post(`/projetos/${id}/seguir`);

export function publicarPost(id, { texto, ehVaga, vagas, arquivos }) {
  const formulario = new FormData();
  formulario.append("texto", texto || "");
  formulario.append("ehVaga", ehVaga ? "true" : "false");
  if (ehVaga && vagas) formulario.append("vagas", String(vagas));
  arquivos.forEach((a) => formulario.append("arquivos", a));
  return requisitar(`/projetos/${id}/posts`, { metodo: "POST", formulario }).then((d) => d.projeto);
}
export const excluirPost = (id, idPost) => del(`/projetos/${id}/posts/${idPost}`);

export const listarProfessores = () => requisitar("/professores").then((d) => d.professores);
export const buscarAlunos = (termo) =>
  requisitar(`/alunos/buscar${consulta({ termo })}`).then((d) => d.alunos);
export const adicionarCoordenador = (id, idUsuario) =>
  post(`/projetos/${id}/coordenadores`, { idUsuario }).then((d) => d.projeto);
export const adicionarIntegrante = (id, idUsuario) =>
  post(`/projetos/${id}/integrantes`, { idUsuario });
export const removerIntegrante = (id, idAluno) => del(`/projetos/${id}/integrantes/${idAluno}`);

/* ---------- candidaturas e certificados ---------- */

export const candidatar = (id, carta) =>
  post(`/projetos/${id}/candidaturas`, { carta }).then((d) => d.candidatura);
export const cancelarCandidatura = (id) => del(`/candidaturas/${id}`);
export const minhasCandidaturas = () => requisitar("/me/candidaturas").then((d) => d.candidaturas);
export const meuHistorico = () => requisitar("/me/historico");

export const candidaturasDoProjeto = (id) =>
  requisitar(`/projetos/${id}/candidaturas`).then((d) => d.candidaturas);
export const decidirCandidatura = (id, status, justificativa) =>
  put(`/candidaturas/${id}`, { status, justificativa });
export const emitirCertificado = (idCandidatura, cargaHoraria) =>
  post(`/candidaturas/${idCandidatura}/certificado`, { cargaHoraria });

// O download precisa do token, então baixamos como arquivo e salvamos pelo navegador
export async function baixarCertificado(id) {
  const resposta = await enviar(`/certificados/${id}/download`);
  if (!resposta.ok) {
    const dados = await resposta.json().catch(() => ({}));
    throw new Error(dados.erro || "Não foi possível baixar o certificado.");
  }
  const url = URL.createObjectURL(await resposta.blob());
  const link = document.createElement("a");
  link.href = url;
  link.download = `certificado-${id}.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

/* ---------- notificações, notícias e agenda ---------- */

export const listarNotificacoes = () =>
  requisitar("/me/notificacoes").then((d) => d.notificacoes);
export const contarNaoLidas = () =>
  requisitar("/me/notificacoes/nao-lidas").then((d) => d.naoLidas);
export const marcarNotificacaoLida = (id) => put(`/notificacoes/${id}/lida`);
export const marcarTodasLidas = () => put("/me/notificacoes/lidas");

export const listarNoticias = () => requisitar("/noticias").then((d) => d.noticias);
export const listarAgenda = () => requisitar("/agenda").then((d) => d.eventos);

/* ---------- administrador ---------- */

export const adminDashboard = () => requisitar("/admin/dashboard");
export const adminUsuarios = (filtros) =>
  requisitar(`/admin/usuarios${consulta(filtros)}`).then((d) => d.usuarios);
export const adminDefinirAtivo = (id, ativo) => put(`/admin/usuarios/${id}/ativo`, { ativo });
export const adminProjetos = (busca) =>
  requisitar(`/admin/projetos${consulta({ busca })}`).then((d) => d.projetos);

export const adminCriarNoticia = (dados) => post("/admin/noticias", dados);
export const adminAtualizarNoticia = (id, dados) => put(`/admin/noticias/${id}`, dados);
export const adminExcluirNoticia = (id) => del(`/admin/noticias/${id}`);

export const adminCriarEvento = (dados) => post("/admin/eventos", dados);
export const adminAtualizarEvento = (id, dados) => put(`/admin/eventos/${id}`, dados);
export const adminExcluirEvento = (id) => del(`/admin/eventos/${id}`);

/* ---------- recuperação de senha (RF005) ---------- */

export const recuperarSenha = (email) => post("/recuperar-senha", { email });
export const redefinirSenha = (token, senha) => post("/redefinir-senha", { token, senha });

/* ---------- perfil público ---------- */

export const perfilPublico = (id) => requisitar(`/usuarios/${id}/perfil`).then((d) => d.usuario);

/* ---------- administrador: cadastros de apoio, moderação e logs ---------- */

export const adminApoio = (categoria) =>
  requisitar(`/admin/apoio/${categoria}`).then((d) => d.itens);
export const adminCriarApoio = (categoria, nome) => post(`/admin/apoio/${categoria}`, { nome });
export const adminRenomearApoio = (categoria, id, nome) => put(`/admin/apoio/${categoria}/${id}`, { nome });
export const adminExcluirApoio = (categoria, id) => del(`/admin/apoio/${categoria}/${id}`);

export const adminPosts = (busca) =>
  requisitar(`/admin/posts${consulta({ busca })}`).then((d) => d.posts);
export const adminRemoverPost = (id) => del(`/admin/posts/${id}`);

export const adminLogs = (filtros) =>
  requisitar(`/admin/logs${consulta(filtros)}`).then((d) => d.logs);

/* ---------- busca universal (atividades acadêmicas, professores e outros usuários) ---------- */

export const buscaGeral = (q) => requisitar(`/busca${consulta({ q })}`);

/* ---------- agenda pessoal do aluno ---------- */

export const minhaAgenda = () => requisitar("/me/agenda").then((d) => d.itens);
export const criarLembrete = (dados) => post("/me/agenda", dados);
export const atualizarLembrete = (id, dados) => put(`/me/agenda/${id}`, dados);
export const excluirLembrete = (id) => del(`/me/agenda/${id}`);

// professor: eventos institucionais no calendário (só altera os que criou)
export const criarEventoInstitucional = (dados) => post("/me/eventos", dados);
export const atualizarEventoInstitucional = (id, dados) => put(`/me/eventos/${id}`, dados);
export const excluirEventoInstitucional = (id) => del(`/me/eventos/${id}`);

/* ---------- administrador: tipo/nível de usuário e ano letivo ---------- */

export const adminAlterarNivel = (id, nivel) => put(`/admin/usuarios/${id}/nivel`, { nivel });

export const adminAnosLetivos = () => requisitar("/admin/anos-letivos").then((d) => d.anos);
export const adminSalvarAnoLetivo = (dados) => post("/admin/anos-letivos", dados);
export const adminExcluirAnoLetivo = (ano) => del(`/admin/anos-letivos/${ano}`);
export const adminCriarPeriodo = (ano, dados) => post(`/admin/anos-letivos/${ano}/periodos`, dados);
export const adminAtualizarPeriodo = (id, dados) => put(`/admin/periodos/${id}`, dados);
export const adminExcluirPeriodo = (id) => del(`/admin/periodos/${id}`);
