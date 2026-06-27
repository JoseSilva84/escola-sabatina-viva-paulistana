require("dotenv").config();

const prisma = require("../utils/prisma");
const {
  alunos,
  cartoesAluno,
  cartoesDiretor,
  cartoesProfessor,
  igrejas,
  unidades,
  usuarios
} = require("../data/store");

async function main() {
  for (const igreja of igrejas) {
    await prisma.igreja.upsert({
      where: { id: igreja.id },
      update: { nome: igreja.nome },
      create: igreja
    });
  }

  for (const usuario of usuarios) {
    await prisma.usuario.upsert({
      where: { id: usuario.id },
      update: {
        nome: usuario.nome,
        email: usuario.email.toLowerCase(),
        senhaHash: usuario.senhaHash,
        papel: usuario.papel,
        igrejaId: usuario.igrejaId
      },
      create: {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email.toLowerCase(),
        senhaHash: usuario.senhaHash,
        papel: usuario.papel,
        igrejaId: usuario.igrejaId
      }
    });
  }

  for (const unidade of unidades) {
    await prisma.unidadeAcao.upsert({
      where: { id: unidade.id },
      update: {
        nome: unidade.nome,
        igrejaId: unidade.igrejaId,
        professorId: unidade.professorId,
        diretorId: "u-diretor",
        ativa: true
      },
      create: {
        id: unidade.id,
        nome: unidade.nome,
        igrejaId: unidade.igrejaId,
        professorId: unidade.professorId,
        diretorId: "u-diretor",
        ativa: true
      }
    });
  }

  for (const aluno of alunos) {
    await prisma.aluno.upsert({
      where: { id: aluno.id },
      update: {
        nome: aluno.nome,
        unidadeId: aluno.unidadeId,
        nivel: aluno.nivel,
        pontos: aluno.pontos,
        usuarioId: aluno.id === "aluno-arthur" ? "u-aluno" : null
      },
      create: {
        id: aluno.id,
        nome: aluno.nome,
        unidadeId: aluno.unidadeId,
        nivel: aluno.nivel,
        pontos: aluno.pontos,
        usuarioId: aluno.id === "aluno-arthur" ? "u-aluno" : null
      }
    });
  }

  for (const cartao of cartoesAluno) {
    await prisma.cartaoAluno.upsert({
      where: {
        alunoId_trimestre_ano: {
          alunoId: cartao.alunoId,
          trimestre: cartao.trimestre,
          ano: cartao.ano
        }
      },
      update: {
        pequenoGrupo: cartao.pequenoGrupo,
        acaoSolidaria: cartao.acaoSolidaria,
        acaoSolidariaDescricao: cartao.acaoSolidariaDescricao,
        ministrouEstudoBiblico: cartao.ministrouEstudoBiblico
      },
      create: {
        id: cartao.id,
        alunoId: cartao.alunoId,
        trimestre: cartao.trimestre,
        ano: cartao.ano,
        pequenoGrupo: cartao.pequenoGrupo,
        acaoSolidaria: cartao.acaoSolidaria,
        acaoSolidariaDescricao: cartao.acaoSolidariaDescricao,
        ministrouEstudoBiblico: cartao.ministrouEstudoBiblico,
        sabados: { create: cartao.sabados }
      }
    });
  }

  for (const cartao of cartoesProfessor) {
    await prisma.cartaoProfessor.upsert({
      where: {
        unidadeId_trimestre_ano: {
          unidadeId: cartao.unidadeId,
          trimestre: cartao.trimestre,
          ano: cartao.ano
        }
      },
      update: {
        incentivaEstudo: cartao.incentivaEstudo,
        incentivaPontualidade: cartao.incentivaPontualidade,
        primeiraVisita: new Date(cartao.primeiraVisita),
        ultimaVisita: new Date(cartao.ultimaVisita),
        pequenoGrupoResponsavel: cartao.pequenoGrupoResponsavel,
        pequenoGrupoEndereco: cartao.pequenoGrupoEndereco,
        pequenoGrupoDia: cartao.pequenoGrupoDia,
        pequenoGrupoHorario: cartao.pequenoGrupoHorario,
        acaoSocialDescricao: cartao.acaoSocialDescricao,
        acaoSocialTipo: cartao.acaoSocialTipo,
        acaoSocialData: new Date(cartao.acaoSocialData),
        acaoSocialLocal: cartao.acaoSocialLocal,
        pessoasAlcancadas: cartao.pessoasAlcancadas,
        interessadosAlcancados: cartao.interessadosAlcancados,
        batismos: cartao.batismos,
        planejamentoTrimestral: cartao.planejamentoTrimestral
      },
      create: {
        id: cartao.id,
        unidadeId: cartao.unidadeId,
        trimestre: cartao.trimestre,
        ano: cartao.ano,
        incentivaEstudo: cartao.incentivaEstudo,
        incentivaPontualidade: cartao.incentivaPontualidade,
        primeiraVisita: new Date(cartao.primeiraVisita),
        ultimaVisita: new Date(cartao.ultimaVisita),
        pequenoGrupoResponsavel: cartao.pequenoGrupoResponsavel,
        pequenoGrupoEndereco: cartao.pequenoGrupoEndereco,
        pequenoGrupoDia: cartao.pequenoGrupoDia,
        pequenoGrupoHorario: cartao.pequenoGrupoHorario,
        acaoSocialDescricao: cartao.acaoSocialDescricao,
        acaoSocialTipo: cartao.acaoSocialTipo,
        acaoSocialData: new Date(cartao.acaoSocialData),
        acaoSocialLocal: cartao.acaoSocialLocal,
        pessoasAlcancadas: cartao.pessoasAlcancadas,
        interessadosAlcancados: cartao.interessadosAlcancados,
        batismos: cartao.batismos,
        planejamentoTrimestral: cartao.planejamentoTrimestral,
        presencas: { create: cartao.presencas },
        estudosBiblicos: { create: cartao.estudosBiblicos.map(({ id, ...item }) => item) },
        confraternizacoes: { create: cartao.confraternizacoes.map(({ id, ...item }) => ({ ...item, data: new Date(item.data) })) }
      }
    });
  }

  for (const cartao of cartoesDiretor) {
    await prisma.cartaoDiretor.upsert({
      where: {
        igrejaId_trimestre_ano: {
          igrejaId: cartao.igrejaId,
          trimestre: cartao.trimestre,
          ano: cartao.ano
        }
      },
      update: {
        cumprimentoClasses: cartao.cumprimentoClasses,
        classeProfessoresFrequencia: cartao.classeProfessoresFrequencia,
        classeProfessoresParticipantes: cartao.classeProfessoresParticipantes,
        classeInteressadosImplantada: cartao.classeInteressadosImplantada,
        classeInteressadosQuantidade: cartao.classeInteressadosQuantidade,
        primeiraVisitaProfessores: new Date(cartao.primeiraVisitaProfessores),
        ultimaVisitaProfessores: new Date(cartao.ultimaVisitaProfessores)
      },
      create: {
        id: cartao.id,
        igrejaId: cartao.igrejaId,
        trimestre: cartao.trimestre,
        ano: cartao.ano,
        cumprimentoClasses: cartao.cumprimentoClasses,
        classeProfessoresFrequencia: cartao.classeProfessoresFrequencia,
        classeProfessoresParticipantes: cartao.classeProfessoresParticipantes,
        classeInteressadosImplantada: cartao.classeInteressadosImplantada,
        classeInteressadosQuantidade: cartao.classeInteressadosQuantidade,
        primeiraVisitaProfessores: new Date(cartao.primeiraVisitaProfessores),
        ultimaVisitaProfessores: new Date(cartao.ultimaVisitaProfessores)
      }
    });
  }

  console.log("Dados iniciais gravados no PostgreSQL.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
