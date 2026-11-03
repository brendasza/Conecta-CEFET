import { Router } from "express";
import { autenticar, exigirTipo, exigirNivel } from "../middlewares/autenticar.js";
import * as A from "../controllers/AdminController.js";

const router = Router();
router.use("/admin", autenticar, exigirTipo("administrador"));

// Níveis de acesso: 1 = consulta · 2 = conteúdo e cadastros · 3 = total (contas e logs)
const conteudo = exigirNivel(2);
const total = exigirNivel(3);

router.get("/admin/dashboard", A.dashboard);

router.get("/admin/usuarios", A.listarUsuarios);
router.put("/admin/usuarios/:id/ativo", total, A.definirAtivo);
router.put("/admin/usuarios/:id/nivel", total, A.alterarNivel);

router.get("/admin/projetos", A.listarProjetos);

router.post("/admin/noticias", conteudo, A.criarNoticia);
router.put("/admin/noticias/:id", conteudo, A.atualizarNoticia);
router.delete("/admin/noticias/:id", conteudo, A.excluirNoticia);

router.post("/admin/eventos", conteudo, A.criarEvento);
router.put("/admin/eventos/:id", conteudo, A.atualizarEvento);
router.delete("/admin/eventos/:id", conteudo, A.excluirEvento);

// ano letivo: anos, semestres e recessos
router.get("/admin/anos-letivos", A.listarAnosLetivos);
router.post("/admin/anos-letivos", conteudo, A.salvarAnoLetivo);
router.delete("/admin/anos-letivos/:ano", conteudo, A.excluirAnoLetivo);
router.post("/admin/anos-letivos/:ano/periodos", conteudo, A.criarPeriodo);
router.put("/admin/periodos/:id", conteudo, A.atualizarPeriodo);
router.delete("/admin/periodos/:id", conteudo, A.excluirPeriodo);

// cadastros de apoio: categoria = areas | tipos | habilidades
router.get("/admin/apoio/:categoria", A.listarApoio);
router.post("/admin/apoio/:categoria", conteudo, A.criarApoio);
router.put("/admin/apoio/:categoria/:id", conteudo, A.renomearApoio);
router.delete("/admin/apoio/:categoria/:id", conteudo, A.excluirApoio);

// moderação
router.get("/admin/posts", A.listarPosts);
router.delete("/admin/posts/:id", conteudo, A.removerPost);

// RNF004
router.get("/admin/logs", total, A.listarLogs);

export default router;
