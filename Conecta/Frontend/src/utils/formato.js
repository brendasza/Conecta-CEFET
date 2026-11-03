export function normalizar(texto = "") {
  return String(texto)
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export function getIniciais(nome = "") {
  const partes = nome.trim().split(" ").filter(Boolean);
  if (partes.length === 0) return "??";
  const primeira = partes[0][0];
  const ultima = partes.length > 1 ? partes[partes.length - 1][0] : "";
  return (primeira + ultima).toUpperCase();
}

export function formatarData(iso, opcoes = { day: "2-digit", month: "short", year: "numeric" }) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("pt-BR", opcoes);
}

export function formatarDataHora(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

// "2026-11-30T18:00:00" -> "2026-11-30T18:00" (valor de <input type="datetime-local">)
export function paraInputData(iso) {
  return iso ? String(iso).slice(0, 16) : "";
}

export const ROTULO_STATUS = {
  pendente: "Pendente",
  aprovado: "Aprovado",
  reprovado: "Reprovado",
  ativo: "Ativo",
  encerrado: "Encerrado",
  cancelado: "Desativado",
};

export const ROTULO_TIPO_USUARIO = {
  aluno: "Estudante",
  funcionario: "Professor",
  professor: "Professor",
  administrador: "Administrador",
};

// "Projeto" é o termo exclusivo de Projetos de Extensão; as demais produções
// (monitoria, iniciação científica, disciplinas...) são "Atividade Acadêmica".
export const ehProjetoDeExtensao = (tipo) => normalizar(tipo).includes("extens");

export const termoAtividade = (tipo) => (ehProjetoDeExtensao(tipo) ? "projeto de extensão" : "atividade acadêmica");
