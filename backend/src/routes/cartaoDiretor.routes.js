const { Router } = require("express");
const { z } = require("zod");
const prisma = require("../utils/prisma");
const asyncHandler = require("../utils/asyncHandler");
const { autenticar, autorizar } = require("../middleware/auth");
const { cartoesDiretor, igrejas } = require("../data/store");
const { completudeDiretor, completudeProfessor, progressoPorSemanas } = require("../services/progresso");
const AppError = require("../utils/AppError");

const routes = Router();
routes.use(autenticar);

function expandir(cartao) {
  const igreja = igrejas.find((item) => item.id === cartao.igrejaId);
  return { ...cartao, igreja, progresso: { progressoGeral: completudeDiretor(cartao) } };
}

function podeVerIgreja(req, igrejaId) {
  return req.usuario.papel === "ADMIN" || req.usuario.igrejaId === igrejaId;
}

async function buscarOuCriarCartao(req, ano, trimestre) {
  const igrejaId = req.usuario.igrejaId;
  let cartao = await prisma.cartaoDiretor.findUnique({
    where: { igrejaId_trimestre_ano: { igrejaId, trimestre, ano } },
    include: { igreja: true }
  });

  if (!cartao) {
    cartao = await prisma.cartaoDiretor.create({
      data: { igrejaId, trimestre, ano },
      include: { igreja: true }
    });
  }
  return cartao;
}

routes.get("/", asyncHandler(async (req, res) => {
  try {
    const where = {};
    if (req.query.ano) where.ano = Number(req.query.ano);
    if (req.query.trimestre) where.trimestre = Number(req.query.trimestre);
    if (req.usuario.papel !== "ADMIN") where.igrejaId = req.usuario.igrejaId;

    const lista = await prisma.cartaoDiretor.findMany({
      where,
      include: { igreja: true },
      orderBy: [{ ano: "desc" }, { trimestre: "desc" }]
    });
    return res.json(lista.map((cartao) => ({ ...cartao, progresso: { progressoGeral: completudeDiretor(cartao) } })));
  } catch {
    return res.json(cartoesDiretor.map(expandir));
  }
}));

routes.get("/acompanhamento", asyncHandler(async (req, res) => {
  const params = z.object({
    ano: z.coerce.number().int().default(new Date().getFullYear()),
    trimestre: z.coerce.number().int().min(1).max(4).default(1)
  }).parse(req.query);

  const cartao = await buscarOuCriarCartao(req, params.ano, params.trimestre);
  const unidades = await prisma.unidadeAcao.findMany({
    where: { igrejaId: req.usuario.igrejaId, ativa: true },
    include: {
      professor: { select: { id: true, nome: true, email: true } },
      alunos: true,
      cartoesProfessor: {
        where: { ano: params.ano, trimestre: params.trimestre },
        include: { presencas: true, estudosBiblicos: true, confraternizacoes: true }
      }
    },
    orderBy: { nome: "asc" }
  });

  const semanaInicio = ((params.trimestre - 1) * 13) + 1;
  const semanas = Array.from({ length: 13 }, (_, index) => semanaInicio + index);
  const coletas = await prisma.coletaSemanalAluno.findMany({
    where: { igrejaId: req.usuario.igrejaId, ano: params.ano, numeroSemana: { in: semanas } }
  });
  const coletasPorUnidade = coletas.reduce((acc, item) => {
    acc[item.unidadeId] = acc[item.unidadeId] || [];
    acc[item.unidadeId].push(item);
    return acc;
  }, {});

  const unidadesResumo = unidades.map((unidade) => {
    const cartaoProfessor = unidade.cartoesProfessor[0];
    const progressoProfessor = cartaoProfessor ? completudeProfessor(cartaoProfessor) : 0;
    const progressoAlunos = progressoPorSemanas(coletasPorUnidade[unidade.id] || [], Math.max(1, unidade.alunos.length * 13));
    return {
      id: unidade.id,
      nome: unidade.nome,
      professor: unidade.professor,
      alunos: unidade.alunos.length,
      progressoProfessor,
      metodologia: progressoProfessor,
      planoAula: progressoProfessor >= 50,
      avaliacoes: Boolean(cartaoProfessor?.planejamentoTrimestral),
      tecnologia: progressoAlunos.progressoGeral >= 70,
      pastoreio: progressoProfessor >= 80 ? "Otimo" : progressoProfessor >= 50 ? "Medio" : "Pendente",
      coletas: {
        total: (coletasPorUnidade[unidade.id] || []).length,
        progresso: progressoAlunos.progressoGeral
      }
    };
  });

  const desempenhoUnidades = unidadesResumo.length
    ? Math.round(unidadesResumo.reduce((soma, item) => soma + item.progressoProfessor, 0) / unidadesResumo.length)
    : 0;
  const progressoAlunos = progressoPorSemanas(coletas, Math.max(1, unidades.reduce((soma, unidade) => soma + unidade.alunos.length, 0) * 13));

  res.json({
    cartao,
    igreja: cartao.igreja,
    indicadores: {
      taxaAprovacao: desempenhoUnidades,
      presencaAlunos: progressoAlunos.pontualidadePercentual,
      evasao: Math.max(0, 100 - progressoAlunos.progressoGeral),
      desempenhoEscola: completudeDiretor(cartao)
    },
    unidades: unidadesResumo,
    pendencias: unidadesResumo.filter((item) => item.progressoProfessor < 100).length
  });
}));

