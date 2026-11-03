import { Router } from "express";
import { autenticar, exigirTipo } from "../middlewares/autenticar.js";
import { uploadMidia } from "../middlewares/upload.js";
import * as ProjetoController from "../controllers/ProjetoController.js";

const router = Router();
// professor e administrador têm as mesmas funções de coordenação de atividades
const professor = exigirTipo("professor", "administrador");

// leitura (qualquer usuário logado)
router.get("/feed", autenticar, ProjetoController.feed);
router.get("/opcoes", autenticar, ProjetoController.opcoes);
router.get("/projetos", autenticar, ProjetoController.listar);
router.get("/projetos/:id", autenticar, ProjetoController.buscarPorId);
router.get("/me/projetos", autenticar, ProjetoController.listarMeus);

// acompanhar (notificações do projeto)
router.post("/projetos/:id/seguir", autenticar, ProjetoController.alternarSeguir);
router.get("/me/seguindo", autenticar, ProjetoController.listarSeguidos);

// professor: gerenciar projetos (a checagem "é coordenador deste projeto" fica no service)
router.post("/projetos", autenticar, professor, ProjetoController.criar);
router.put("/projetos/:id", autenticar, professor, ProjetoController.atualizar);
router.put("/projetos/:id/inscricoes", autenticar, professor, ProjetoController.atualizarInscricoes);

// linha do tempo editável do projeto (ano + o que aconteceu)
router.post("/projetos/:id/historico", autenticar, professor, ProjetoController.criarHistorico);
router.put("/projetos/:id/historico/:idItem", autenticar, professor, ProjetoController.atualizarHistorico);
router.delete("/projetos/:id/historico/:idItem", autenticar, professor, ProjetoController.excluirHistorico);

router.post("/projetos/:id/encerrar", autenticar, professor, ProjetoController.encerrar);
// professor: exclui a própria atividade · administrador: DESATIVA (e pode ativar de novo)
router.delete("/projetos/:id", autenticar, exigirTipo("professor", "administrador"), ProjetoController.excluir);
router.post("/projetos/:id/ativar", autenticar, exigirTipo("administrador"), ProjetoController.ativar);

router.post(
  "/projetos/:id/posts",
  autenticar, professor, uploadMidia.array("arquivos", 6), ProjetoController.publicar
);
router.delete(
  "/projetos/:id/posts/:idPost",
  autenticar, exigirTipo("professor", "administrador"), ProjetoController.excluirPost
);

router.get("/professores", autenticar, professor, ProjetoController.listarProfessores);
router.get("/alunos/buscar", autenticar, professor, ProjetoController.buscarAlunos);
router.post("/projetos/:id/coordenadores", autenticar, professor, ProjetoController.adicionarCoordenador);

export default router;
