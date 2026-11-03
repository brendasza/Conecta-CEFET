import * as LogService from "../services/LogService.js";

// RNF004: registro automático (auditoria) das ações que alteram dados.
// Só grava requisições bem-sucedidas que não sejam de leitura. Rotas /admin já têm
// log próprio (com detalhes), então não entram aqui para não duplicar.
const IGNORAR = [/^\/api\/admin\//, /^\/api\/me\/notificacoes/, /^\/api\/notificacoes\//];

const ACOES_FIXAS = {
  "POST /api/login": "usuario.login",
  "POST /api/cadastro": "usuario.cadastrado",
};

function rotaNormalizada(caminho) {
  return caminho.replace(/\/\d+(?=\/|$)/g, "/:id");
}

export function auditoria(req, res, next) {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();

  const caminho = req.originalUrl.split("?")[0];
  if (IGNORAR.some((r) => r.test(caminho))) return next();

  // login e cadastro ainda não têm req.usuario: pegamos o id na resposta
  let idDaResposta = null;
  const jsonOriginal = res.json.bind(res);
  res.json = (corpo) => {
    idDaResposta = corpo?.usuario?.id ?? corpo?.id ?? null;
    return jsonOriginal(corpo);
  };

  res.on("finish", () => {
    const rota = rotaNormalizada(caminho);
    const chave = `${req.method} ${rota}`;
    const emailTentativa = typeof req.body?.email === "string" ? req.body.email.slice(0, 150) : null;

    if (res.statusCode >= 400) {
      // só interessa registrar login que falhou (tentativas de acesso)
      if (chave === "POST /api/login" && res.statusCode === 401) {
        LogService.registrar(null, "usuario.login_falhou", "usuario", null, emailTentativa);
      }
      return;
    }

    const partes = rota.split("/").filter(Boolean); // ["api", "projetos", ":id", ...]
    const entidade = partes[1] === "me" ? partes[2] ?? "me" : partes[1] ?? null;
    const idEntidade = caminho.match(/\/(\d+)(?=\/|$)/)?.[1] ?? null;
    const acao = ACOES_FIXAS[chave] ?? `api.${req.method.toLowerCase()}`;
    const detalhe = chave in ACOES_FIXAS ? emailTentativa : rota;

    LogService.registrar(req.usuario?.id ?? idDaResposta, acao, entidade, idEntidade, detalhe);
  });

  next();
}
