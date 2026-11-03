import { Router } from "express";
import { autenticar, exigirTipo } from "../middlewares/autenticar.js";
import * as A from "../controllers/AgendaPessoalController.js";

const router = Router();
const aluno = exigirTipo("aluno", "professor", "administrador"); // lembretes
const professor = exigirTipo("professor", "administrador"); // eventos institucionais

// agenda pessoal: cada pessoa enxerga e altera só os próprios lembretes
router.get("/me/agenda", autenticar, aluno, A.listar);
router.post("/me/agenda", autenticar, aluno, A.criar);
router.put("/me/agenda/:id", autenticar, aluno, A.atualizar);
router.delete("/me/agenda/:id", autenticar, aluno, A.excluir);

// professor: eventos institucionais no calendário (só altera os que ele criou)
router.post("/me/eventos", autenticar, professor, A.criarEvento);
router.put("/me/eventos/:id", autenticar, professor, A.atualizarEvento);
router.delete("/me/eventos/:id", autenticar, professor, A.excluirEvento);

export default router;
