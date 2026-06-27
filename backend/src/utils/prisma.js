const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const { Pool } = require("pg");

function criarPrisma() {
  const connectionString = process.env.DATABASE_URL;
  if (connectionString) {
    const pool = new Pool({
      connectionString,
      ssl: true
    });
    const adapter = new PrismaPg(pool);
    return new PrismaClient({ adapter });
  }

  return new PrismaClient();
}

const prisma = global.__nota10Prisma || criarPrisma();

if (process.env.NODE_ENV !== "production") {
  global.__nota10Prisma = prisma;
}

module.exports = prisma;
