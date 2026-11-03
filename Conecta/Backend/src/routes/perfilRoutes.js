import { Router } from "express";
import { autenticar } from "../middlewares/autenticar.js";
import * as PerfilController from "../controllers/PerfilController.js";

const router = Router();

router.get("/me", autenticar, PerfilController.buscarMe);
router.put("/me", autenticar, PerfilController.atualizarMe);
router.get("/usuarios/:id/perfil", autenticar, PerfilController.buscarPublico);

export default router;