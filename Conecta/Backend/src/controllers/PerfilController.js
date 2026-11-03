import * as PerfilService from "../services/PerfilService.js";

function tratarErro(erro, res) {
  console.error(erro);

  if (erro.message === "DADOS_INVALIDOS") {
    return res.status(400).json({ erro: "Dados inválidos. Confira os campos do perfil" });
  }
  if (erro.message === "USUARIO_NAO_ENCONTRADO") {
    return res.status(404).json({ erro: "Usuário não encontrado" });
  }
  return res.status(500).json({ erro: "Erro interno" });
}

export async function buscarMe(req, res) {
  try {
    res.json({ usuario: await PerfilService.buscarMe(req.usuario.id) });
  } catch (erro) {
    tratarErro(erro, res);
  }
}

export async function atualizarMe(req, res) {
  try {
    res.json({ usuario: await PerfilService.atualizarMe(req.usuario.id, req.body) });
  } catch (erro) {
    tratarErro(erro, res);
  }
}

export async function buscarPublico(req, res) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) throw new Error("USUARIO_NAO_ENCONTRADO");
    res.json({ usuario: await PerfilService.buscarPublico(id) });
  } catch (erro) {
    tratarErro(erro, res);
  }
}
