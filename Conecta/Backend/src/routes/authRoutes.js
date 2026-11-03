import { Router } from "express";
import * as AuthController from "../controllers/AuthController.js";
import { limitar } from "../middlewares/limitador.js";

const router = Router();

router.post("/cadastro", limitar({ max: 20 }), AuthController.cadastrar);
router.post("/recuperar-senha", limitar({ max: 5 }), AuthController.recuperarSenha);
router.post("/redefinir-senha", limitar({ max: 10 }), AuthController.redefinirSenha);
router.post("/login", limitar({ max: 10 }), AuthController.login);

export default router;
