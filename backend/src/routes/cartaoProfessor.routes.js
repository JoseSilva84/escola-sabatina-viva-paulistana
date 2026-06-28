const { Router } = require("express");
const { z } = require("zod");
const prisma = require("../utils/prisma");
const asyncHandler = require("../utils/asyncHandler");
const { autenticar, autorizar } = require("../middleware/auth");
const { cartoesProfessor, unidades } = require("../data/store");
const { completudeProfessor, progressoPorSemanas } = require("../services/progresso");
const AppError = require("../utils/AppError");

const routes = Router();
routes.use(autenticar);

function expandir(cartao) {
  const unidade = unidades.find((item) => item.id === cartao.unidadeId);
  return { ...cartao, unidade, progresso: { progressoGeral: completudeProfessor(cartao) } };
}

function podeVerUnidade(req, unidade) {
  if (req.usuario.papel === "ADMIN") return true;
  if (req.usuario.papel === "PROFESSOR") return unidade.professorId === req.usuario.id;
  if (req.usuario.papel === "DIRETOR") return unidade.igrejaId === req.usuario.igrejaId;
  return false;
}

function meta(titulo, ok, detalheOk, detalhePendente, statusOk = "Concluido") {
  return {
    titulo,
    detalhe: ok ? detalheOk : detalhePendente,
    status: ok ? statusOk : "Pendente",
    ok: Boolean(ok)
  };
}

function montarMetas(cartao, coletas = []) {
  const presencas = cartao?.presencas || [];
  const totalPresencas = presencas.filter((item) => item.presente).length;
  return [
    meta("Incentivo ao estudo da lição", cartao?.incentivaEstudo, "Programa de estudo registrado", "Informe se a unidade participa do incentivo ao estudo"),
    meta("Incentivo a pontualidade", cartao?.incentivaPontualidade, "Programa de pontualidade registrado", "Informe se a unidade participa do incentivo a pontualidade"),
    meta("Visitas mensais a alunos", cartao?.visitouAlunos, "Visitas registradas", "Registre se houve visitas aos alunos"),
    meta("Classe dos Professores", totalPresencas > 0, `Presenca em ${totalPresencas} de 13 encontros`, "Marque os sabados de participação", `${totalPresencas}/13`),
    meta("Pequeno Grupo", cartao?.pequenoGrupoResponsavel && cartao?.pequenoGrupoEndereco, "Responsável, endereço e horário preenchidos", "Preencha os dados do Pequeno Grupo"),
    meta("Ação social", cartao?.acaoSocialDescricao, `${cartao?.interessadosAlcancados || 0} interessados alcancados`, "Registre a ação social realizada", "Registrada"),
    meta("Estudos bíblicos", (cartao?.estudosBiblicos || []).length > 0, `${cartao?.estudosBiblicos?.length || 0} estudos registrados`, "Registre alunos e interessados em estudo bíblico", `${cartao?.estudosBiblicos?.length || 0} registros`),
    meta("Batismos da unidade", Number(cartao?.batismos || 0) > 0 || Boolean(cartao?.batismosNomes), "Batismos registrados", "Registre os batismos da unidade"),
    meta("Confraternizações", cartao?.promoveuConfraternizacao || (cartao?.confraternizacoes || []).length > 0, "Ações de confraternização registradas", "Liste as ações de confraternização", "Registrada"),
    meta("Planejamento trimestral", cartao?.planejamentoTrimestral, "Planejamento trimestral registrado", "Informe se houve avaliação e planejamento")
  ].map((item) => ({ ...item, coletasRegistradas: coletas.length }));
}

function dataOpcional(valor) {
  return valor ? new Date(valor) : null;
}

async function buscarCartaoPorContexto(req, ano, trimestre, unidadeId) {
  const unidade = await prisma.unidadeAcao.findFirst({
    where: {
      id: unidadeId,
      ...(req.usuario.papel === "PROFESSOR" ? { professorId: req.usuario.id } : {}),
      ...(req.usuario.papel === "DIRETOR" ? { igrejaId: req.usuario.igrejaId } : {})
    },
    include: { professor: true, igreja: true, alunos: true }
  });
  if (!unidade || !podeVerUnidade(req, unidade)) throw new AppError("Unidade de Acao nao encontrada", 404);

  let cartao = await prisma.cartaoProfessor.findUnique({
    where: { unidadeId_trimestre_ano: { unidadeId, trimestre, ano } },
    include: {
      unidade: { include: { professor: true, igreja: true } },
      presencas: { orderBy: { numeroSabado: "asc" } },
      estudosBiblicos: true,
      confraternizacoes: { orderBy: { data: "asc" } }
    }
  });

  if (!cartao) {
    cartao = await prisma.cartaoProfessor.create({
      data: {
        unidadeId,
        trimestre,
        ano,
        presencas: { create: Array.from({ length: 13 }, (_, index) => ({ numeroSabado: index + 1 })) }
      },
      include: {
        unidade: { include: { professor: true, igreja: true } },
        presencas: { orderBy: { numeroSabado: "asc" } },
        estudosBiblicos: true,
        confraternizacoes: { orderBy: { data: "asc" } }
      }
    });
  }

  return { unidade, cartao };
}

