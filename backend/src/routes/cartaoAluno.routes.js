const { Router } = require("express");
const { z } = require("zod");
const prisma = require("../utils/prisma");
const asyncHandler = require("../utils/asyncHandler");
const { autenticar, autorizar } = require("../middleware/auth");
const { cartoesAluno, alunos } = require("../data/store");
const { progressoAluno, progressoPorSemanas } = require("../services/progresso");
const { semanasDoTrimestre } = require("./coletaSemanal.routes");
const AppError = require("../utils/AppError");

const routes = Router();
routes.use(autenticar);

function expandir(cartao) {
  const aluno = alunos.find((item) => item.id === cartao.alunoId);
  return { ...cartao, aluno, progresso: progressoAluno(cartao) };
}

function podeVerAluno(req, aluno) {
  if (req.usuario.papel === "ADMIN") return true;
  if (req.usuario.papel === "ALUNO") return aluno.usuarioId === req.usuario.id || aluno.id === req.usuario.alunoId;
  if (req.usuario.papel === "PROFESSOR") return aluno.unidade?.professorId === req.usuario.id;
  if (req.usuario.papel === "DIRETOR") return aluno.unidade?.igrejaId === req.usuario.igrejaId;
  return false;
}

routes.get("/", asyncHandler(async (req, res) => {
  try {
    const where = {};
    if (req.query.ano) where.ano = Number(req.query.ano);
    if (req.query.trimestre) where.trimestre = Number(req.query.trimestre);
    if (req.usuario.papel === "ALUNO") {
      where.aluno = { usuarioId: req.usuario.id };
    } else if (req.usuario.papel === "PROFESSOR") {
      where.aluno = { unidade: { professorId: req.usuario.id } };
    } else if (req.usuario.papel === "DIRETOR") {
      where.aluno = { unidade: { igrejaId: req.usuario.igrejaId } };
    }

    const lista = await prisma.cartaoAluno.findMany({
      where,
      include: {
        aluno: { include: { unidade: true } },
        sabados: { orderBy: { numeroSabado: "asc" } }
      },
      orderBy: [{ ano: "desc" }, { trimestre: "desc" }]
    });

    return res.json(lista.map((cartao) => ({ ...cartao, progresso: progressoAluno(cartao) })));
  } catch {
    const lista = req.usuario.papel === "ALUNO"
      ? cartoesAluno.filter((item) => item.alunoId === req.usuario.alunoId)
      : cartoesAluno;
    return res.json(lista.map(expandir));
  }
}));

routes.get("/acompanhamento", asyncHandler(async (req, res) => {
  const schema = z.object({
    alunoId: z.string().optional(),
    ano: z.coerce.number().int().default(new Date().getFullYear()),
    trimestre: z.coerce.number().int().min(1).max(4).default(1)
  });
  const params = schema.parse(req.query);
  const alunoId = params.alunoId || req.usuario.alunoId;

  const aluno = await prisma.aluno.findUnique({
    where: { id: alunoId },
    include: { unidade: true }
  });
  if (!aluno || !podeVerAluno(req, aluno)) throw new AppError("Aluno nao encontrado", 404);

  const semanas = semanasDoTrimestre(params.trimestre);
  const coletas = await prisma.coletaSemanalAluno.findMany({
    where: { alunoId: aluno.id, ano: params.ano, numeroSemana: { in: semanas } },
    orderBy: { numeroSemana: "asc" }
  });
  const coletaPorSemana = new Map(coletas.map((item) => [item.numeroSemana, item]));

  const cartao = await prisma.cartaoAluno.findUnique({
    where: {
      alunoId_trimestre_ano: {
        alunoId: aluno.id,
        trimestre: params.trimestre,
        ano: params.ano
      }
    },
    include: { sabados: { orderBy: { numeroSabado: "asc" } } }
  });

  const linhasSemana = semanas.map((numeroSemana, index) => {
    const coleta = coletaPorSemana.get(numeroSemana);
    return {
      numeroSabado: index + 1,
      numeroSemana,
      estudo: Boolean(coleta?.estudouLicao),
      pontualidade: Boolean(coleta?.foiPontual),
      pequenoGrupo: coleta?.pequenoGrupo ?? null,
      observacao: coleta?.observacao || ""
    };
  });

  const progresso = coletas.length
    ? progressoPorSemanas(coletas, 13)
    : cartao
      ? progressoAluno(cartao)
      : progressoPorSemanas([], 13);

  res.json({
    aluno,
    ano: params.ano,
    trimestre: params.trimestre,
    progresso,
    sabados: linhasSemana,
    perguntas: [
      { texto: "Participou do Pequeno Grupo?", resposta: Boolean(cartao?.pequenoGrupo) },
      { texto: "Realizou uma acao solidaria?", resposta: Boolean(cartao?.acaoSolidaria), detalhe: cartao?.acaoSolidariaDescricao || "" },
      { texto: "Ministrou estudo biblico neste trimestre?", resposta: Boolean(cartao?.ministrouEstudoBiblico) }
    ]
  });
}));

