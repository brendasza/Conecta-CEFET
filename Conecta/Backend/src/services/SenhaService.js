import bcrypt from "bcrypt";
import crypto from "node:crypto";
import pool from "../config/database.js";
import * as UsuarioRepository from "../repositories/UsuarioRepository.js";
import * as LogService from "./LogService.js";
import { invalido } from "../utils/erros.js";

const VALIDADE_MIN = 30;
const sha = (t) => crypto.createHash("sha256").update(t).digest("hex");


export async function solicitar(email) {
  const resposta = { mensagem: "Se o e-mail estiver cadastrado, você receberá as instruções de redefinição." };
  const usuario = await UsuarioRepository.buscarPorEmail(String(email ?? "").trim().toLowerCase());
  if (!usuario || !usuario.ativo) return resposta; 

  const token = crypto.randomBytes(32).toString("base64url");
  await pool.query("UPDATE recuperacao_senha SET usado = TRUE WHERE id_usuario = ? AND usado = FALSE", [usuario.id_usuario]);
  await pool.query(
    `INSERT INTO recuperacao_senha (id_usuario, token_hash, expira_em)
     VALUES (?, ?, DATE_ADD(NOW(), INTERVAL ? MINUTE))`,
    [usuario.id_usuario, sha(token), VALIDADE_MIN]
  );
  await LogService.registrar(usuario.id_usuario, "senha.solicitada", "usuario", usuario.id_usuario);

  const base = (process.env.FRONTEND_URL || "http://localhost:5173").replace(/\/$/, "");
  const link = `${base}/redefinir-senha?token=${token}`;
  console.log(`[recuperação de senha] ${usuario.email}: ${link}`);

  if (process.env.NODE_ENV !== "production") resposta.linkDev = link;
  return resposta;
}

export async function redefinir(token, senha) {
  if (!token) throw invalido("Link inválido ou expirado");
  if (String(senha ?? "").length < 8) throw invalido("A senha deve ter pelo menos 8 caracteres");

  const [[linha]] = await pool.query(
    `SELECT id_recuperacao, id_usuario FROM recuperacao_senha
      WHERE token_hash = ? AND usado = FALSE AND expira_em > NOW()`,
    [sha(String(token))]
  );
  if (!linha) throw invalido("Link inválido ou expirado. Solicite um novo.");

  const hash = await bcrypt.hash(senha, 10);
  await pool.query("UPDATE usuario SET senha_hash = ? WHERE id_usuario = ?", [hash, linha.id_usuario]);
  await pool.query("UPDATE recuperacao_senha SET usado = TRUE WHERE id_usuario = ?", [linha.id_usuario]);
  await LogService.registrar(linha.id_usuario, "senha.redefinida", "usuario", linha.id_usuario);
}
