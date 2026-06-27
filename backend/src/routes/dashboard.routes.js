const { Router } = require("express");
const { autenticar } = require("../middleware/auth");
const asyncHandler = require("../utils/asyncHandler");
const prisma = require("../utils/prisma");
const { progressoPorSemanas, completudeProfessor, completudeDiretor } = require("../services/progresso");

const routes = Router();
routes.use(autenticar);

routes.get("/", asyncHandler(async (req, res) => {
  const ano = Number(req.query.ano || new Date().getFullYear());
  const trimestre = Number(req.query.trimestre || 1);
  const semanaInicio = ((trimestre - 1) * 13) + 1;
  const semanas = Array.from({ length: 13 }, (_, index) => semanaInicio + index);

  const unidades = await prisma.unidadeAcao.findMany({
    where: req.usuario.papel === "PROFESSOR"
      ? { professorId: req.usuario.id, ativa: true }
      : { igrejaId: req.usuario.igrejaId, ativa: true },
    include: {
      professor: true,
      alunos: true,
      cartoesProfessor: {
        where: { ano, trimestre },
        include: { presencas: true, estudosBiblicos: true, confraternizacoes: true }
      }
    },
    orderBy: { nome: "asc" }
  });

  const cartaoDiretor = await prisma.cartaoDiretor.findUnique({
    where: { igrejaId_trimestre_ano: { igrejaId: req.usuario.igrejaId, trimestre, ano } }
  }).catch(() => null);

  const coletas = await prisma.coletaSemanalAluno.findMany({
    where: { igrejaId: req.usuario.igrejaId, ano, numeroSemana: { in: semanas } }
  });
  const progressoAlunos = progressoPorSemanas(coletas, Math.max(1, unidades.reduce((soma, unidade) => soma + unidade.alunos.length, 0) * 13));

  const unidadesResumo = unidades.map((unidade) => {
    const cartao = unidade.cartoesProfessor[0];
    const progressoProfessor = cartao ? completudeProfessor(cartao) : 0;
    return {
      id: unidade.id,
      nome: unidade.nome,
      professor: unidade.professor?.nome,
      metodologia: progressoProfessor,
      planoAula: progressoProfessor >= 50,
      avaliacoes: Boolean(cartao?.planejamentoTrimestral),
      tecnologia: progressoAlunos.progressoGeral >= 70,
      carisma: true,
      pastoreio: progressoProfessor >= 80 ? "Otimo" : progressoProfessor >= 50 ? "Medio" : "Pendente"
    };
  });

  const desempenhoUnidades = unidadesResumo.length
    ? Math.round(unidadesResumo.reduce((soma, item) => soma + item.metodologia, 0) / unidadesResumo.length)
    : 0;

  const rankingMap = new Map();

  unidades.forEach(unidade => {
    unidade.alunos.forEach(aluno => {
      rankingMap.set(aluno.id, {
        id: aluno.id,
        nome: aluno.nome,
        fotoUrl: aluno.fotoUrl,
        sexo: aluno.sexo,
        nivel: aluno.nivel || 1,
        pontos: aluno.pontos || 0,
        coletas: []
      });
    });
  });

  coletas.forEach(coleta => {
    if (rankingMap.has(coleta.alunoId)) {
      rankingMap.get(coleta.alunoId).coletas.push(coleta);
    }
  });

  const ranking = Array.from(rankingMap.values()).map(aluno => {
    let estudoPontos = 0;
    let pontualidadePontos = 0;
    let pequenoGrupoPontos = 0;
    let acaoSolidariaPontos = 0;
    let estudosBiblicosPontos = 0;
    
    aluno.coletas.forEach(c => {
      if (c.estudouLicao) estudoPontos += 10;
      if (c.foiPontual) pontualidadePontos += 10;
      if (c.pequenoGrupo) pequenoGrupoPontos += 20;
      if (c.acaoSolidaria) acaoSolidariaPontos += 20;
      if (c.estudosBiblicos) estudosBiblicosPontos += (c.estudosBiblicos * 50);
    });

    const progresso = progressoPorSemanas(aluno.coletas, 13);
    const conquistasPontos = pequenoGrupoPontos + acaoSolidariaPontos + estudosBiblicosPontos;
    const pontosTrimestre = estudoPontos + pontualidadePontos + conquistasPontos;
    
    return {
      id: aluno.id,
      nome: aluno.nome,
      fotoUrl: aluno.fotoUrl,
      sexo: aluno.sexo,
      nivel: Math.floor((aluno.pontos + pontosTrimestre) / 100) + 1,
      pontos: aluno.pontos + pontosTrimestre,
      pontosBase: aluno.pontos,
      estudoPontos,
      pontualidadePontos,
      conquistasPontos,
      conquistasDetalhe: {
        pequenoGrupoPontos,
        acaoSolidariaPontos,
        estudosBiblicosPontos
      },
      progresso
    };
  });

  ranking.sort((a, b) => b.pontos - a.pontos);

  res.json({
    indicadores: {
      taxaAprovacao: desempenhoUnidades,
      presencaAlunos: progressoAlunos.pontualidadePercentual,
      evasao: Math.max(0, 100 - progressoAlunos.progressoGeral),
      desempenhoEscola: cartaoDiretor ? completudeDiretor(cartaoDiretor) : desempenhoUnidades
    },
    unidades: unidadesResumo,
    ranking
  });
}));

module.exports = routes;
