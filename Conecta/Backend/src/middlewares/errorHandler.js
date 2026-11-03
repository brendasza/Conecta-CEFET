import { AppError } from "../utils/erros.js";

export function errorHandler(err, req, res, next) {
  if (err instanceof AppError) {
    return res.status(err.status).json({ erro: err.mensagem });
  }
  if (err?.code === "LIMIT_FILE_SIZE") {
    return res.status(413).json({ erro: "Arquivo grande demais" });
  }
  if (err?.name === "MulterError") {
    return res.status(400).json({ erro: "Não foi possível enviar o arquivo" });
  }
  console.error(err);
  res.status(500).json({ erro: "Algo deu errado no servidor" });
}
