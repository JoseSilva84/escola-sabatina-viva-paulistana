const { Router } = require("express");
const { z } = require("zod");
const prisma = require("../utils/prisma");
const asyncHandler = require("../utils/asyncHandler");
const { autenticar, autorizar } = require("../middleware/auth");
const AppError = require("../utils/AppError");

const routes = Router();
routes.use(autenticar);

function trimestreDaSemana(numeroSemana) {
  if (numeroSemana <= 13) return 1;
  if (numeroSemana <= 26) return 2;
  if (numeroSemana <= 39) return 3;
  return 4;
}

function semanasDoTrimestre(trimestre) {
  const inicio = ((trimestre - 1) * 13) + 1;
  return Array.from({ length: 13 }, (_, index) => inicio + index);
}

routes.get("/", asyncHandler(async (req, res) => {
  const schema = z.object({
    ano: z.coerce.number().int(),
    semana: z.coerce.number().int().min(1).max(53),
    unidadeId: z.string().min(1)
  });
  const params = schema.parse(req.query);

  const unidade = await prisma.unidadeAcao.findFirst({
    where: {
      id: params.unidadeId,
      igrejaId: req.usuario.igrejaId,
      ...(req.usuario.papel === "PROFESSOR" ? { professorId: req.usuario.id } : {})
    },
    include: {
      alunos: { orderBy: { nome: "asc" } },
      coletasSemanais: {
        where: { ano: params.ano, numeroSemana: params.semana }
      }
    }
  });

  if (!unidade) throw new AppError("Unidade de Acao nao encontrada", 404);

  const coletasPorAluno = new Map(unidade.coletasSemanais.map((item) => [item.alunoId, item]));

  res.json({
    unidade: { id: unidade.id, nome: unidade.nome },
    ano: params.ano,
    semana: params.semana,
    alunos: unidade.alunos.map((aluno) => {
      const coleta = coletasPorAluno.get(aluno.id);
      return {
        aluno,
        coleta: coleta || {
          alunoId: aluno.id,
          estudouLicao: false,
          foiPontual: false,
          pequenoGrupo: null,
          acaoSolidaria: null,
          acaoSolidariaDescricao: "",
          acaoSolidariaTipo: "",
          estudosBiblicos: null,
          observacao: ""
        }
      };
    })
  });
}));

routes.get("/professor", asyncHandler(async (req, res) => {
  const schema = z.object({
    ano: z.coerce.number().int(),
    semana: z.coerce.number().int().min(1).max(53),
    unidadeId: z.string().min(1)
  });
  const params = schema.parse(req.query);

  const unidade = await prisma.unidadeAcao.findFirst({
    where: {
      id: params.unidadeId,
      igrejaId: req.usuario.igrejaId,
      ...(req.usuario.papel === "PROFESSOR" ? { professorId: req.usuario.id } : {})
    },
    include: {
      professor: { select: { id: true, nome: true } },
      igreja: true,
      coletasProfessor: {
        where: { ano: params.ano, numeroSemana: params.semana },
        take: 1
      }
    }
  });

  if (!unidade) throw new AppError("Unidade de Acao nao encontrada", 404);

  const coleta = unidade.coletasProfessor[0];
  res.json({
    unidade: { id: unidade.id, nome: unidade.nome },
    professor: unidade.professor,
    ano: params.ano,
    numeroSemana: params.semana,
    trimestre: trimestreDaSemana(params.semana),
    coleta: coleta || {
      unidadeId: unidade.id,
      participouPequenoGrupo: false,
      participouAcaoSolidaria: false,
      acaoSolidariaDescricao: "",
      acaoSolidariaTipo: "",
      ministrouEstudoBiblico: false
    }
  });
}));

routes.put("/lote", autorizar("PROFESSOR", "ADMIN"), asyncHandler(async (req, res) => {
  const schema = z.object({
    ano: z.number().int(),
    numeroSemana: z.number().int().min(1).max(53),
    unidadeId: z.string().min(1),
    respostas: z.array(z.object({
      alunoId: z.string().min(1),
      estudouLicao: z.boolean().default(false),
      foiPontual: z.boolean().default(false),
      pequenoGrupo: z.boolean().nullable().optional(),
      acaoSolidaria: z.boolean().nullable().optional(),
      acaoSolidariaDescricao: z.string().optional(),
      acaoSolidariaTipo: z.string().optional(),
      estudosBiblicos: z.number().nullable().optional(),
      observacao: z.string().optional()
    }))
  });
  const dados = schema.parse(req.body);

  const unidade = await prisma.unidadeAcao.findFirst({
    where: {
      id: dados.unidadeId,
      igrejaId: req.usuario.igrejaId,
      ...(req.usuario.papel === "PROFESSOR" ? { professorId: req.usuario.id } : {})
    },
    include: { alunos: { select: { id: true } }, igreja: true }
  });

  if (!unidade) throw new AppError("Unidade de Acao nao encontrada", 404);

  const alunosPermitidos = new Set(unidade.alunos.map((aluno) => aluno.id));
  const respostasInvalidas = dados.respostas.filter((item) => !alunosPermitidos.has(item.alunoId));
  if (respostasInvalidas.length) {
    throw new AppError("Uma ou mais respostas pertencem a alunos fora da unidade", 403);
  }

  const professorId = req.usuario.papel === "PROFESSOR" ? req.usuario.id : unidade.professorId;
  if (!professorId) throw new AppError("Unidade sem professor responsavel", 422);

  const salvas = await prisma.$transaction(dados.respostas.map((resposta) => (
    prisma.coletaSemanalAluno.upsert({
      where: {
        alunoId_ano_numeroSemana: {
          alunoId: resposta.alunoId,
          ano: dados.ano,
          numeroSemana: dados.numeroSemana
        }
      },
      create: {
        alunoId: resposta.alunoId,
        unidadeId: unidade.id,
        professorId,
        igrejaId: unidade.igrejaId,
        distritoId: unidade.igreja.distritoId || req.usuario.distritoId || null,
        ano: dados.ano,
        numeroSemana: dados.numeroSemana,
        estudouLicao: resposta.estudouLicao,
        foiPontual: resposta.foiPontual,
        pequenoGrupo: resposta.pequenoGrupo,
        acaoSolidaria: resposta.acaoSolidaria,
        acaoSolidariaDescricao: resposta.acaoSolidariaDescricao || "",
        acaoSolidariaTipo: resposta.acaoSolidariaTipo || "",
        estudosBiblicos: resposta.estudosBiblicos,
        observacao: resposta.observacao || ""
      },
      update: {
        estudouLicao: resposta.estudouLicao,
        foiPontual: resposta.foiPontual,
        pequenoGrupo: resposta.pequenoGrupo,
        acaoSolidaria: resposta.acaoSolidaria,
        acaoSolidariaDescricao: resposta.acaoSolidariaDescricao || "",
        acaoSolidariaTipo: resposta.acaoSolidariaTipo || "",
        estudosBiblicos: resposta.estudosBiblicos,
        observacao: resposta.observacao || "",
        unidadeId: unidade.id,
        professorId,
        igrejaId: unidade.igrejaId,
        distritoId: unidade.igreja.distritoId || req.usuario.distritoId || null
      }
    })
  )));

  res.json({
    mensagem: "Respostas semanais salvas",
    ano: dados.ano,
    numeroSemana: dados.numeroSemana,
    trimestre: trimestreDaSemana(dados.numeroSemana),
    total: salvas.length
  });
}));

