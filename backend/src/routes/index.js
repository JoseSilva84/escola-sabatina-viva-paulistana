const { Router } = require("express");
const authRoutes = require("./auth.routes");
const cadastroRoutes = require("./cadastro.routes");
const cartaoAlunoRoutes = require("./cartaoAluno.routes");
const cartaoProfessorRoutes = require("./cartaoProfessor.routes");
const cartaoDiretorRoutes = require("./cartaoDiretor.routes");
const dashboardRoutes = require("./dashboard.routes");
const { routes: coletaSemanalRoutes } = require("./coletaSemanal.routes");

const routes = Router();

routes.use("/auth", authRoutes);
routes.use("/cadastros", cadastroRoutes);
routes.use("/cartoes-aluno", cartaoAlunoRoutes);
routes.use("/cartoes-professor", cartaoProfessorRoutes);
routes.use("/cartoes-diretor", cartaoDiretorRoutes);
routes.use("/dashboard", dashboardRoutes);
routes.use("/coletas-semanais", coletaSemanalRoutes);

module.exports = routes;
