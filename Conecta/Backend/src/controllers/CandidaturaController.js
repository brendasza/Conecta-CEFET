import * as CandidaturaService from "../services/CandidaturaService.js";
import * as CertificadoService from "../services/CertificadoService.js";
import { inteiroPositivo } from "../utils/texto.js";

const id = (req, nome = "id") => inteiroPositivo(req.params[nome], nome);

/* aluno */

export async function candidatar(req, res) {
  const candidatura = await CandidaturaService.candidatar(req.usuario.id, id(req), req.body.carta);
  res.status(201).json({ candidatura });
}

export async function cancelar(req, res) {
  await CandidaturaService.cancelar(id(req), req.usuario.id);
  res.status(204).end();
}

export async function minhas(req, res) {
  res.json({ candidaturas: await CandidaturaService.listarDoAluno(req.usuario.id) });
}

export async function historico(req, res) {
  res.json(await CandidaturaService.historico(req.usuario.id));
}

/* professor */

export async function listarDoProjeto(req, res) {
  res.json({ candidaturas: await CandidaturaService.listarDoProjeto(id(req), req.usuario.id) });
}

export async function decidir(req, res) {
  res.json({ candidatura: await CandidaturaService.decidir(id(req), req.usuario.id, req.body) });
}

export async function adicionarIntegrante(req, res) {
  await CandidaturaService.adicionarIntegrante(
    id(req), req.usuario.id, inteiroPositivo(req.body.idUsuario, "aluno")
  );
  res.status(201).json({ mensagem: "Aluno adicionado" });
}

export async function removerIntegrante(req, res) {
  await CandidaturaService.removerIntegrante(id(req), req.usuario.id, id(req, "idAluno"));
  res.status(204).end();
}

/* certificados */

export async function emitirCertificado(req, res) {
  res.status(201).json({
    certificado: await CertificadoService.emitir(id(req), req.usuario.id, req.body.cargaHoraria),
  });
}

export async function baixarCertificado(req, res) {
  const { caminho, nome } = await CertificadoService.caminhoParaDownload(id(req), req.usuario);
  res.download(caminho, nome);
}

export async function validarCertificado(req, res) {
  res.json(await CertificadoService.validar(id(req)));
}
