import { paraIso } from "../utils/texto.js";

export function inscricoesAbertas(p) {
  return (
    p.status === "ativo" &&
    p.vagas_totais != null &&
    Boolean(Number(p.prazo_aberto)) &&
    Number(p.vagas_ocupadas) < p.vagas_totais
  );
}

export function paraPostDTO(post, urlBase = "") {
  return {
    id: String(post.id_post),
    autorNome: post.autor_nome,
    texto: post.texto ?? "",
    midia: (post.midia || []).map((m) => ({ ...m, url: `${urlBase}${m.url}` })),
    ehVaga: Boolean(post.eh_vaga),
    vagas: post.vagas,
    data: paraIso(post.data_publicacao),
  };
}

export function paraProjetoDTO(p, urlBase = "") {
  const ocupadas = Number(p.vagas_ocupadas ?? 0);

  return {
    id: String(p.id_atividade),
    nome: p.titulo,
    objetivo: p.objetivo ?? "",
    descricao: p.descricao ?? "",
    requisitos: p.requisitos ?? "",
    criterios: p.criterios_selecao ?? "",
    area: p.area,
    tipo: p.tipo,
    status: p.status,
    tags: p.tags ?? [],
    dataCriacao: paraIso(p.created_at),
    vagasTotais: p.vagas_totais,
    vagasOcupadas: ocupadas,
    vagasDisponiveis: p.vagas_totais == null ? null : Math.max(p.vagas_totais - ocupadas, 0),
    inicioInscricao: paraIso(p.data_inicio_inscricao),
    fimInscricao: paraIso(p.data_fim_inscricao),
    inscricoesAbertas: inscricoesAbertas(p),
    pendentes: Number(p.pendentes ?? 0),
    seguidores: Number(p.seguidores ?? 0),
    coordenadores: p.coordenadores ?? [],
    integrantes: p.integrantes ?? [],
    posts: (p.posts ?? []).map((x) => paraPostDTO(x, urlBase)),
    timeline: (p.timeline ?? []).map((e) => ({
      id: String(e.id_historico),
      ano: e.ano,
      titulo: e.titulo,
      descricao: e.descricao ?? "",
    })),
  };
}
