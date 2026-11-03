import * as AuthService from "../services/AuthService.js";
import { paraUsuarioDTO } from "../dtos/UsuarioDTO.js";
import * as SenhaService from "../services/SenhaService.js";

export async function cadastrar(req, res) {
  try {
    const id = await AuthService.cadastrar(req.body);

    res.status(201).json({ id, mensagem: "Usuário cadastrado com sucesso" });
  } catch (erro) {
    console.error(erro); 

    if (erro.message === "DADOS_INVALIDOS") {
      return res.status(400).json({ erro: "Preencha todos os campos obrigatórios" });
    }
    if (erro.message === "EMAIL_JA_CADASTRADO") {
      return res.status(409).json({ erro: "Esse e-mail já está cadastrado" });
    }
    if (erro.code === "ER_DUP_ENTRY") {
      if (erro.message.includes("uq_aluno_matricula")) {
        return res.status(409).json({ erro: "Essa matrícula já está cadastrada" });
      }
      if (erro.message.includes("uq_professor_siape")) {
        return res.status(409).json({ erro: "Esse SIAPE já está cadastrado" });
      }
      return res.status(409).json({ erro: "Esse e-mail já está cadastrado" });
    }
    res.status(500).json({ erro: "Erro interno ao cadastrar" });
  }
}

export async function login(req, res) {
  try {
    const { email, senha } = req.body;

      const { token, usuario, perfil } = await AuthService.login({ email, senha });

      res.status(200).json({
      token,
      usuario: paraUsuarioDTO(usuario, perfil),
    });
  } catch (erro) {
    console.error(erro); // <-- NOVO: mesmo ajuste aqui

    if (erro.message === "CREDENCIAIS_INVALIDAS") {
      return res.status(401).json({ erro: "E-mail ou senha incorretos" });
    }
    res.status(500).json({ erro: "Erro interno ao fazer login" });
  }
}

export async function recuperarSenha(req, res) {
  res.json(await SenhaService.solicitar(req.body?.email));
}

export async function redefinirSenha(req, res) {
  await SenhaService.redefinir(req.body?.token, req.body?.senha);
  res.json({ mensagem: "Senha alterada. Faça login com a nova senha." });
}
