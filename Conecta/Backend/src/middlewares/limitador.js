// Limitador simples em memória (por IP), para frear tentativas de força bruta no login.
export function limitar({ max = 10, janelaMs = 15 * 60 * 1000 } = {}) {
  const acessos = new Map();

  return (req, res, next) => {
    const agora = Date.now();
    const chave = req.ip;
    const lista = (acessos.get(chave) || []).filter((t) => agora - t < janelaMs);

    if (lista.length >= max) {
      return res
        .status(429)
        .json({ erro: "Muitas tentativas. Aguarde alguns minutos e tente de novo." });
    }

    lista.push(agora);
    acessos.set(chave, lista);
    next();
  };
}
