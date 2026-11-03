import * as BuscaService from "../services/BuscaService.js";

export async function buscar(req, res) {
  res.json(await BuscaService.buscar(req.query.q, req.query.limite));
}
