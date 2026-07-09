CREATE TABLE "Distrito" (
  "id" TEXT NOT NULL,
  "nome" TEXT NOT NULL,
  "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Distrito_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Distrito_nome_key" ON "Distrito"("nome");

INSERT INTO "Distrito" ("id", "nome")
SELECT DISTINCT "distritoId", "distritoId"
FROM "Igreja"
WHERE "distritoId" IS NOT NULL
ON CONFLICT ("id") DO NOTHING;

ALTER TABLE "Usuario"
  ADD COLUMN "codigoAcesso" TEXT,
  ADD COLUMN "ativo" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "deveTrocarSenha" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "ultimoLoginEm" TIMESTAMP(3),
  ADD COLUMN "atualizadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE UNIQUE INDEX "Igreja_distritoId_nome_key"
  ON "Igreja"("distritoId", "nome");

CREATE INDEX "Usuario_igrejaId_papel_idx"
  ON "Usuario"("igrejaId", "papel");

CREATE UNIQUE INDEX "Usuario_codigoAcesso_key"
  ON "Usuario"("codigoAcesso");

ALTER TABLE "Igreja"
  ADD CONSTRAINT "Igreja_distritoId_fkey"
  FOREIGN KEY ("distritoId") REFERENCES "Distrito"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