routes.get("/", asyncHandler(async (req, res) => {
  try {
    const where = {};
    if (req.query.ano) where.ano = Number(req.query.ano);
    if (req.query.trimestre) where.trimestre = Number(req.query.trimestre);
    if (req.usuario.papel === "PROFESSOR") where.unidade = { professorId: req.usuario.id };
    if (req.usuario.papel === "DIRETOR") where.unidade = { igrejaId: req.usuario.igrejaId };

    const lista = await prisma.cartaoProfessor.findMany({
      where,
      include: {
        unidade: { include: { professor: true, igreja: true } },
        presencas: { orderBy: { numeroSabado: "asc" } },
        estudosBiblicos: true,
        confraternizacoes: true
      },
      orderBy: [{ ano: "desc" }, { trimestre: "desc" }]
    });
    return res.json(lista.map((cartao) => ({ ...cartao, progresso: { progressoGeral: completudeProfessor(cartao) } })));
  } catch {
    return res.json(cartoesProfessor.map(expandir));
  }
}));

routes.get("/acompanhamento", asyncHandler(async (req, res) => {
  const schema = z.object({
    ano: z.coerce.number().int().default(new Date().getFullYear()),
    trimestre: z.coerce.number().int().min(1).max(4).default(1),
    unidadeId: z.string().optional()
  });
  const params = schema.parse(req.query);

  let unidadeId = params.unidadeId;
  if (!unidadeId) {
    const primeira = await prisma.unidadeAcao.findFirst({
      where: req.usuario.papel === "PROFESSOR"
        ? { professorId: req.usuario.id, ativa: true }
        : { igrejaId: req.usuario.igrejaId, ativa: true },
      orderBy: { nome: "asc" }
    });
    unidadeId = primeira?.id;
  }
  if (!unidadeId) throw new AppError("Nenhuma unidade de acao encontrada", 404);

  const { unidade, cartao } = await buscarCartaoPorContexto(req, params.ano, params.trimestre, unidadeId);
  const semanaInicio = ((params.trimestre - 1) * 13) + 1;
  const semanas = Array.from({ length: 13 }, (_, index) => semanaInicio + index);
  const coletas = await prisma.coletaSemanalAluno.findMany({
    where: { unidadeId, ano: params.ano, numeroSemana: { in: semanas } }
  });
  const progressoAlunos = progressoPorSemanas(coletas, Math.max(1, unidade.alunos.length * 13));

  res.json({
    nome: unidade.professor?.nome || req.usuario.nome,
    unidade,
    cartao,
    progresso: completudeProfessor(cartao),
    progressoAlunos,
    metas: montarMetas(cartao, coletas),
    alunos: unidade.alunos,
    coletasResumo: {
      total: coletas.length,
      semanasPreenchidas: new Set(coletas.map((item) => item.numeroSemana)).size
    }
  });
}));

routes.get("/:id", asyncHandler(async (req, res) => {
  const cartao = await prisma.cartaoProfessor.findUnique({
    where: { id: req.params.id },
    include: {
      unidade: { include: { professor: true, igreja: true } },
      presencas: { orderBy: { numeroSabado: "asc" } },
      estudosBiblicos: true,
      confraternizacoes: true
    }
  });
  if (!cartao) throw new AppError("Cartao do professor nao encontrado", 404);
  res.json({ ...cartao, progresso: { progressoGeral: completudeProfessor(cartao) } });
}));

routes.post("/", autorizar("ADMIN", "DIRETOR", "PROFESSOR"), asyncHandler(async (req, res) => {
  const dados = z.object({
    unidadeId: z.string(),
    trimestre: z.number().int().min(1).max(4),
    ano: z.number().int()
  }).parse(req.body);

  const { cartao } = await buscarCartaoPorContexto(req, dados.ano, dados.trimestre, dados.unidadeId);
  res.status(201).json({ ...cartao, progresso: { progressoGeral: completudeProfessor(cartao) } });
}));

