import { Router } from "express";
import { autenticar } from "../middlewares/autenticar.js";
import * as B from "../controllers/BuscaController.js";

const router = Router();

// qualquer usuário logado (aluno, professor ou administrador) pode buscar
router.get("/busca", autenticar, B.buscar);

export default router;
