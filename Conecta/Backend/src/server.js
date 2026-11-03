import express from "express";
import cors from "cors";
import "dotenv/config";
import authRoutes from "./routes/authRoutes.js";
import perfilRoutes from "./routes/perfilRoutes.js";
import projetoRoutes from "./routes/projetoRoutes.js";
import candidaturaRoutes from "./routes/candidaturaRoutes.js";
import notificacaoRoutes from "./routes/notificacaoRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import buscaRoutes from "./routes/buscaRoutes.js";
import agendaPessoalRoutes from "./routes/agendaPessoalRoutes.js";
import { auditoria } from "./middlewares/auditoria.js";
import { errorHandler } from "./middlewares/errorHandler.js";
import { PASTA_UPLOADS } from "./middlewares/upload.js";

process.env.JWT_SECRET = process.env.JWT_SECRET || "BrendaGeovanaMariana";

const app = express();

app.disable("x-powered-by");
app.use(cors({ origin: (process.env.CORS_ORIGIN || "http://localhost:5173").split(",") }));
app.use(express.json({ limit: "1mb" }));

// fotos e vídeo
app.use("/uploads", express.static(PASTA_UPLOADS, { setHeaders: (res) => res.set("Cross-Origin-Resource-Policy", "cross-origin") }));

// RNF004
app.use("/api", auditoria);

app.use("/api", authRoutes);
app.use("/api", perfilRoutes);
app.use("/api", projetoRoutes);
app.use("/api", candidaturaRoutes);
app.use("/api", notificacaoRoutes);
app.use("/api", buscaRoutes);
app.use("/api", agendaPessoalRoutes);
app.use("/api", adminRoutes);

app.use((req, res) => res.status(404).json({ erro: "Rota não encontrada" }));
app.use(errorHandler);

const PORTA = process.env.PORT || 3000;
app.listen(PORTA, () => {
  console.log(`Servidor rodando em http://localhost:${PORTA}`);
});
