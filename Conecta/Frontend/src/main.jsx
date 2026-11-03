import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import "./index.css";

import App from "./App.jsx";
import Login from "./Paginas/login/Login.jsx";
import Cadastro from "./Paginas/Cadastro/Cadastro.jsx";
import Perfil from "./Paginas/Perfil/Perfil.jsx";
import EditarPerfil from "./Paginas/EditarPerfil/EditarPerfil.jsx";
import Notificacoes from "./Paginas/Notificacoes/Notificacoes.jsx";
import CriarProjeto from "./Paginas/CriarProjeto/CriarProjeto.jsx";
import Projeto from "./Paginas/Projeto/Projeto.jsx";
import Agenda from "./Paginas/Agenda/Agenda.jsx";
import Candidaturas from "./Paginas/Candidaturas/Candidaturas.jsx";
import Admin from "./Paginas/Admin/Admin.jsx";
import RecuperarSenha from "./Paginas/RecuperarSenha/RecuperarSenha.jsx";
import PerfilPublico from "./Paginas/PerfilPublico/PerfilPublico.jsx";
import RotaProtegida from "./Componentes/RotaProtegida.jsx";
import Layout from "./Componentes/Layout.jsx";

const PROFESSOR = ["funcionario", "administrador"]; // professor e administrador coordenam atividades
const ALUNO = ["aluno"];
const ADMIN = ["administrador"];

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        {/* públicas */}
        <Route path="/login" element={<Login />} />
        <Route path="/cadastro" element={<Cadastro />} />
        <Route path="/recuperar-senha" element={<RecuperarSenha />} />
        <Route path="/redefinir-senha" element={<RecuperarSenha />} />

        {/* qualquer usuário logado */}
        <Route path="/" element={<RotaProtegida><App /></RotaProtegida>} />
        <Route path="/agenda" element={<RotaProtegida><Agenda /></RotaProtegida>} />
        <Route path="/notificacoes" element={<RotaProtegida><Layout><Notificacoes /></Layout></RotaProtegida>} />
        <Route path="/perfil" element={<RotaProtegida><Layout><Perfil /></Layout></RotaProtegida>} />
        <Route path="/perfil/projetos" element={<RotaProtegida><Layout><Perfil focarProjetos /></Layout></RotaProtegida>} />
        <Route path="/perfil/editar" element={<RotaProtegida><Layout><EditarPerfil /></Layout></RotaProtegida>} />
        <Route path="/projetos/:id" element={<RotaProtegida><Layout><Projeto /></Layout></RotaProtegida>} />

        <Route path="/usuarios/:id" element={<RotaProtegida><Layout><PerfilPublico /></Layout></RotaProtegida>} />

        {/* aluno */}
        <Route path="/candidaturas" element={<RotaProtegida tipos={ALUNO}><Candidaturas /></RotaProtegida>} />

        {/* professor */}
        <Route path="/projetos/criar" element={<RotaProtegida tipos={PROFESSOR}><Layout><CriarProjeto /></Layout></RotaProtegida>} />
        <Route path="/projetos/:id/editar" element={<RotaProtegida tipos={PROFESSOR}><Layout><CriarProjeto /></Layout></RotaProtegida>} />

        {/* administrador */}
        <Route path="/admin" element={<RotaProtegida tipos={ADMIN}><Admin /></RotaProtegida>} />
      </Routes>
    </BrowserRouter>
  </StrictMode>
);
