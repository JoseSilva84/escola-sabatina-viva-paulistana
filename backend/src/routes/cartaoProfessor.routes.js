const { Router } = require("express");
const { z } = require("zod");
const prisma = require("../utils/prisma");
const asyncHandler = require("../utils/asyncHandler");
const { autenticar, autorizar } = require("../middleware/auth");
const { cartoesProfessor, unidades } = require("../data/store");
const { completudeProfessor, progressoPorSemanas } = require("../services/progresso");
const AppError = require("../utils/AppError");
const { regiaoPorDistrito } = require("../utils/regioes");

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

function nomeRegiao(distrito) {
  return regiaoPorDistrito(distrito?.nome);
}

function montarHierarquia(unidades) {
  const regioes = new Map();

  unidades.forEach((unidade) => {
    const distrito = unidade.igreja?.distrito || { id: "sem-distrito", nome: "Sem distrito" };
    const regiaoNome = nomeRegiao(distrito);
    if (!regioes.has(regiaoNome)) regioes.set(regiaoNome, { nome: regiaoNome, distritos: new Map() });

    const regiao = regioes.get(regiaoNome);
    if (!regiao.distritos.has(distrito.id)) {
      regiao.distritos.set(distrito.id, { id: distrito.id, nome: distrito.nome, igrejas: new Map() });
    }

    const distritoNode = regiao.distritos.get(distrito.id);
    const igreja = unidade.igreja || { id: "sem-igreja", nome: "Sem igreja" };
    if (!distritoNode.igrejas.has(igreja.id)) {
      distritoNode.igrejas.set(igreja.id, { id: igreja.id, nome: igreja.nome, unidades: [] });
    }

    distritoNode.igrejas.get(igreja.id).unidades.push(unidade);
  });

  return Array.from(regioes.values()).map((regiao) => ({
    ...regiao,
    distritos: Array.from(regiao.distritos.values()).map((distrito) => ({
      ...distrito,
      igrejas: Array.from(distrito.igrejas.values())
    }))
  }));
}

function resumoHierarquia(regioes) {
  const igrejas = regioes.flatMap((regiao) => regiao.distritos.flatMap((distrito) => distrito.igrejas));
  const unidades = igrejas.flatMap((igreja) => igreja.unidades);
  const respostas = unidades.reduce((soma, unidade) => soma + (unidade.totais?.respostas || 0), 0);
  const progresso = unidades.length
    ? Math.round(unidades.reduce((soma, unidade) => soma + (unidade.progresso?.progressoGeral || 0), 0) / unidades.length)
    : 0;

  return { regioes: regioes.length, distritos: regioes.reduce((soma, regiao) => soma + regiao.distritos.length, 0), igrejas: igrejas.length, unidades: unidades.length, pessoas: unidades.length, respostas, progresso };
}

function dataOpcional(valor) {
  return valor ? new Date(valor) : null;
}

function intervaloTrimestre(ano, trimestre) {
  return {
    inicio: new Date(ano, (trimestre - 1) * 3, 1, 0, 0, 0),
    fim: new Date(ano, trimestre * 3, 1, 0, 0, 0)
  };
}

function filtroColetasTrimestre(ano, trimestre, semanas, extra = {}) {
  const periodo = intervaloTrimestre(ano, trimestre);
  return {
    ...extra,
    ano,
    OR: [
      { numeroSemana: { in: semanas } },
      {
        numeroSemana: { gte: 1, lte: 13 },
        preenchidoEm: { gte: periodo.inicio, lt: periodo.fim }
      }
    ]
  };
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
    where: filtroColetasTrimestre(params.ano, params.trimestre, semanas, { unidadeId })
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

routes.get("/admin-dashboard", autorizar("ADMIN"), asyncHandler(async (req, res) => {
  const params = z.object({
    ano: z.coerce.number().int().default(new Date().getFullYear()),
    trimestre: z.coerce.number().int().min(1).max(4).default(1)
  }).parse(req.query);

  const semanaInicio = ((params.trimestre - 1) * 13) + 1;
  const semanas = Array.from({ length: 13 }, (_, index) => semanaInicio + index);
  const unidades = await prisma.unidadeAcao.findMany({
    where: { ativa: true },
    include: {
      igreja: { include: { distrito: true } },
      professor: { select: { id: true, nome: true, email: true } },
      cartoesProfessor: {
        where: { ano: params.ano, trimestre: params.trimestre },
        include: {
          presencas: { orderBy: { numeroSabado: "asc" } },
          estudosBiblicos: true,
          confraternizacoes: { orderBy: { data: "asc" } }
        }
      },
      coletasProfessor: {
        where: filtroColetasTrimestre(params.ano, params.trimestre, semanas),
        orderBy: { numeroSemana: "asc" }
      }
    },
    orderBy: [{ igreja: { nome: "asc" } }, { nome: "asc" }]
  });

  const arvore = montarHierarquia(unidades.map((unidade) => {
    const cartao = unidade.cartoesProfessor[0] || null;
    const progresso = { progressoGeral: cartao ? completudeProfessor(cartao) : 0 };
    return {
      id: unidade.id,
      nome: unidade.nome,
      professor: unidade.professor,
      igreja: unidade.igreja,
      progresso,
      respostas: [{
        id: unidade.professor?.id || unidade.id,
        nome: unidade.professor?.nome || "Professor nao vinculado",
        progresso,
        cartao,
        coletas: unidade.coletasProfessor.map((coleta) => ({
          id: coleta.id,
          semana: coleta.numeroSemana,
          participouPequenoGrupo: Boolean(coleta.participouPequenoGrupo),
          participouAcaoSolidaria: Boolean(coleta.participouAcaoSolidaria),
          acaoSolidariaDescricao: coleta.acaoSolidariaDescricao || "",
          acaoSolidariaTipo: coleta.acaoSolidariaTipo || "",
          ministrouEstudoBiblico: Boolean(coleta.ministrouEstudoBiblico)
        }))
      }],
      totais: {
        professores: unidade.professor ? 1 : 0,
        respostas: (cartao ? 1 : 0) + unidade.coletasProfessor.length
      }
    };
  }));

  res.json({
    tipo: "professores",
    ano: params.ano,
    trimestre: params.trimestre,
    resumo: resumoHierarquia(arvore),
    regioes: arvore
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
