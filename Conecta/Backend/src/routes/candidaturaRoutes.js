import { Router } from "express";
import { autenticar, exigirTipo } from "../middlewares/autenticar.js";
import * as C from "../controllers/CandidaturaController.js";

const router = Router();
const aluno = exigirTipo("aluno");
const professor = exigirTipo("professor", "administrador");

// aluno
router.post("/projetos/:id/candidaturas", autenticar, aluno, C.candidatar);
router.delete("/candidaturas/:id", autenticar, aluno, C.cancelar);
router.get("/me/candidaturas", autenticar, aluno, C.minhas);
router.get("/me/historico", autenticar, aluno, C.historico);

// professor
router.get("/projetos/:id/candidaturas", autenticar, professor, C.listarDoProjeto);
router.put("/candidaturas/:id", autenticar, professor, C.decidir);
router.post("/projetos/:id/integrantes", autenticar, professor, C.adicionarIntegrante);
router.delete("/projetos/:id/integrantes/:idAluno", autenticar, professor, C.removerIntegrante);
router.post("/candidaturas/:id/certificado", autenticar, professor, C.emitirCertificado);

// certificados
router.get("/certificados/:id/validar", C.validarCertificado); // pública
router.get("/certificados/:id/download", autenticar, C.baixarCertificado);

export default router;
