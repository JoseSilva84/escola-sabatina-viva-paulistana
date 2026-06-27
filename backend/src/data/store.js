const bcrypt = require("bcryptjs");

const usuarios = [
  {
    id: "u-admin",
    nome: "Administrador Nota 10",
    email: "admin@nota10.com",
    senhaHash: bcrypt.hashSync("123456", 8),
    papel: "ADMIN",
    igrejaId: "igreja-viva"
  },
  {
    id: "u-diretor",
    nome: "Jemfer Rite",
    email: "diretor@nota10.com",
    senhaHash: bcrypt.hashSync("123456", 8),
    papel: "DIRETOR",
    igrejaId: "igreja-viva"
  },
  {
    id: "u-professor",
    nome: "Dra. Ana Silva",
    email: "professor@nota10.com",
    senhaHash: bcrypt.hashSync("123456", 8),
    papel: "PROFESSOR",
    igrejaId: "igreja-viva",
    unidadeId: "ua-9a"
  },
  {
    id: "u-aluno",
    nome: "Arthur Silva",
    email: "aluno@nota10.com",
    senhaHash: bcrypt.hashSync("123456", 8),
    papel: "ALUNO",
    igrejaId: "igreja-viva",
    alunoId: "aluno-arthur"
  }
];

const igrejas = [{ id: "igreja-viva", nome: "Escola Sabatina VIVA" }];

const unidades = [
  { id: "ua-9a", nome: "Classe Rei Davi", professorId: "u-professor", igrejaId: "igreja-viva" },
  { id: "ua-9b", nome: "Classe Apóstolo Paulo", professorId: "u-professor", igrejaId: "igreja-viva" },
  { id: "ua-10a", nome: "Classe de Rute", professorId: "u-professor", igrejaId: "igreja-viva" },
  { id: "ua-10b", nome: "Arca de Noé", professorId: "u-professor", igrejaId: "igreja-viva" }
];

const alunos = [];

function sabados(estudados = 11, pontuais = 13) {
  return Array.from({ length: 13 }, (_, index) => ({
    numeroSabado: index + 1,
    estudouSemana: index < estudados,
    pontual: index < pontuais
  }));
}

const cartoesAluno = alunos.map((aluno, index) => ({
  id: `ca-${aluno.id}`,
  alunoId: aluno.id,
  trimestre: 1,
  ano: 2026,
  pequenoGrupo: index !== 2,
  acaoSolidaria: true,
  acaoSolidariaDescricao: "Entrega de alimentos e visita missionária",
  ministrouEstudoBiblico: index === 0 || index === 2,
  sabados: sabados(index === 2 ? 13 : 10 + index, index === 4 ? 10 : 13)
}));

const cartoesProfessor = [
  {
    id: "cp-ua-9a",
    unidadeId: "ua-9a",
    trimestre: 1,
    ano: 2026,
    incentivaEstudo: true,
    incentivaPontualidade: true,
    primeiraVisita: "2026-03-02",
    ultimaVisita: "2026-05-20",
    pequenoGrupoResponsavel: "Dra. Ana Silva",
    pequenoGrupoEndereco: "Rua Esperança, 120",
    pequenoGrupoDia: "Quarta-feira",
    pequenoGrupoHorario: "19:30",
    acaoSocialDescricao: "Mutirão de alimentos para famílias atendidas pela igreja",
    acaoSocialTipo: "Solidariedade",
    acaoSocialData: "2026-04-18",
    acaoSocialLocal: "Comunidade Central",
    pessoasAlcancadas: 44,
    interessadosAlcancados: 11,
    batismos: 2,
    planejamentoTrimestral: true,
    presencas: sabados(11, 11).map((item) => ({ numeroSabado: item.numeroSabado, presente: item.estudouSemana })),
    estudosBiblicos: [],
    confraternizacoes: [
      { id: "cf-1", descricao: "Almoço da unidade", data: "2026-04-27" }
    ]
  }
];

const cartoesDiretor = [
  {
    id: "cd-viva",
    igrejaId: "igreja-viva",
    trimestre: 1,
    ano: 2026,
    cumprimentoClasses: "ALGUMAS",
    classeProfessoresFrequencia: "Semanal",
    classeProfessoresParticipantes: "Direção, professores e coordenação jovem",
    classeInteressadosImplantada: true,
    classeInteressadosQuantidade: 18,
    primeiraVisitaProfessores: "2026-03-05",
    ultimaVisitaProfessores: "2026-05-24"
  }
];

module.exports = {
  usuarios,
  igrejas,
  unidades,
  alunos,
  cartoesAluno,
  cartoesProfessor,
  cartoesDiretor
};