routes.get("/:id", asyncHandler(async (req, res) => {
  const cartao = await prisma.cartaoAluno.findUnique({
    where: { id: req.params.id },
    include: { aluno: { include: { unidade: true } }, sabados: { orderBy: { numeroSabado: "asc" } } }
  });
  if (!cartao) throw new AppError("Cartao do aluno nao encontrado", 404);
  res.json({ ...cartao, progresso: progressoAluno(cartao) });
}));

routes.post("/", autorizar("ADMIN", "DIRETOR", "PROFESSOR"), asyncHandler(async (req, res) => {
  const schema = z.object({
    alunoId: z.string(),
    trimestre: z.number().int().min(1).max(4),
    ano: z.number().int()
  });
  const dados = schema.parse(req.body);

  const aluno = await prisma.aluno.findUnique({ where: { id: dados.alunoId }, include: { unidade: true } });
  if (!aluno || !podeVerAluno(req, aluno)) throw new AppError("Aluno nao encontrado", 404);

  const cartao = await prisma.cartaoAluno.create({
    data: {
      ...dados,
      sabados: {
        create: Array.from({ length: 13 }, (_, index) => ({ numeroSabado: index + 1 }))
      }
    },
    include: { aluno: true, sabados: { orderBy: { numeroSabado: "asc" } } }
  });

  res.status(201).json({ ...cartao, progresso: progressoAluno(cartao) });
}));

routes.patch("/:id/perguntas", autorizar("ADMIN", "DIRETOR", "PROFESSOR"), asyncHandler(async (req, res) => {
  const schema = z.object({
    pequenoGrupo: z.boolean().optional(),
    acaoSolidaria: z.boolean().optional(),
    acaoSolidariaDescricao: z.string().optional(),
    acaoSolidariaTipo: z.string().optional(),
    ministrouEstudoBiblico: z.boolean().optional()
  });
  const dados = schema.parse(req.body);

  const cartaoAtual = await prisma.cartaoAluno.findUnique({
    where: { id: req.params.id },
    include: { aluno: { include: { unidade: true } } }
  });
  if (!cartaoAtual || !podeVerAluno(req, cartaoAtual.aluno)) throw new AppError("Cartao do aluno nao encontrado", 404);

  const cartao = await prisma.cartaoAluno.update({
    where: { id: req.params.id },
    data: dados,
    include: { aluno: true, sabados: { orderBy: { numeroSabado: "asc" } } }
  });

  res.json({ ...cartao, progresso: progressoAluno(cartao) });
}));

routes.patch("/:id/sabados/:numeroSabado", autorizar("ADMIN", "DIRETOR", "PROFESSOR"), asyncHandler(async (req, res) => {
  const schema = z.object({
    estudouSemana: z.boolean().optional(),
    pontual: z.boolean().optional()
  });
  const dados = schema.parse(req.body);

  await prisma.cartaoAlunoSabado.update({
    where: {
      cartaoAlunoId_numeroSabado: {
        cartaoAlunoId: req.params.id,
        numeroSabado: Number(req.params.numeroSabado)
      }
    },
    data: dados
  });

  const cartao = await prisma.cartaoAluno.findUnique({
    where: { id: req.params.id },
    include: { aluno: true, sabados: { orderBy: { numeroSabado: "asc" } } }
  });
  res.json({ ...cartao, progresso: progressoAluno(cartao) });
}));

module.exports = routes;
