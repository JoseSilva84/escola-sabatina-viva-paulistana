const { Router } = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const { z } = require("zod");
const prisma = require("../utils/prisma");
const cloudinary = require("../utils/cloudinary");
const { usuarios } = require("../data/store");
const { autenticar, autorizar } = require("../middleware/auth");
const asyncHandler = require("../utils/asyncHandler");
const AppError = require("../utils/AppError");

const routes = Router();
const uploadFotoPerfil = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 3 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype?.startsWith("image/")) {
      return cb(new AppError("Envie apenas arquivos de imagem", 400));
    }
    cb(null, true);
  }
});

const loginSchema = z.object({
  email: z.string().email().optional(),
  codigoAcesso: z.string().min(1).optional(),
  distritoId: z.string().min(1).optional(),
  igrejaId: z.string().min(1).optional(),
  senha: z.string().min(1)
}).refine(
  (dados) => dados.email || dados.codigoAcesso || (dados.distritoId && dados.igrejaId),
  { message: "Informe igreja, código de acesso ou e-mail" }
);

function payloadUsuario(usuario) {
  return {
    id: usuario.id,
    nome: usuario.nome,
    email: usuario.email,
    codigoAcesso: usuario.codigoAcesso || null,
    whatsapp: usuario.whatsapp || null,
    fotoUrl: usuario.fotoUrl || null,
    sexoPerfil: usuario.sexoPerfil || null,
    papel: usuario.papel,
    igrejaId: usuario.igrejaId,
    distritoId: usuario.distritoId || usuario.igreja?.distritoId || null,
    distritoNome: usuario.igreja?.distrito?.nome || null,
    igrejaNome: usuario.igreja?.nome,
    deveTrocarSenha: Boolean(usuario.deveTrocarSenha),
    perfilPendente: usuario.papel === "DIRETOR" && usuario.nome === "Diretor da Escola Sabatina",
    unidadeId: usuario.unidadesProfessor?.[0]?.id || usuario.unidadeId,
    alunoId: usuario.aluno?.id || usuario.alunoId
  };
}

routes.get("/distritos", asyncHandler(async (_req, res) => {
  const distritos = await prisma.distrito.findMany({
    where: { igrejas: { some: { usuarios: { some: { papel: "DIRETOR", ativo: true } } } } },
    select: { id: true, nome: true },
    orderBy: { nome: "asc" }
  });
  res.json(distritos);
}));

routes.get("/distritos/:distritoId/igrejas", asyncHandler(async (req, res) => {
  const igrejas = await prisma.igreja.findMany({
    where: {
      distritoId: req.params.distritoId,
      usuarios: { some: { papel: "DIRETOR", ativo: true } }
    },
    select: { id: true, nome: true },
    orderBy: { nome: "asc" }
  });
  res.json(igrejas);
}));

routes.post("/login", asyncHandler(async (req, res) => {
  const dados = loginSchema.parse(req.body);
  let usuario = null;

  try {
    const where = dados.distritoId && dados.igrejaId
      ? {
          papel: "DIRETOR",
          igrejaId: dados.igrejaId,
          igreja: { distritoId: dados.distritoId }
        }
      : dados.codigoAcesso
        ? { codigoAcesso: { equals: dados.codigoAcesso.trim(), mode: "insensitive" } }
        : { email: dados.email.toLowerCase() };

    usuario = await prisma.usuario.findFirst({
      where,
      include: {
        igreja: { include: { distrito: true } },
        aluno: true,
        unidadesProfessor: { where: { ativa: true }, take: 1 }
      }
    });
  } catch {
    usuario = null;
  }

  if (!usuario && dados.email) {
    usuario = usuarios.find((item) => item.email.toLowerCase() === dados.email.toLowerCase());
  }

  if (!usuario || usuario.ativo === false || !bcrypt.compareSync(dados.senha, usuario.senhaHash)) {
    throw new AppError("Dados de acesso ou senha inválidos", 401);
  }

  const payload = payloadUsuario(usuario);
  const token = jwt.sign(payload, process.env.JWT_SECRET || "dev-secret", { expiresIn: "8h" });
  if (!String(usuario.id).startsWith("u-")) {
    await prisma.usuario.update({
      where: { id: usuario.id },
      data: { ultimoLoginEm: new Date() }
    });
  }
  res.json({ token, usuario: payload });
}));

routes.get("/me", autenticar, (req, res) => {
  res.json({ usuario: req.usuario });
});

