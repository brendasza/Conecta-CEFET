import { invalido } from "./erros.js";

// Texto limpo; "" se não veio. Lança erro se passar do limite.
export function texto(valor, max, campo = "campo") {
  const limpo = String(valor ?? "").trim();
  if (limpo.length > max) throw invalido(`O ${campo} passou do limite de ${max} caracteres`);
  return limpo;
}

export function textoObrigatorio(valor, max, campo) {
  const limpo = texto(valor, max, campo);
  if (!limpo) throw invalido(`Preencha o ${campo}`);
  return limpo;
}

// "2026-11-30T18:00" (datetime-local) -> "2026-11-30 18:00:00"; vazio -> null
export function dataMysql(valor, campo = "data") {
  if (valor === undefined || valor === null || valor === "") return null;
  const m = String(valor).match(/^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2})(?::(\d{2}))?/);
  if (!m) throw invalido(`Data inválida em ${campo}`);
  return `${m[1]} ${m[2]}:${m[3] || "00"}`;
}

// "2026-11-30 18:00:00" -> "2026-11-30T18:00:00" (o navegador lê como horário local)
export function paraIso(valor) {
  if (!valor) return null;
  return String(valor).replace(" ", "T");
}

// Escapa % e _ para usar em LIKE
export function likeSeguro(termo) {
  return `%${String(termo).replace(/[\\%_]/g, "\\$&")}%`;
}

export function inteiroPositivo(valor, campo = "valor") {
  const n = Number(valor);
  if (!Number.isInteger(n) || n <= 0) throw invalido(`${campo} inválido`);
  return n;
}