routes.patch("/:id", autorizar("ADMIN", "DIRETOR", "PROFESSOR"), asyncHandler(async (req, res) => {
  const schema = z.object({
    incentivaEstudo: z.boolean().optional(),
    incentivaPontualidade: z.boolean().optional(),
    visitouAlunos: z.boolean().optional(),
    primeiraVisita: z.string().nullable().optional(),
    ultimaVisita: z.string().nullable().optional(),
    pequenoGrupoResponsavel: z.string().optional(),
    pequenoGrupoEndereco: z.string().optional(),
    pequenoGrupoDia: z.string().optional(),
    pequenoGrupoHorario: z.string().optional(),
    acaoSocialDescricao: z.string().optional(),
    acaoSocialTipo: z.string().optional(),
    acaoSocialData: z.string().nullable().optional(),
    acaoSocialLocal: z.string().optional(),
    pessoasAlcancadas: z.number().optional(),
    interessadosAlcancados: z.number().optional(),
    batismos: z.number().optional(),
    batismosNomes: z.string().nullable().optional(),
    planejamentoTrimestral: z.boolean().optional(),
    promoveuConfraternizacao: z.boolean().optional()
  });
  const dados = schema.parse(req.body);

  const atual = await prisma.cartaoProfessor.findUnique({ where: { id: req.params.id }, include: { unidade: true } });
  if (!atual || !podeVerUnidade(req, atual.unidade)) throw new AppError("Cartao do professor nao encontrado", 404);

  const data = {
    ...dados,
    ...(dados.primeiraVisita !== undefined ? { primeiraVisita: dataOpcional(dados.primeiraVisita) } : {}),
    ...(dados.ultimaVisita !== undefined ? { ultimaVisita: dataOpcional(dados.ultimaVisita) } : {}),
    ...(dados.acaoSocialData !== undefined ? { acaoSocialData: dataOpcional(dados.acaoSocialData) } : {})
  };

  const cartao = await prisma.cartaoProfessor.update({
    where: { id: req.params.id },
    data,
    include: {
      unidade: { include: { professor: true, igreja: true } },
      presencas: { orderBy: { numeroSabado: "asc" } },
      estudosBiblicos: true,
      confraternizacoes: true
    }
  });
  res.json({ ...cartao, progresso: { progressoGeral: completudeProfessor(cartao) } });
}));

routes.patch("/:id/presencas/:numeroSabado", autorizar("ADMIN", "DIRETOR", "PROFESSOR"), asyncHandler(async (req, res) => {
  const dados = z.object({ presente: z.boolean() }).parse(req.body);
  await prisma.cartaoProfessorPresenca.update({
    where: {
      cartaoProfessorId_numeroSabado: {
        cartaoProfessorId: req.params.id,
        numeroSabado: Number(req.params.numeroSabado)
      }
    },
    data: dados
  });
  const cartao = await prisma.cartaoProfessor.findUnique({
    where: { id: req.params.id },
    include: { unidade: true, presencas: { orderBy: { numeroSabado: "asc" } }, estudosBiblicos: true, confraternizacoes: true }
  });
  res.json({ ...cartao, progresso: { progressoGeral: completudeProfessor(cartao) } });
}));

routes.post("/:id/estudos-biblicos", autorizar("ADMIN", "DIRETOR", "PROFESSOR"), asyncHandler(async (req, res) => {
  const dados = z.object({ alunoNome: z.string(), interessadoNome: z.string() }).parse(req.body);
  await prisma.cartaoProfessorEstudoBiblico.create({ data: { cartaoProfessorId: req.params.id, ...dados } });
  const cartao = await prisma.cartaoProfessor.findUnique({
    where: { id: req.params.id },
    include: { unidade: true, presencas: true, estudosBiblicos: true, confraternizacoes: true }
  });
  res.status(201).json({ ...cartao, progresso: { progressoGeral: completudeProfessor(cartao) } });
}));

routes.post("/:id/confraternizacoes", autorizar("ADMIN", "DIRETOR", "PROFESSOR"), asyncHandler(async (req, res) => {
  const dados = z.object({ descricao: z.string(), data: z.string() }).parse(req.body);
  await prisma.cartaoProfessorConfraternizacao.create({
    data: { cartaoProfessorId: req.params.id, descricao: dados.descricao, data: new Date(dados.data) }
  });
  const cartao = await prisma.cartaoProfessor.findUnique({
    where: { id: req.params.id },
    include: { unidade: true, presencas: true, estudosBiblicos: true, confraternizacoes: true }
  });
  res.status(201).json({ ...cartao, progresso: { progressoGeral: completudeProfessor(cartao) } });
}));

module.exports = routes;