routes.get("/:id", asyncHandler(async (req, res) => {
  const cartao = await prisma.cartaoDiretor.findUnique({ where: { id: req.params.id }, include: { igreja: true } });
  if (!cartao || !podeVerIgreja(req, cartao.igrejaId)) throw new AppError("Cartao do diretor nao encontrado", 404);
  res.json({ ...cartao, progresso: { progressoGeral: completudeDiretor(cartao) } });
}));

routes.post("/", autorizar("ADMIN", "DIRETOR"), asyncHandler(async (req, res) => {
  const dados = z.object({
    trimestre: z.number().int().min(1).max(4),
    ano: z.number().int()
  }).parse(req.body);

  const cartao = await buscarOuCriarCartao(req, dados.ano, dados.trimestre);
  res.status(201).json({ ...cartao, progresso: { progressoGeral: completudeDiretor(cartao) } });
}));

routes.patch("/:id", autorizar("ADMIN", "DIRETOR"), asyncHandler(async (req, res) => {
  const dados = z.object({
    cumprimentoClasses: z.enum(["SIM", "NAO", "ALGUMAS"]).optional(),
    classeProfessoresFrequencia: z.string().optional(),
    classeProfessoresParticipantes: z.string().optional(),
    classeInteressadosImplantada: z.boolean().optional(),
    classeInteressadosQuantidade: z.number().optional(),
    primeiraVisitaProfessores: z.string().nullable().optional(),
    ultimaVisitaProfessores: z.string().nullable().optional()
  }).parse(req.body);

  const atual = await prisma.cartaoDiretor.findUnique({ where: { id: req.params.id } });
  if (!atual || !podeVerIgreja(req, atual.igrejaId)) throw new AppError("Cartao do diretor nao encontrado", 404);

  const cartao = await prisma.cartaoDiretor.update({
    where: { id: req.params.id },
    data: {
      ...dados,
      primeiraVisitaProfessores: dados.primeiraVisitaProfessores ? new Date(dados.primeiraVisitaProfessores) : dados.primeiraVisitaProfessores,
      ultimaVisitaProfessores: dados.ultimaVisitaProfessores ? new Date(dados.ultimaVisitaProfessores) : dados.ultimaVisitaProfessores
    },
    include: { igreja: true }
  });

  res.json({ ...cartao, progresso: { progressoGeral: completudeDiretor(cartao) } });
}));

module.exports = routes;
