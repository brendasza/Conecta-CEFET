import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import PDFDocument from "pdfkit";
import pool from "../config/database.js";
import * as CandidaturaRepository from "../repositories/CandidaturaRepository.js";
import * as ProjetoRepository from "../repositories/ProjetoRepository.js";
import * as UsuarioRepository from "../repositories/UsuarioRepository.js";
import * as NotificacaoService from "./NotificacaoService.js";
import { invalido, proibido, naoEncontrado, conflito } from "../utils/erros.js";
import { paraIso } from "../utils/texto.js";

const aqui = path.dirname(fileURLToPath(import.meta.url));
const PASTA = path.resolve(aqui, "../../storage/certificados");

function gerarPdf(caminho, d) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", layout: "landscape", margin: 60 });
    const saida = fs.createWriteStream(caminho);
    doc.pipe(saida);

    const largura = doc.page.width;
    const azul = "#102a52";

    doc.rect(25, 25, largura - 50, doc.page.height - 50).lineWidth(3).stroke(azul);

    doc.fillColor(azul).font("Helvetica-Bold").fontSize(34)
      .text("CERTIFICADO", 0, 110, { align: "center" });
    doc.font("Helvetica").fontSize(14).fillColor("#344c6c")
      .text("CEFET/RJ · Campus Nova Iguaçu · Conecta CEFET", 0, 155, { align: "center" });

    doc.fillColor("#000").fontSize(17).font("Helvetica")
      .text(
        `Certificamos que ${d.aluno}, matrícula ${d.matricula}, participou do projeto de ` +
          `${d.tipo.toLowerCase()} "${d.projeto}", sob coordenação de ${d.coordenador}, ` +
          `com carga horária total de ${d.cargaHoraria} hora${d.cargaHoraria === 1 ? "" : "s"}.`,
        90, 230, { align: "center", width: largura - 180, lineGap: 6 }
      );

    doc.fontSize(12).fillColor("#344c6c")
      .text(`Emitido em ${d.emissao}`, 0, 430, { align: "center" })
      .text(`Código de validação: CONECTA-${d.codigo}`, 0, 450, { align: "center" });

    doc.end();
    saida.on("finish", resolve);
    saida.on("error", reject);
  });
}

export async function emitir(idCandidatura, idUsuario, cargaHoraria) {
  const horas = Number(cargaHoraria);
  if (!Number.isInteger(horas) || horas < 1 || horas > 2000) {
    throw invalido("Informe a carga horária em horas (de 1 a 2000)");
  }

  const c = await CandidaturaRepository.buscarPorId(idCandidatura);
  if (!c) throw naoEncontrado("Candidatura não encontrada");

  if (!(await ProjetoRepository.ehCoordenador(c.id_atividade, idUsuario))) {
    throw proibido("Apenas os coordenadores do projeto podem emitir certificados");
  }
  if (c.status !== "aprovado") throw conflito("Certificados só podem ser emitidos para participantes aprovados");
  if (await CandidaturaRepository.certificadoDaCandidatura(idCandidatura)) {
    throw conflito("O certificado deste aluno já foi emitido");
  }

  const aluno = await UsuarioRepository.buscarPorId(c.id_usuario);
  const projeto = await ProjetoRepository.buscarPorId(c.id_atividade);
  const [[{ matricula }]] = await pool.query(
    "SELECT matricula FROM aluno WHERE id_usuario = ?",
    [c.id_usuario]
  );
  const coordenador = projeto.coordenadores.map((x) => x.nome).join(", ");

  const arquivo = `cert-${idCandidatura}.pdf`;
  const caminho = path.join(PASTA, arquivo);
  fs.mkdirSync(PASTA, { recursive: true });

  await gerarPdf(caminho, {
    aluno: aluno.nome,
    matricula,
    tipo: projeto.tipo,
    projeto: projeto.titulo,
    coordenador,
    cargaHoraria: horas,
    emissao: new Date().toLocaleDateString("pt-BR"),
    codigo: idCandidatura,
  });

  let id;
  try {
    id = await CandidaturaRepository.criarCertificado({
      id_candidatura: idCandidatura, carga_horaria: horas, arquivo_pdf: arquivo,
    });
  } catch (erro) {
    fs.unlink(caminho, () => {});
    throw erro;
  }

  await NotificacaoService.notificar([c.id_usuario], {
    mensagem: `Seu certificado de "${projeto.titulo}" está disponível.`,
    tipo: "certificado",
    link: "/candidaturas",
  });

  return { id: String(id), cargaHoraria: horas };
}

export async function caminhoParaDownload(idCertificado, usuario) {
  const cert = await CandidaturaRepository.buscarCertificado(idCertificado);
  if (!cert) throw naoEncontrado("Certificado não encontrado");

  const permitido =
    cert.id_usuario === usuario.id ||
    usuario.tipo === "administrador" ||
    (await ProjetoRepository.ehCoordenador(cert.id_atividade, usuario.id));
  if (!permitido) throw proibido();

  const caminho = path.join(PASTA, path.basename(cert.arquivo_pdf));
  if (!fs.existsSync(caminho)) throw naoEncontrado("Arquivo do certificado não encontrado");

  return { caminho, nome: `certificado-${cert.id_certificado}.pdf` };
}

export async function validar(idCertificado) {
  const cert = await CandidaturaRepository.buscarCertificado(idCertificado);
  if (!cert) return { valido: false };

  return {
    valido: true,
    aluno: cert.aluno_nome,
    projeto: cert.titulo,
    tipo: cert.tipo,
    cargaHoraria: cert.carga_horaria,
    emissao: paraIso(cert.data_emissao),
  };
}
