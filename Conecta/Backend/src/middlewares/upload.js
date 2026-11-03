import multer from "multer";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { invalido } from "../utils/erros.js";

const aqui = path.dirname(fileURLToPath(import.meta.url));
export const PASTA_UPLOADS = path.resolve(aqui, "../../uploads");

const LIMITE_IMAGEM = 10 * 1024 * 1024;
const LIMITE_VIDEO = 200 * 1024 * 1024;

const storage = multer.diskStorage({
  destination: PASTA_UPLOADS,
  filename: (req, arquivo, cb) => {
    const ext = path.extname(arquivo.originalname).toLowerCase().slice(0, 10);
    cb(null, `${Date.now()}-${crypto.randomBytes(6).toString("hex")}${ext}`);
  },
});

export const uploadMidia = multer({
  storage,
  limits: { fileSize: LIMITE_VIDEO, files: 6 },
  fileFilter: (req, arquivo, cb) => {
    const ok =
      arquivo.mimetype.startsWith("image/") || arquivo.mimetype.startsWith("video/");
    if (!ok) return cb(invalido(`"${arquivo.originalname}" não é uma foto nem um vídeo`));
    cb(null, true);
  },
});

export { LIMITE_IMAGEM };
