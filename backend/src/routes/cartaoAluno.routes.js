const { Router } = require("express");
const { z } = require("zod");
const prisma = require("../utils/prisma");
const asyncHandler = require("../utils/asyncHandler");
const { autenticar, autorizar } = require("../middleware/auth");
const { cartoesAluno, alunos } = require("../data/store");
const { progressoAluno, progressoPorSemanas } = require("../services/progresso");
const { semanasDoTrimestre } = require("./coletaSemanal.routes");
const AppError = require("../utils/AppError");
const { regiaoPorDistrito } = require("../utils/regioes");

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

function nomeRegiao(distrito) {
  return regiaoPorDistrito(distrito?.nome);
}

function montarHierarquia(unidades) {
  const regioes = new Map();

  unidades.forEach((unidade) => {
    const distrito = unidade.igreja?.distrito || { id: "sem-distrito", nome: "Sem distrito" };
    const regiaoNome = nomeRegiao(distrito);
    if (!regioes.has(regiaoNome)) {
      regioes.set(regiaoNome, { nome: regiaoNome, distritos: new Map() });
    }

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

function resumoHierarquia(regioes, chave) {
  const igrejas = regioes.flatMap((regiao) => regiao.distritos.flatMap((distrito) => distrito.igrejas));
  const unidades = igrejas.flatMap((igreja) => igreja.unidades);
  const respostas = unidades.reduce((soma, unidade) => soma + (unidade.totais?.respostas || 0), 0);
  const pessoas = unidades.reduce((soma, unidade) => soma + (unidade.totais?.[chave] || 0), 0);
  const progresso = unidades.length
    ? Math.round(unidades.reduce((soma, unidade) => soma + (unidade.progresso?.progressoGeral || 0), 0) / unidades.length)
    : 0;

  return { regioes: regioes.length, distritos: regioes.reduce((soma, regiao) => soma + regiao.distritos.length, 0), igrejas: igrejas.length, unidades: unidades.length, pessoas, respostas, progresso };
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

routes.get("/admin-dashboard", autorizar("ADMIN"), asyncHandler(async (req, res) => {
  const params = z.object({
    ano: z.coerce.number().int().default(new Date().getFullYear()),
    trimestre: z.coerce.number().int().min(1).max(4).default(1)
  }).parse(req.query);

  const semanas = semanasDoTrimestre(params.trimestre);
  const unidades = await prisma.unidadeAcao.findMany({
    where: { ativa: true },
    include: {
      igreja: { include: { distrito: true } },
      professor: { select: { id: true, nome: true, email: true } },
      alunos: {
        orderBy: { nome: "asc" },
        include: {
          cartoes: {
            where: { ano: params.ano, trimestre: params.trimestre },
            include: { sabados: { orderBy: { numeroSabado: "asc" } }
            }
          },
          coletasSemanais: {
            where: { ano: params.ano, numeroSemana: { in: semanas } },
            orderBy: { numeroSemana: "asc" }
          }
        }
      }
    },
    orderBy: [{ igreja: { nome: "asc" } }, { nome: "asc" }]
  });

  const arvore = montarHierarquia(unidades.map((unidade) => {
    const alunosDetalhados = unidade.alunos.map((aluno) => {
      const cartao = aluno.cartoes[0] || null;
      const progresso = aluno.coletasSemanais.length
        ? progressoPorSemanas(aluno.coletasSemanais, semanas.length)
        : cartao
          ? progressoAluno(cartao)
          : progressoPorSemanas([], semanas.length);

      return {
        id: aluno.id,
        nome: aluno.nome,
        progresso,
        cartao,
        coletas: aluno.coletasSemanais.map((coleta) => ({
          id: coleta.id,
          semana: coleta.numeroSemana,
          estudouLicao: Boolean(coleta.estudouLicao),
          foiPontual: Boolean(coleta.foiPontual),
          pequenoGrupo: coleta.pequenoGrupo,
          acaoSolidaria: coleta.acaoSolidaria,
          acaoSolidariaDescricao: coleta.acaoSolidariaDescricao || "",
          acaoSolidariaTipo: coleta.acaoSolidariaTipo || "",
          estudosBiblicos: coleta.estudosBiblicos,
          observacao: coleta.observacao || ""
        }))
      };
    });

    const progressoUnidade = progressoPorSemanas(
      unidade.alunos.flatMap((aluno) => aluno.coletasSemanais),
      Math.max(1, unidade.alunos.length * semanas.length)
    );

    return {
      id: unidade.id,
      nome: unidade.nome,
      professor: unidade.professor,
      igreja: unidade.igreja,
      progresso: progressoUnidade,
      respostas: alunosDetalhados,
      totais: {
        alunos: alunosDetalhados.length,
        respostas: alunosDetalhados.reduce((soma, aluno) => soma + aluno.coletas.length, 0)
      }
    };
  }));

  res.json({
    tipo: "alunos",
    ano: params.ano,
    trimestre: params.trimestre,
    resumo: resumoHierarquia(arvore, "alunos"),
    regioes: arvore
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
