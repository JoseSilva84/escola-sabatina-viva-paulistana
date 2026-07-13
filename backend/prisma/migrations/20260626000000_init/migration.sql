CREATE TYPE "Papel" AS ENUM ('ADMIN', 'DIRETOR', 'PROFESSOR', 'ALUNO');

CREATE TYPE "CumprimentoClasses" AS ENUM ('SIM', 'NAO', 'ALGUMAS');

CREATE TABLE "Igreja" (
  "id" TEXT NOT NULL,
  "nome" TEXT NOT NULL,
  "distritoId" TEXT,
  "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Igreja_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Usuario" (
  "id" TEXT NOT NULL,
  "nome" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "senhaHash" TEXT NOT NULL,
  "papel" "Papel" NOT NULL,
  "igrejaId" TEXT NOT NULL,
  "distritoId" TEXT,
  "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "UnidadeAcao" (
  "id" TEXT NOT NULL,
  "nome" TEXT NOT NULL,
  "igrejaId" TEXT NOT NULL,
  "professorId" TEXT,
  "diretorId" TEXT,
  "ativa" BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT "UnidadeAcao_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Aluno" (
  "id" TEXT NOT NULL,
  "nome" TEXT NOT NULL,
  "unidadeId" TEXT NOT NULL,
  "usuarioId" TEXT,
  "nivel" INTEGER NOT NULL DEFAULT 1,
  "pontos" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "Aluno_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ColetaSemanalAluno" (
  "id" TEXT NOT NULL,
  "alunoId" TEXT NOT NULL,
  "unidadeId" TEXT NOT NULL,
  "professorId" TEXT NOT NULL,
  "igrejaId" TEXT NOT NULL,
  "distritoId" TEXT,
  "ano" INTEGER NOT NULL,
  "numeroSemana" INTEGER NOT NULL,
  "estudouLicao" BOOLEAN NOT NULL DEFAULT false,
  "foiPontual" BOOLEAN NOT NULL DEFAULT false,
  "pequenoGrupo" BOOLEAN,
  "acaoSolidaria" BOOLEAN,
  "acaoSolidariaDescricao" TEXT,
  "acaoSolidariaTipo" TEXT,
  "estudosBiblicos" INTEGER,
  "observacao" TEXT,
  "preenchidoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "atualizadoEm" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ColetaSemanalAluno_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ColetaSemanalProfessor" (
  "id" TEXT NOT NULL,
  "unidadeId" TEXT NOT NULL,
  "professorId" TEXT NOT NULL,
  "igrejaId" TEXT NOT NULL,
  "distritoId" TEXT,
  "ano" INTEGER NOT NULL,
  "numeroSemana" INTEGER NOT NULL,
  "participouPequenoGrupo" BOOLEAN NOT NULL DEFAULT false,
  "participouAcaoSolidaria" BOOLEAN NOT NULL DEFAULT false,
  "acaoSolidariaDescricao" TEXT,
  "acaoSolidariaTipo" TEXT,
  "ministrouEstudoBiblico" BOOLEAN NOT NULL DEFAULT false,
  "preenchidoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "atualizadoEm" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ColetaSemanalProfessor_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CartaoAluno" (
  "id" TEXT NOT NULL,
  "alunoId" TEXT NOT NULL,
  "trimestre" INTEGER NOT NULL,
  "ano" INTEGER NOT NULL,
  "pequenoGrupo" BOOLEAN NOT NULL DEFAULT false,
  "acaoSolidaria" BOOLEAN NOT NULL DEFAULT false,
  "acaoSolidariaDescricao" TEXT,
  "acaoSolidariaTipo" TEXT,
  "ministrouEstudoBiblico" BOOLEAN NOT NULL DEFAULT false,
  CONSTRAINT "CartaoAluno_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CartaoAlunoSabado" (
  "id" TEXT NOT NULL,
  "cartaoAlunoId" TEXT NOT NULL,
  "numeroSabado" INTEGER NOT NULL,
  "estudouSemana" BOOLEAN NOT NULL DEFAULT false,
  "pontual" BOOLEAN NOT NULL DEFAULT false,
  CONSTRAINT "CartaoAlunoSabado_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CartaoProfessor" (
  "id" TEXT NOT NULL,
  "unidadeId" TEXT NOT NULL,
  "trimestre" INTEGER NOT NULL,
  "ano" INTEGER NOT NULL,
  "incentivaEstudo" BOOLEAN NOT NULL DEFAULT false,
  "incentivaPontualidade" BOOLEAN NOT NULL DEFAULT false,
  "visitouAlunos" BOOLEAN NOT NULL DEFAULT false,
  "primeiraVisita" TIMESTAMP(3),
  "ultimaVisita" TIMESTAMP(3),
  "pequenoGrupoResponsavel" TEXT,
  "pequenoGrupoEndereco" TEXT,
  "pequenoGrupoDia" TEXT,
  "pequenoGrupoHorario" TEXT,
  "acaoSocialDescricao" TEXT,
  "acaoSocialTipo" TEXT,
  "acaoSocialData" TIMESTAMP(3),
  "acaoSocialLocal" TEXT,
  "pessoasAlcancadas" INTEGER NOT NULL DEFAULT 0,
  "interessadosAlcancados" INTEGER NOT NULL DEFAULT 0,
  "batismos" INTEGER NOT NULL DEFAULT 0,
  "batismosNomes" TEXT,
  "planejamentoTrimestral" BOOLEAN NOT NULL DEFAULT false,
  "promoveuConfraternizacao" BOOLEAN NOT NULL DEFAULT false,
  CONSTRAINT "CartaoProfessor_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CartaoProfessorPresenca" (
  "id" TEXT NOT NULL,
  "cartaoProfessorId" TEXT NOT NULL,
  "numeroSabado" INTEGER NOT NULL,
  "presente" BOOLEAN NOT NULL DEFAULT false,
  CONSTRAINT "CartaoProfessorPresenca_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CartaoProfessorEstudoBiblico" (
  "id" TEXT NOT NULL,
  "cartaoProfessorId" TEXT NOT NULL,
  "alunoNome" TEXT NOT NULL,
  "interessadoNome" TEXT NOT NULL,
  CONSTRAINT "CartaoProfessorEstudoBiblico_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CartaoProfessorConfraternizacao" (
  "id" TEXT NOT NULL,
  "cartaoProfessorId" TEXT NOT NULL,
  "descricao" TEXT NOT NULL,
  "data" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CartaoProfessorConfraternizacao_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CartaoDiretor" (
  "id" TEXT NOT NULL,
  "igrejaId" TEXT NOT NULL,
  "trimestre" INTEGER NOT NULL,
  "ano" INTEGER NOT NULL,
  "cumprimentoClasses" "CumprimentoClasses" NOT NULL DEFAULT 'ALGUMAS',
  "classeProfessoresFrequencia" TEXT,
  "classeProfessoresParticipantes" TEXT,
  "classeInteressadosImplantada" BOOLEAN NOT NULL DEFAULT false,
  "classeInteressadosQuantidade" INTEGER NOT NULL DEFAULT 0,
  "primeiraVisitaProfessores" TIMESTAMP(3),
  "ultimaVisitaProfessores" TIMESTAMP(3),
  CONSTRAINT "CartaoDiretor_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Usuario_email_key" ON "Usuario"("email");
CREATE UNIQUE INDEX "Aluno_usuarioId_key" ON "Aluno"("usuarioId");
CREATE UNIQUE INDEX "ColetaSemanalAluno_alunoId_ano_numeroSemana_key" ON "ColetaSemanalAluno"("alunoId", "ano", "numeroSemana");
CREATE INDEX "ColetaSemanalAluno_unidadeId_ano_numeroSemana_idx" ON "ColetaSemanalAluno"("unidadeId", "ano", "numeroSemana");
CREATE INDEX "ColetaSemanalAluno_professorId_ano_idx" ON "ColetaSemanalAluno"("professorId", "ano");
CREATE INDEX "ColetaSemanalAluno_igrejaId_ano_idx" ON "ColetaSemanalAluno"("igrejaId", "ano");
CREATE UNIQUE INDEX "ColetaSemanalProfessor_unidadeId_ano_numeroSemana_key" ON "ColetaSemanalProfessor"("unidadeId", "ano", "numeroSemana");
CREATE INDEX "ColetaSemanalProfessor_professorId_ano_idx" ON "ColetaSemanalProfessor"("professorId", "ano");
CREATE INDEX "ColetaSemanalProfessor_igrejaId_ano_idx" ON "ColetaSemanalProfessor"("igrejaId", "ano");
CREATE UNIQUE INDEX "CartaoAluno_alunoId_trimestre_ano_key" ON "CartaoAluno"("alunoId", "trimestre", "ano");
CREATE UNIQUE INDEX "CartaoAlunoSabado_cartaoAlunoId_numeroSabado_key" ON "CartaoAlunoSabado"("cartaoAlunoId", "numeroSabado");
CREATE UNIQUE INDEX "CartaoProfessor_unidadeId_trimestre_ano_key" ON "CartaoProfessor"("unidadeId", "trimestre", "ano");
CREATE UNIQUE INDEX "CartaoProfessorPresenca_cartaoProfessorId_numeroSabado_key" ON "CartaoProfessorPresenca"("cartaoProfessorId", "numeroSabado");
CREATE UNIQUE INDEX "CartaoDiretor_igrejaId_trimestre_ano_key" ON "CartaoDiretor"("igrejaId", "trimestre", "ano");

ALTER TABLE "Usuario" ADD CONSTRAINT "Usuario_igrejaId_fkey" FOREIGN KEY ("igrejaId") REFERENCES "Igreja"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "UnidadeAcao" ADD CONSTRAINT "UnidadeAcao_igrejaId_fkey" FOREIGN KEY ("igrejaId") REFERENCES "Igreja"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "UnidadeAcao" ADD CONSTRAINT "UnidadeAcao_professorId_fkey" FOREIGN KEY ("professorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "UnidadeAcao" ADD CONSTRAINT "UnidadeAcao_diretorId_fkey" FOREIGN KEY ("diretorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Aluno" ADD CONSTRAINT "Aluno_unidadeId_fkey" FOREIGN KEY ("unidadeId") REFERENCES "UnidadeAcao"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Aluno" ADD CONSTRAINT "Aluno_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ColetaSemanalAluno" ADD CONSTRAINT "ColetaSemanalAluno_alunoId_fkey" FOREIGN KEY ("alunoId") REFERENCES "Aluno"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ColetaSemanalAluno" ADD CONSTRAINT "ColetaSemanalAluno_unidadeId_fkey" FOREIGN KEY ("unidadeId") REFERENCES "UnidadeAcao"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ColetaSemanalAluno" ADD CONSTRAINT "ColetaSemanalAluno_professorId_fkey" FOREIGN KEY ("professorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ColetaSemanalProfessor" ADD CONSTRAINT "ColetaSemanalProfessor_unidadeId_fkey" FOREIGN KEY ("unidadeId") REFERENCES "UnidadeAcao"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ColetaSemanalProfessor" ADD CONSTRAINT "ColetaSemanalProfessor_professorId_fkey" FOREIGN KEY ("professorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CartaoAluno" ADD CONSTRAINT "CartaoAluno_alunoId_fkey" FOREIGN KEY ("alunoId") REFERENCES "Aluno"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CartaoAlunoSabado" ADD CONSTRAINT "CartaoAlunoSabado_cartaoAlunoId_fkey" FOREIGN KEY ("cartaoAlunoId") REFERENCES "CartaoAluno"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CartaoProfessor" ADD CONSTRAINT "CartaoProfessor_unidadeId_fkey" FOREIGN KEY ("unidadeId") REFERENCES "UnidadeAcao"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CartaoProfessorPresenca" ADD CONSTRAINT "CartaoProfessorPresenca_cartaoProfessorId_fkey" FOREIGN KEY ("cartaoProfessorId") REFERENCES "CartaoProfessor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CartaoProfessorEstudoBiblico" ADD CONSTRAINT "CartaoProfessorEstudoBiblico_cartaoProfessorId_fkey" FOREIGN KEY ("cartaoProfessorId") REFERENCES "CartaoProfessor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CartaoProfessorConfraternizacao" ADD CONSTRAINT "CartaoProfessorConfraternizacao_cartaoProfessorId_fkey" FOREIGN KEY ("cartaoProfessorId") REFERENCES "CartaoProfessor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CartaoDiretor" ADD CONSTRAINT "CartaoDiretor_igrejaId_fkey" FOREIGN KEY ("igrejaId") REFERENCES "Igreja"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
