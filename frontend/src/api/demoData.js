export const demoUsers = {
  "admin@nota10.com": { id: "u-admin", nome: "Administrador Nota 10", email: "admin@nota10.com", papel: "ADMIN" },
  "diretor@nota10.com": { id: "u-diretor", nome: "Jemfer Rite", email: "diretor@nota10.com", papel: "DIRETOR" },
  "professor@nota10.com": { id: "u-professor", nome: "Dra. Ana Silva", email: "professor@nota10.com", papel: "PROFESSOR" },
  "aluno@nota10.com": { id: "u-aluno", nome: "Arthur Silva", email: "aluno@nota10.com", papel: "ALUNO" }
};

export const ranking = [];

export const dashboard = {
  indicadores: { taxaAprovacao: 88, presencaAlunos: 90, evasao: 1, desempenhoEscola: 97 },
  unidades: []
};

export const alunoCard = {
  nome: "Arthur Silva",
  progresso: 85,
  metricas: [
    { rotulo: "Cursos", valor: "6/8" },
    { rotulo: "Atividades", valor: "14/16" },
    { rotulo: "Média", valor: "9.1" }
  ],
  sabados: Array.from({ length: 13 }, (_, index) => ({
    numeroSabado: index + 1,
    estudo: index < 11,
    pontualidade: index < 13
  })),
  proximoSabado: {
    numeroSabado: 12,
    numeroSemana: 12,
    data: "2026-03-21",
    titulo: "Sabado 12 da licao",
    descricao: "Registrar presenca e estudo da licao"
  },
  ultimasPontuacoes: [
    {
      numeroSabado: 11,
      numeroSemana: 11,
      data: "2026-03-14",
      total: 40,
      itens: [
        { label: "Estudo da licao", pontos: 10 },
        { label: "Pontualidade", pontos: 10 },
        { label: "Pequeno Grupo", pontos: 20 }
      ]
    }
  ],
  perguntas: [
    { texto: "Participou do Pequeno Grupo?", resposta: true },
    { texto: "Realizou uma ação solidária?", resposta: true },
    { texto: "Ministrou estudo bíblico neste trimestre?", resposta: false }
  ]
};

export const professorCard = {
  nome: "Dra. Ana Silva",
  progresso: 75,
  metas: [
    { titulo: "Incentivo ao estudo da lição", detalhe: "Acompanhamento completo das unidades", status: "Concluído", ok: true },
    { titulo: "Incentivo à pontualidade", detalhe: "Chegada até 9h nos 13 sábados", status: "Em andamento", ok: false },
    { titulo: "Visitas mensais a alunos", detalhe: "Primeira e última visita registradas", status: "Concluído", ok: true },
    { titulo: "Classe dos Professores", detalhe: "Presença em 11 de 13 encontros", status: "11/13", ok: true },
    { titulo: "Pequeno Grupo", detalhe: "Responsável, endereço e horário preenchidos", status: "Concluído", ok: true },
    { titulo: "Ação social", detalhe: "44 pessoas e 11 interessados alcançados", status: "Registrada", ok: true },
    { titulo: "Alunos interativos", detalhe: "Aluno vinculado a interessado em estudo bíblico", status: "2 registros", ok: true },
    { titulo: "Batismos da unidade", detalhe: "2 batismos originados da classe", status: "Concluído", ok: true },
    { titulo: "Confraternizações", detalhe: "Almoço da unidade realizado", status: "Registrada", ok: true },
    { titulo: "Planejamento trimestral", detalhe: "Reunião de fechamento do trimestre", status: "Pendente", ok: false }
  ]
};