routes.put("/professor", autorizar("PROFESSOR", "ADMIN"), asyncHandler(async (req, res) => {
  const schema = z.object({
    ano: z.number().int(),
    numeroSemana: z.number().int().min(1).max(53),
    unidadeId: z.string().min(1),
    participouPequenoGrupo: z.boolean().default(false),
    participouAcaoSolidaria: z.boolean().default(false),
    acaoSolidariaDescricao: z.string().optional(),
    acaoSolidariaTipo: z.string().optional(),
    ministrouEstudoBiblico: z.boolean().default(false)
  });
  const dados = schema.parse(req.body);

  const unidade = await prisma.unidadeAcao.findFirst({
    where: {
      id: dados.unidadeId,
      igrejaId: req.usuario.igrejaId,
      ...(req.usuario.papel === "PROFESSOR" ? { professorId: req.usuario.id } : {})
    },
    include: { igreja: true }
  });

  if (!unidade) throw new AppError("Unidade de Acao nao encontrada", 404);

  const professorId = req.usuario.papel === "PROFESSOR" ? req.usuario.id : unidade.professorId;
  if (!professorId) throw new AppError("Unidade sem professor responsavel", 422);

  const coleta = await prisma.coletaSemanalProfessor.upsert({
    where: {
      unidadeId_ano_numeroSemana: {
        unidadeId: unidade.id,
        ano: dados.ano,
        numeroSemana: dados.numeroSemana
      }
    },
    create: {
      unidadeId: unidade.id,
      professorId,
      igrejaId: unidade.igrejaId,
      distritoId: unidade.igreja.distritoId || req.usuario.distritoId || null,
      ano: dados.ano,
      numeroSemana: dados.numeroSemana,
      participouPequenoGrupo: dados.participouPequenoGrupo,
      participouAcaoSolidaria: dados.participouAcaoSolidaria,
      acaoSolidariaDescricao: dados.acaoSolidariaDescricao || "",
      acaoSolidariaTipo: dados.acaoSolidariaTipo || "",
      ministrouEstudoBiblico: dados.ministrouEstudoBiblico
    },
    update: {
      professorId,
      igrejaId: unidade.igrejaId,
      distritoId: unidade.igreja.distritoId || req.usuario.distritoId || null,
      participouPequenoGrupo: dados.participouPequenoGrupo,
      participouAcaoSolidaria: dados.participouAcaoSolidaria,
      acaoSolidariaDescricao: dados.acaoSolidariaDescricao || "",
      acaoSolidariaTipo: dados.acaoSolidariaTipo || "",
      ministrouEstudoBiblico: dados.ministrouEstudoBiblico
    }
  });

  res.json({
    mensagem: "Respostas semanais do professor salvas",
    ano: coleta.ano,
    numeroSemana: coleta.numeroSemana,
    trimestre: trimestreDaSemana(coleta.numeroSemana),
    coleta
  });
}));

routes.get("/resumo", asyncHandler(async (req, res) => {
  const schema = z.object({
    ano: z.coerce.number().int(),
    unidadeId: z.string().optional()
  });
  const params = schema.parse(req.query);

  const where = { ano: params.ano };
  if (params.unidadeId) where.unidadeId = params.unidadeId;
  if (req.usuario.papel === "PROFESSOR") where.professorId = req.usuario.id;
  if (req.usuario.papel === "DIRETOR") where.igrejaId = req.usuario.igrejaId;

  const coletas = await prisma.coletaSemanalAluno.findMany({ where });
  const semanas = new Set(coletas.map((item) => item.numeroSemana));

  res.json({
    ano: params.ano,
    semanasPreenchidas: semanas.size,
    totalColetas: coletas.length
  });
}));

module.exports = { routes, semanasDoTrimestre, trimestreDaSemana };
