CREATE TABLE IF NOT EXISTS "ColetaSemanalProfessor" (
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
  "atualizadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ColetaSemanalProfessor_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ColetaSemanalProfessor_unidadeId_ano_numeroSemana_key"
  ON "ColetaSemanalProfessor"("unidadeId", "ano", "numeroSemana");

CREATE INDEX IF NOT EXISTS "ColetaSemanalProfessor_professorId_ano_idx"
  ON "ColetaSemanalProfessor"("professorId", "ano");

CREATE INDEX IF NOT EXISTS "ColetaSemanalProfessor_igrejaId_ano_idx"
  ON "ColetaSemanalProfessor"("igrejaId", "ano");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ColetaSemanalProfessor_unidadeId_fkey'
  ) THEN
    ALTER TABLE "ColetaSemanalProfessor"
      ADD CONSTRAINT "ColetaSemanalProfessor_unidadeId_fkey"
      FOREIGN KEY ("unidadeId") REFERENCES "UnidadeAcao"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ColetaSemanalProfessor_professorId_fkey'
  ) THEN
    ALTER TABLE "ColetaSemanalProfessor"
      ADD CONSTRAINT "ColetaSemanalProfessor_professorId_fkey"
      FOREIGN KEY ("professorId") REFERENCES "Usuario"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;
