const { Router } = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { z } = require("zod");
const prisma = require("../utils/prisma");
const { usuarios } = require("../data/store");
const { autenticar, autorizar } = require("../middleware/auth");
const asyncHandler = require("../utils/asyncHandler");
const AppError = require("../utils/AppError");

const routes = Router();

const loginSchema = z.object({
  email: z.string().email(),
  senha: z.string().min(1)
});

function payloadUsuario(usuario) {
  return {
    id: usuario.id,
    nome: usuario.nome,
    email: usuario.email,
    papel: usuario.papel,
    igrejaId: usuario.igrejaId,
    distritoId: usuario.distritoId || usuario.igreja?.distritoId || null,
    igrejaNome: usuario.igreja?.nome,
    unidadeId: usuario.unidadesProfessor?.[0]?.id || usuario.unidadeId,
    alunoId: usuario.aluno?.id || usuario.alunoId
  };
}

routes.post("/login", asyncHandler(async (req, res) => {
  const dados = loginSchema.parse(req.body);
  let usuario = null;

  try {
    usuario = await prisma.usuario.findUnique({
      where: { email: dados.email.toLowerCase() },
      include: {
        igreja: true,
        aluno: true,
        unidadesProfessor: { where: { ativa: true }, take: 1 }
      }
    });
  } catch {
    usuario = null;
  }

  if (!usuario) {
    usuario = usuarios.find((item) => item.email.toLowerCase() === dados.email.toLowerCase());
  }

  if (!usuario || !bcrypt.compareSync(dados.senha, usuario.senhaHash)) {
    throw new AppError("E-mail ou senha invalidos", 401);
  }

  const payload = payloadUsuario(usuario);
  const token = jwt.sign(payload, process.env.JWT_SECRET || "dev-secret", { expiresIn: "8h" });
  res.json({ token, usuario: payload });
}));

routes.get("/me", autenticar, (req, res) => {
  res.json({ usuario: req.usuario });
});

routes.post("/registrar", autenticar, autorizar("ADMIN"), asyncHandler(async (req, res) => {
  const schema = z.object({
    nome: z.string().min(2),
    email: z.string().email(),
    senha: z.string().min(6),
    papel: z.enum(["ADMIN", "DIRETOR", "PROFESSOR", "ALUNO"]),
    igrejaId: z.string().optional()
  });
  const dados = schema.parse(req.body);

  const usuario = await prisma.usuario.create({
    data: {
      nome: dados.nome,
      email: dados.email.toLowerCase(),
      senhaHash: bcrypt.hashSync(dados.senha, 8),
      papel: dados.papel,
      igrejaId: dados.igrejaId || req.usuario.igrejaId,
      distritoId: req.usuario.distritoId || null
    }
  });

  res.status(201).json({ usuario: { ...usuario, senhaHash: undefined } });
}));

module.exports = routes;
