const { Router } = require("express");
const { autenticar } = require("../middleware/auth");
const asyncHandler = require("../utils/asyncHandler");
const prisma = require("../utils/prisma");
const { progressoPorSemanas, completudeProfessor, completudeDiretor } = require("../services/progresso");

const routes = Router();
routes.use(autenticar);

function sabadoDaSemana(ano, semana) {
  const data = new Date(ano, 0, 1, 12, 0, 0);
  const diaSemana = data.getDay();
  const diasParaPrimeiroSabado = (6 - diaSemana + 7) % 7;
  data.setDate(data.getDate() + diasParaPrimeiroSabado + (semana - 1) * 7);
  return data;
}

function semanasDoMes(ano, mes) {
  const semanasLocais = Array.from({ length: 53 }, (_, index) => index + 1)
    .map((semana) => {
      const data = sabadoDaSemana(ano, semana);
      return { data, semana };
    })
    .filter(({ data }) => data.getFullYear() === ano && data.getMonth() + 1 === mes)
    .map(({ data }) => semanaLocalDoTrimestre(ano, data));

  return [...new Set(semanasLocais)];
}

function semanaLocalDoTrimestre(ano, data) {
  const trimestre = Math.floor(data.getMonth() / 3) + 1;
  const inicioTrimestre = new Date(ano, (trimestre - 1) * 3, 1, 12, 0, 0);
  let local = 0;
  for (let semana = 1; semana <= 53; semana += 1) {
    const sabado = sabadoDaSemana(ano, semana);
    if (sabado.getFullYear() !== ano || sabado < inicioTrimestre) continue;
    if (sabado.getMonth() >= trimestre * 3) break;
    local += 1;
    if (sabado.toISOString().slice(0, 10) === data.toISOString().slice(0, 10)) return local;
  }
  return 1;
}

function trimestresDoPeriodo(periodo, trimestre) {
  if (periodo === "anual") return [1, 2, 3, 4];
  return [trimestre];
}

function normalizarNome(nome) {
  return String(nome || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

routes.get("/", asyncHandler(async (req, res) => {
  const hoje = new Date();
  const periodoSolicitado = req.query.periodo || "mensal";
  const periodo = ["mensal", "trimestral", "anual"].includes(periodoSolicitado) ? periodoSolicitado : "mensal";

  const filtroUltimaColeta = {
    igrejaId: req.usuario.igrejaId,
    ...(req.query.ano ? { ano: Number(req.query.ano) } : {}),
    ...(req.usuario.papel === "PROFESSOR" ? { professorId: req.usuario.id } : {})
  };
  const ultimaColetaGeral = await prisma.coletaSemanalAluno.findFirst({
    where: filtroUltimaColeta,
    orderBy: [{ ano: "desc" }, { numeroSemana: "desc" }]
  });

  const ano = Number(req.query.ano || ultimaColetaGeral?.ano || hoje.getFullYear());
  const semanaReferencia = ultimaColetaGeral?.ano === ano ? ultimaColetaGeral.numeroSemana : null;
  const mesReferencia = hoje.getFullYear() === ano ? hoje.getMonth() + 1 : 1;
  const mes = Number(req.query.mes || mesReferencia);
  const trimestreReferencia = Math.floor((mes - 1) / 3) + 1;
  const trimestre = Number(req.query.trimestre || trimestreReferencia);
  const semanasTrimestre = Array.from({ length: 13 }, (_, index) => index + 1);
  const semanasPeriodo = periodo === "anual"
    ? Array.from({ length: 13 }, (_, index) => index + 1)
    : periodo === "mensal"
      ? semanasDoMes(ano, mes)
      : semanasTrimestre;

  const ultimaColetaPeriodo = await prisma.coletaSemanalAluno.findFirst({
    where: {
      igrejaId: req.usuario.igrejaId,
      ano,
      numeroSemana: { in: semanasPeriodo },
      ...(req.usuario.papel === "PROFESSOR" ? { professorId: req.usuario.id } : {})
    },
    orderBy: { numeroSemana: "desc" }
  });
  const semanaCorte = ultimaColetaPeriodo?.numeroSemana || 0;
  const semanas = semanasPeriodo.filter((semana) => semana <= semanaCorte);
  const trimestreCorte = semanaCorte ? Math.ceil(semanaCorte / 13) : trimestre;
  const trimestres = periodo === "anual"
    ? Array.from({ length: trimestreCorte }, (_, index) => index + 1)
    : trimestresDoPeriodo(periodo, trimestre);

  const unidades = await prisma.unidadeAcao.findMany({
    where: req.usuario.papel === "PROFESSOR"
      ? { professorId: req.usuario.id, ativa: true }
      : { igrejaId: req.usuario.igrejaId, ativa: true },
    include: {
      professor: true,
      alunos: true,
      cartoesProfessor: {
        where: { ano, trimestre: { in: trimestres } },
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
  const progressoAlunos = progressoPorSemanas(coletas, Math.max(1, unidades.reduce((soma, unidade) => soma + unidade.alunos.length, 0) * semanas.length));

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

  const estudosProfessorPorAluno = new Map();
  if (periodo !== "mensal") {
    unidades.forEach(unidade => {
      unidade.cartoesProfessor.forEach(cartao => {
        (cartao.estudosBiblicos || []).forEach(estudo => {
          const chave = normalizarNome(estudo.alunoNome);
          if (!chave) return;
          estudosProfessorPorAluno.set(chave, (estudosProfessorPorAluno.get(chave) || 0) + 1);
        });
      });
    });
  }

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

    const estudosProfessor = estudosProfessorPorAluno.get(normalizarNome(aluno.nome)) || 0;
    estudosBiblicosPontos += estudosProfessor * 50;

    const progresso = progressoPorSemanas(aluno.coletas, Math.max(1, semanas.length));
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
