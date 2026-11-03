import pool from "../config/database.js";
import * as ProjetoRepository from "../repositories/ProjetoRepository.js";
import * as CandidaturaRepository from "../repositories/CandidaturaRepository.js";
import * as UsuarioRepository from "../repositories/UsuarioRepository.js";
import * as NotificacaoService from "./NotificacaoService.js";
import { invalido, proibido, naoEncontrado, conflito } from "../utils/erros.js";
import { texto, paraIso } from "../utils/texto.js";

function paraCandidaturaDTO(c) {
  return {
    id: String(c.id_candidatura),
    projetoId: String(c.id_atividade),
    projetoNome: c.titulo,
    projetoStatus: c.status_projeto,
    tipo: c.tipo,
    area: c.area,
    status: c.status,
    data: paraIso(c.data_inscricao),
    carta: c.carta_apresentacao ?? "",
    justificativa: c.justificativa_professor ?? "",
    certificado: c.id_certificado
      ? {
          id: String(c.id_certificado),
          cargaHoraria: c.carga_horaria,
          dataEmissao: paraIso(c.data_emissao),
        }
      : null,
  };
}

async function exigirCoordenador(idProjeto, idUsuario) {
  if (!(await ProjetoRepository.ehCoordenador(idProjeto, idUsuario))) {
    throw proibido("Apenas os coordenadores do projeto podem fazer isso");
  }
}

async function garantirVaga(projeto, conexao) {
  if (projeto.vagas_totais == null) return;
  const aprovados = await ProjetoRepository.contarAprovados(projeto.id_atividade, conexao);
  if (aprovados >= projeto.vagas_totais) {
    throw conflito("O limite de vagas deste projeto já foi atingido");
  }
}


export async function candidatar(idAluno, idProjeto, carta) {
  const cartaLimpa = texto(carta, 3000, "texto da carta de apresentação");

  const conexao = await pool.getConnection();
  let projeto;
  let id;

  try {
    await conexao.beginTransaction();

    projeto = await ProjetoRepository.buscarBruto(idProjeto, conexao, true);
    if (!projeto || projeto.status === "cancelado") throw naoEncontrado("Projeto não encontrado");

    if (projeto.status !== "ativo") throw conflito("Este projeto não está mais recebendo inscrições");
    if (projeto.vagas_totais == null) throw conflito("Este projeto não possui vagas abertas");
    if (Number(projeto.nao_iniciado)) throw conflito("As inscrições deste projeto ainda não começaram");
    if (!Number(projeto.prazo_aberto)) throw conflito("O prazo de inscrição deste projeto já encerrou");

    if (await CandidaturaRepository.buscarDoAlunoNoProjeto(idAluno, idProjeto, conexao)) {
      throw conflito("Você já se candidatou a este projeto");
    }

    await garantirVaga(projeto, conexao);

    id = await CandidaturaRepository.criar(
      { id_usuario: idAluno, id_atividade: idProjeto, carta: cartaLimpa },
      conexao
    );

    await conexao.commit();
  } catch (erro) {
    await conexao.rollback();
    if (erro.code === "ER_DUP_ENTRY") throw conflito("Você já se candidatou a este projeto");
    throw erro;
  } finally {
    conexao.release();
  }

  const aluno = await UsuarioRepository.buscarPorId(idAluno);
  await NotificacaoService.notificar(await ProjetoRepository.idsCoordenadores(idProjeto), {
    mensagem: `${aluno.nome} se candidatou a "${projeto.titulo}".`,
    tipo: "candidatura",
    link: `/projetos/${idProjeto}`,
  });

  return { id: String(id), status: "pendente" };
}

export async function cancelar(idCandidatura, idAluno) {
  const c = await CandidaturaRepository.buscarPorId(idCandidatura);
  if (!c || c.id_usuario !== idAluno) throw naoEncontrado("Candidatura não encontrada");
  if (c.status !== "pendente") throw conflito("Só é possível cancelar candidaturas pendentes");
  await CandidaturaRepository.excluir(idCandidatura);
}

export async function listarDoAluno(idAluno) {
  return (await CandidaturaRepository.listarDoAluno(idAluno)).map(paraCandidaturaDTO);
}

export async function historico(idAluno) {
  const resumo = await CandidaturaRepository.historicoDoAluno(idAluno);
  const candidaturas = (await CandidaturaRepository.listarDoAluno(idAluno)).map(paraCandidaturaDTO);

  return {
    totalAtividades: Number(resumo.total_atividades),
    totalHoras: Number(resumo.total_horas),
    ultimaParticipacao: paraIso(resumo.ultima_participacao),
    participacoes: candidaturas.filter((c) => c.status === "aprovado"),
  };
}


