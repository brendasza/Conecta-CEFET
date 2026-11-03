// Erro "esperado": vira resposta HTTP com a mensagem para o usuário.
export class AppError extends Error {
  constructor(status, mensagem) {
    super(mensagem);
    this.status = status;
    this.mensagem = mensagem;
  }
}

export const invalido = (m = "Dados inválidos") => new AppError(400, m);
export const naoAutorizado = (m = "Não autorizado") => new AppError(401, m);
export const proibido = (m = "Acesso negado") => new AppError(403, m);
export const naoEncontrado = (m = "Não encontrado") => new AppError(404, m);
export const conflito = (m = "Conflito") => new AppError(409, m);
