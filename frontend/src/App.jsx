import React from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import { Login } from "./pages/Login";
import { Shell } from "./components/Shell";
import { AlunoPage } from "./pages/AlunoPage";
import { ProfessorPage } from "./pages/ProfessorPage";
import { DiretorPage } from "./pages/DiretorPage";
import { RankingPage } from "./pages/RankingPage";
import { RelatorioPage } from "./pages/RelatorioPage";
import { AlunosPage } from "./pages/AlunosPage";
import { ConfiguracoesPage } from "./pages/ConfiguracoesPage";
import { NotificationProvider } from "./components/NotificationProvider";

function Home() {
  const { usuario } = useAuth();

  if (!usuario) return <Navigate to="/login" replace />;
  if (usuario.papel === "ALUNO") return <Navigate to="/aluno" replace />;
  if (usuario.papel === "DIRETOR" || usuario.papel === "ADMIN") return <Navigate to="/diretor" replace />;
  return <Navigate to="/professor" replace />;
}

function Private({ children }) {
  const { usuario } = useAuth();
  if (!usuario) return <Navigate to="/login" replace />;
  return <Shell>{children}</Shell>;
}

export default function App() {
  return (
    <>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Home />} />
        <Route path="/aluno" element={<Private><AlunoPage /></Private>} />
        <Route path="/professor" element={<Navigate to="/professor/semanais" replace />} />
        <Route path="/professor/:aba" element={<Private><ProfessorPage /></Private>} />
        <Route path="/diretor" element={<Private><DiretorPage /></Private>} />
        <Route path="/ranking" element={<Private><RankingPage /></Private>} />
        <Route path="/alunos" element={<Private><AlunosPage /></Private>} />
        <Route path="/relatorio" element={<Private><RelatorioPage /></Private>} />
        <Route path="/configuracoes" element={<Private><ConfiguracoesPage /></Private>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <NotificationProvider />
    </>
  );
}
