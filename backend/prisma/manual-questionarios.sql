ALTER TABLE "Igreja" ADD COLUMN IF NOT EXISTS "distritoId" TEXT;

ALTER TABLE "Usuario" ADD COLUMN IF NOT EXISTS "distritoId" TEXT;

ALTER TABLE "UnidadeAcao" ADD COLUMN IF NOT EXISTS "diretorId" TEXT;
ALTER TABLE "UnidadeAcao" ADD COLUMN IF NOT EXISTS "ativa" BOOLEAN NOT NULL DEFAULT true;

DROP INDEX IF EXISTS "UnidadeAcao_professorId_key";

ALTER TABLE "CartaoAluno" ADD COLUMN IF NOT EXISTS "acaoSolidariaTipo" TEXT;

ALTER TABLE "CartaoProfessor" ADD COLUMN IF NOT EXISTS "batismosNomes" TEXT;

CREATE TABLE IF NOT EXISTS "ColetaSemanalAluno" (
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
  "observacao" TEXT,
  "preenchidoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "atualizadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ColetaSemanalAluno_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ColetaSemanalAluno_alunoId_fkey'
  ) THEN
    ALTER TABLE "ColetaSemanalAluno"
      ADD CONSTRAINT "ColetaSemanalAluno_alunoId_fkey"
      FOREIGN KEY ("alunoId") REFERENCES "Aluno"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ColetaSemanalAluno_unidadeId_fkey'
  ) THEN
    ALTER TABLE "ColetaSemanalAluno"
      ADD CONSTRAINT "ColetaSemanalAluno_unidadeId_fkey"
      FOREIGN KEY ("unidadeId") REFERENCES "UnidadeAcao"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ColetaSemanalAluno_professorId_fkey'
  ) THEN
    ALTER TABLE "ColetaSemanalAluno"
      ADD CONSTRAINT "ColetaSemanalAluno_professorId_fkey"
      FOREIGN KEY ("professorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'UnidadeAcao_diretorId_fkey'
  ) THEN
    ALTER TABLE "UnidadeAcao"
      ADD CONSTRAINT "UnidadeAcao_diretorId_fkey"
      FOREIGN KEY ("diretorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "ColetaSemanalAluno_alunoId_ano_numeroSemana_key"
  ON "ColetaSemanalAluno"("alunoId", "ano", "numeroSemana");

CREATE INDEX IF NOT EXISTS "ColetaSemanalAluno_unidadeId_ano_numeroSemana_idx"
  ON "ColetaSemanalAluno"("unidadeId", "ano", "numeroSemana");

CREATE INDEX IF NOT EXISTS "ColetaSemanalAluno_professorId_ano_idx"
  ON "ColetaSemanalAluno"("professorId", "ano");

CREATE INDEX IF NOT EXISTS "ColetaSemanalAluno_igrejaId_ano_idx"
  ON "ColetaSemanalAluno"("igrejaId", "ano");
