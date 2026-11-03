import jwt from "jsonwebtoken";
import pool from "../config/database.js";
import { nivelDoAdministrador } from "../repositories/AdminRepository.js";

// Confere o token E se o usuário continua ativo (um admin pode desativar contas).
export async function autenticar(req, res, next) {
  const cabecalho = req.headers.authorization || "";
  const [esquema, token] = cabecalho.split(" ");

  if (esquema !== "Bearer" || !token) {
    return res.status(401).json({ erro: "Token não informado" });
  }

  let dados;
  try {
    dados = jwt.verify(token, process.env.JWT_SECRET); // { id, tipo }
  } catch {
    return res.status(401).json({ erro: "Token inválido ou expirado" });
  }

  const [[usuario]] = await pool.query(
    "SELECT tipo_usuario, ativo FROM usuario WHERE id_usuario = ?",
    [dados.id]
  );

  if (!usuario || !usuario.ativo) {
    return res.status(401).json({ erro: "Conta inativa ou inexistente" });
  }

  req.usuario = { id: dados.id, tipo: usuario.tipo_usuario };
  next();
}

// Libera só alguns tipos do banco. Exemplo: exigirTipo("professor")
export function exigirTipo(...tipos) {
  return (req, res, next) => {
    if (!tipos.includes(req.usuario?.tipo)) {
      return res.status(403).json({ erro: "Acesso negado" });
    }
    next();
  };
}

// Administradores têm nível 1 (básico), 2 (conteúdo e cadastros) ou 3 (total: contas e logs).
export function exigirNivel(minimo) {
  return async (req, res, next) => {
    if (req.usuario?.tipo !== "administrador") {
      return res.status(403).json({ erro: "Acesso negado" });
    }
    const nivel = await nivelDoAdministrador(req.usuario.id);
    if (nivel < minimo) {
      return res.status(403).json({ erro: "Seu nível de acesso não permite esta ação" });
    }
    next();
  };
}
