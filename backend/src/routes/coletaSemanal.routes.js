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

function dataSabado(ano, semana) {
  const data = new Date(ano, 0, 1, 12, 0, 0);
  const diaSemana = data.getDay();
  const diasParaPrimeiroSabado = (6 - diaSemana + 7) % 7;
  data.setDate(data.getDate() + diasParaPrimeiroSabado + (semana - 1) * 7);
  return data;
}

function dataISO(data) {
  return data.toISOString().slice(0, 10);
}

function semanaPorData(valor) {
  if (!valor) return null;
  const alvo = new Date(`${valor}T12:00:00`);
  if (Number.isNaN(alvo.getTime())) return null;
  const ano = alvo.getFullYear();
  const chave = dataISO(alvo);
  for (let semana = 1; semana <= 53; semana += 1) {
    if (dataISO(dataSabado(ano, semana)) === chave) return { ano, semana };
  }
  return { ano, semana: null };
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

routes.get("/alunos-registros", asyncHandler(async (req, res) => {
  const schema = z.object({
    nome: z.string().optional(),
    ano: z.coerce.number().int().optional(),
    trimestre: z.coerce.number().int().min(1).max(4).optional(),
    semana: z.coerce.number().int().min(1).max(53).optional(),
    data: z.string().optional(),
    unidadeId: z.string().optional()
  });
  const params = schema.parse(req.query);
  const porData = semanaPorData(params.data);
  if (params.data && !porData?.semana) return res.json([]);
  const ano = porData?.ano || params.ano;
  const semana = porData?.semana || params.semana;
  const semanas = params.trimestre ? semanasDoTrimestre(params.trimestre) : null;

  const where = {
    igrejaId: req.usuario.igrejaId,
    ...(req.usuario.papel === "PROFESSOR" ? { professorId: req.usuario.id } : {}),
    ...(params.unidadeId ? { unidadeId: params.unidadeId } : {}),
    ...(ano ? { ano } : {}),
    ...(semana ? { numeroSemana: semana } : {}),
    ...(!semana && semanas ? { numeroSemana: { in: semanas } } : {}),
    ...(params.nome ? { aluno: { nome: { contains: params.nome, mode: "insensitive" } } } : {})
  };

  const registros = await prisma.coletaSemanalAluno.findMany({
    where,
    include: {
      aluno: { select: { id: true, nome: true, fotoUrl: true } },
      unidade: { select: { id: true, nome: true } }
    },
    orderBy: [
      { ano: "desc" },
      { numeroSemana: "desc" },
      { aluno: { nome: "asc" } }
    ],
    take: 300
  });

  res.json(registros.map((item) => ({
    id: item.id,
    ano: item.ano,
    numeroSemana: item.numeroSemana,
    trimestre: trimestreDaSemana(item.numeroSemana),
    data: dataISO(dataSabado(item.ano, item.numeroSemana)),
    aluno: item.aluno,
    unidade: item.unidade,
    estudouLicao: Boolean(item.estudouLicao),
    foiPontual: Boolean(item.foiPontual),
    pequenoGrupo: item.pequenoGrupo,
    acaoSolidaria: item.acaoSolidaria,
    acaoSolidariaDescricao: item.acaoSolidariaDescricao || "",
    acaoSolidariaTipo: item.acaoSolidariaTipo || "",
    estudosBiblicos: item.estudosBiblicos,
    observacao: item.observacao || ""
  })));
}));

routes.patch("/alunos-registros/:id", autorizar("PROFESSOR", "ADMIN"), asyncHandler(async (req, res) => {
  const dados = z.object({
    estudouLicao: z.boolean().optional(),
    foiPontual: z.boolean().optional(),
    pequenoGrupo: z.boolean().nullable().optional(),
    acaoSolidaria: z.boolean().nullable().optional(),
    acaoSolidariaDescricao: z.string().optional(),
    acaoSolidariaTipo: z.string().optional(),
    estudosBiblicos: z.number().nullable().optional(),
    observacao: z.string().optional()
  }).parse(req.body);

  const atual = await prisma.coletaSemanalAluno.findUnique({
    where: { id: req.params.id },
    include: { unidade: true }
  });
  if (!atual) throw new AppError("Registro do aluno não encontrado", 404);
  if (atual.igrejaId !== req.usuario.igrejaId) throw new AppError("Registro do aluno não encontrado", 404);
  if (req.usuario.papel === "PROFESSOR" && atual.professorId !== req.usuario.id) {
    throw new AppError("Você não pode editar este registro", 403);
  }

  const atualizado = await prisma.coletaSemanalAluno.update({
    where: { id: req.params.id },
    data: {
      ...dados,
      ...(dados.acaoSolidariaDescricao !== undefined ? { acaoSolidariaDescricao: dados.acaoSolidariaDescricao || "" } : {}),
      ...(dados.acaoSolidariaTipo !== undefined ? { acaoSolidariaTipo: dados.acaoSolidariaTipo || "" } : {}),
      ...(dados.observacao !== undefined ? { observacao: dados.observacao || "" } : {})
    },
    include: {
      aluno: { select: { id: true, nome: true, fotoUrl: true } },
      unidade: { select: { id: true, nome: true } }
    }
  });

  res.json({
    id: atualizado.id,
    ano: atualizado.ano,
    numeroSemana: atualizado.numeroSemana,
    trimestre: trimestreDaSemana(atualizado.numeroSemana),
    data: dataISO(dataSabado(atualizado.ano, atualizado.numeroSemana)),
    aluno: atualizado.aluno,
    unidade: atualizado.unidade,
    estudouLicao: Boolean(atualizado.estudouLicao),
    foiPontual: Boolean(atualizado.foiPontual),
    pequenoGrupo: atualizado.pequenoGrupo,
    acaoSolidaria: atualizado.acaoSolidaria,
    acaoSolidariaDescricao: atualizado.acaoSolidariaDescricao || "",
    acaoSolidariaTipo: atualizado.acaoSolidariaTipo || "",
    estudosBiblicos: atualizado.estudosBiblicos,
    observacao: atualizado.observacao || ""
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
