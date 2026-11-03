import { Router } from "express";
import { autenticar } from "../middlewares/autenticar.js";
import * as N from "../controllers/NotificacaoController.js";

const router = Router();

router.get("/me/notificacoes", autenticar, N.listar);
router.get("/me/notificacoes/nao-lidas", autenticar, N.contar);
router.put("/me/notificacoes/lidas", autenticar, N.marcarTodasLidas);
router.put("/notificacoes/:id/lida", autenticar, N.marcarLida);

router.get("/noticias", autenticar, N.noticias);
router.get("/agenda", autenticar, N.agenda);

export default router;