routes.patch("/me", autenticar, uploadFotoPerfil.single("foto"), asyncHandler(async (req, res) => {
  const dados = z.object({
    nome: z.string().trim().min(2).optional(),
    whatsapp: z.string().trim().optional().nullable(),
    sexoPerfil: z.enum(["MASCULINO", "FEMININO"]).optional().or(z.literal("")).nullable(),
    email: z.string().email().optional()
  }).parse(req.body);

  const usuario = await prisma.usuario.findUnique({
    where: { id: req.usuario.id },
    include: {
      igreja: { include: { distrito: true } },
      aluno: true,
      unidadesProfessor: { where: { ativa: true }, take: 1 }
    }
  });

  if (!usuario) throw new AppError("Usuario nao encontrado", 404);

  let fotoUrl = null;
  if (req.file) {
    if (!process.env.CLOUDINARY_URL || process.env.CLOUDINARY_URL.includes("...")) {
      throw new AppError("O envio de fotos ainda nao esta configurado", 500);
    }
    const resultado = await enviarFotoPerfil(req.file.buffer, req.usuario.id);
    fotoUrl = resultado.secure_url;
  }

  const atualizado = await prisma.usuario.update({
    where: { id: usuario.id },
    data: {
      ...(dados.nome !== undefined ? { nome: dados.nome } : {}),
      ...(dados.whatsapp !== undefined ? { whatsapp: dados.whatsapp || null } : {}),
      ...(dados.sexoPerfil !== undefined ? { sexoPerfil: dados.sexoPerfil || null } : {}),
      ...(dados.email !== undefined ? { email: dados.email.toLowerCase() } : {}),
      ...(fotoUrl ? { fotoUrl } : {})
    },
    include: {
      igreja: { include: { distrito: true } },
      aluno: true,
      unidadesProfessor: { where: { ativa: true }, take: 1 }
    }
  });

  res.json({ usuario: payloadUsuario(atualizado) });
}));

routes.post("/trocar-senha", autenticar, asyncHandler(async (req, res) => {
  const dados = z.object({
    senhaAtual: z.string().min(1),
    novaSenha: z.string().min(8)
  }).parse(req.body);

  const usuario = await prisma.usuario.findUnique({ where: { id: req.usuario.id } });
  if (!usuario || !bcrypt.compareSync(dados.senhaAtual, usuario.senhaHash)) {
    throw new AppError("Senha atual inválida", 401);
  }

  await prisma.usuario.update({
    where: { id: usuario.id },
    data: {
      senhaHash: bcrypt.hashSync(dados.novaSenha, 12),
      senhaTemporaria: null,
      deveTrocarSenha: false
    }
  });
  res.status(204).send();
}));

function enviarFotoPerfil(buffer, usuarioId) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: "professor-nota-10/diretores",
        public_id: usuarioId,
        resource_type: "image",
        overwrite: true,
        transformation: [
          { width: 500, height: 500, crop: "fill", gravity: "face" },
          { quality: "auto", fetch_format: "auto" }
        ]
      },
      (error, result) => error ? reject(error) : resolve(result)
    );
    stream.end(buffer);
  });
}

routes.post("/perfil-inicial", autenticar, autorizar("DIRETOR"), uploadFotoPerfil.single("foto"), asyncHandler(async (req, res) => {
  const dados = z.object({
    nome: z.string().trim().min(2),
    whatsapp: z.string().trim().min(8),
    sexoPerfil: z.enum(["MASCULINO", "FEMININO"])
  }).parse(req.body);

  let fotoUrl = null;
  if (req.file) {
    if (!process.env.CLOUDINARY_URL || process.env.CLOUDINARY_URL.includes("...")) {
      throw new AppError("O envio de fotos ainda não está configurado", 500);
    }
    const resultado = await enviarFotoPerfil(req.file.buffer, req.usuario.id);
    fotoUrl = resultado.secure_url;
  }

  const usuario = await prisma.usuario.update({
    where: { id: req.usuario.id },
    data: {
      nome: dados.nome,
      whatsapp: dados.whatsapp,
      sexoPerfil: dados.sexoPerfil,
      ...(fotoUrl ? { fotoUrl } : {})
    },
    select: { nome: true, whatsapp: true, fotoUrl: true, sexoPerfil: true }
  });

  res.json({ usuario: { ...usuario, perfilPendente: false } });
}));

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