export async function listarDoProjeto(idProjeto, idUsuario) {
  await exigirCoordenador(idProjeto, idUsuario);

  const linhas = await CandidaturaRepository.listarDoProjeto(idProjeto);
  return linhas.map((c) => ({
    id: String(c.id_candidatura),
    alunoId: c.id_usuario,
    nome: c.nome,
    email: c.email,
    bio: c.bio ?? "",
    matricula: c.matricula,
    curso: c.curso,
    periodo: c.periodo,
    interesses: c.interesses,
    habilidades: c.habilidades,
    status: c.status,
    data: paraIso(c.data_inscricao),
    carta: c.carta_apresentacao ?? "",
    justificativa: c.justificativa_professor ?? "",
    certificado: c.id_certificado
      ? { id: String(c.id_certificado), cargaHoraria: c.carga_horaria }
      : null,
  }));
}

export async function decidir(idCandidatura, idUsuario, { status, justificativa } = {}) {
  if (!["aprovado", "reprovado"].includes(status)) throw invalido("Decisão inválida");
  const motivo = texto(justificativa, 1000, "texto da justificativa");

  const conexao = await pool.getConnection();
  let candidatura;
  let projeto;

  try {
    await conexao.beginTransaction();

    candidatura = await CandidaturaRepository.buscarPorId(idCandidatura, conexao, true);
    if (!candidatura) throw naoEncontrado("Candidatura não encontrada");

    projeto = await ProjetoRepository.buscarBruto(candidatura.id_atividade, conexao, true);
    if (!projeto || projeto.status === "cancelado") throw naoEncontrado("Projeto não encontrado");

    if (!(await ProjetoRepository.ehCoordenador(projeto.id_atividade, idUsuario, conexao))) {
      throw proibido("Apenas os coordenadores do projeto podem avaliar candidaturas");
    }

    if (candidatura.status !== status) {
      if (status === "aprovado") {
        if (projeto.status !== "ativo") throw conflito("O projeto não está mais ativo");
        await garantirVaga(projeto, conexao);
      }
      if (status === "reprovado" && candidatura.status === "aprovado") {
        const cert = await CandidaturaRepository.certificadoDaCandidatura(idCandidatura);
        if (cert) throw conflito("Já existe certificado emitido para este aluno");
      }
    }

    await CandidaturaRepository.atualizarDecisao(idCandidatura, status, motivo, conexao);

    await conexao.commit();
  } catch (erro) {
    await conexao.rollback();
    throw erro;
  } finally {
    conexao.release();
  }

  await NotificacaoService.notificar([candidatura.id_usuario], {
    mensagem: `Sua candidatura em "${projeto.titulo}" foi ${status === "aprovado" ? "aprovada" : "reprovada"}.`,
    tipo: "candidatura",
    link: "/candidaturas",
  });

  return { id: String(idCandidatura), status };
}


export async function adicionarIntegrante(idProjeto, idUsuario, idAluno) {
  await exigirCoordenador(idProjeto, idUsuario);

  const aluno = await UsuarioRepository.buscarPorId(idAluno);
  if (!aluno || !aluno.ativo || aluno.tipo_usuario !== "aluno") throw naoEncontrado("Aluno não encontrado");

  const conexao = await pool.getConnection();
  let projeto;

  try {
    await conexao.beginTransaction();

    projeto = await ProjetoRepository.buscarBruto(idProjeto, conexao, true);
    if (!projeto || projeto.status !== "ativo") throw conflito("O projeto não está ativo");

    const existente = await CandidaturaRepository.buscarDoAlunoNoProjeto(idAluno, idProjeto, conexao);
    if (existente?.status === "aprovado") throw conflito("Esse aluno já participa do projeto");

    await garantirVaga(projeto, conexao);

    const motivo = "Adicionado diretamente pelo coordenador.";
    if (existente) {
      await CandidaturaRepository.atualizarDecisao(existente.id_candidatura, "aprovado", motivo, conexao);
    } else {
      await CandidaturaRepository.criar(
        { id_usuario: idAluno, id_atividade: idProjeto, carta: null, status: "aprovado", justificativa: motivo },
        conexao
      );
    }

    await conexao.commit();
  } catch (erro) {
    await conexao.rollback();
    throw erro;
  } finally {
    conexao.release();
  }

  await NotificacaoService.notificar([idAluno], {
    mensagem: `Você foi adicionado ao projeto "${projeto.titulo}".`,
    tipo: "candidatura",
    link: `/projetos/${idProjeto}`,
  });
}

export async function removerIntegrante(idProjeto, idUsuario, idAluno) {
  await exigirCoordenador(idProjeto, idUsuario);

  const c = await CandidaturaRepository.buscarDoAlunoNoProjeto(idAluno, idProjeto);
  if (!c || c.status !== "aprovado") throw naoEncontrado("Esse aluno não participa do projeto");

  if (await CandidaturaRepository.certificadoDaCandidatura(c.id_candidatura)) {
    throw conflito("Já existe certificado emitido para este aluno");
  }

  await CandidaturaRepository.atualizarDecisao(c.id_candidatura, "reprovado", "Removido do projeto pelo coordenador.");
}
