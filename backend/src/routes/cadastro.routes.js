const { Router } = require("express");
const { z } = require("zod");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const multer = require("multer");
const prisma = require("../utils/prisma");
const cloudinary = require("../utils/cloudinary");
const asyncHandler = require("../utils/asyncHandler");
const { autenticar, autorizar } = require("../middleware/auth");
const { igrejas, unidades, alunos } = require("../data/store");
const AppError = require("../utils/AppError");

const routes = Router();
routes.use(autenticar);

const uploadFotoAluno = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 3 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype?.startsWith("image/")) {
      return cb(new AppError("Envie apenas arquivos de imagem", 400));
    }
    cb(null, true);
  }
});

function valorCloudinaryPreenchido(valor) {
  return Boolean(valor && !valor.includes("...") && !valor.includes("API_KEY"));
}

function fotoPadraoPorSexo(sexo) {
  const masculina = process.env.CLOUDINARY_DEFAULT_MALE_URL;
  const feminina = process.env.CLOUDINARY_DEFAULT_FEMALE_URL;

  if (sexo === "FEMININO") {
    return valorCloudinaryPreenchido(feminina) ? feminina : "https://randomuser.me/api/portraits/women/44.jpg";
  }

  return valorCloudinaryPreenchido(masculina) ? masculina : "https://randomuser.me/api/portraits/men/32.jpg";
}

function enviarFotoAluno(buffer, publicId) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: "professor-nota-10/alunos",
        public_id: publicId,
        resource_type: "image",
        overwrite: true,
        transformation: [
          { width: 600, height: 600, crop: "fill", gravity: "face" },
          { quality: "auto", fetch_format: "auto" }
        ]
      },
      (error, result) => error ? reject(error) : resolve(result)
    );

    stream.end(buffer);
  });
}

routes.get("/igrejas", asyncHandler(async (req, res) => {
  try {
    const where = req.usuario.papel === "ADMIN" ? {} : { id: req.usuario.igrejaId };
    const lista = await prisma.igreja.findMany({ where, orderBy: { nome: "asc" } });
    return res.json(lista);
  } catch {
    return res.json(igrejas);
  }
}));

routes.get("/professores", asyncHandler(async (req, res) => {
  const lista = await prisma.usuario.findMany({
    where: { papel: "PROFESSOR", igrejaId: req.usuario.igrejaId },
    select: {
      id: true,
      nome: true,
      email: true,
      codigoAcesso: true,
      igrejaId: true,
      ativo: true,
      deveTrocarSenha: true,
      criadoEm: true
    },
    orderBy: { nome: "asc" }
  });
  res.json(lista);
}));

function gerarSenhaTemporaria() {
  const letras = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  const numeros = "23456789";
  const simbolos = "!@#$%";
  const todos = letras + numeros + simbolos;
  const caracteres = [
    letras[crypto.randomInt(letras.length)],
    numeros[crypto.randomInt(numeros.length)],
    simbolos[crypto.randomInt(simbolos.length)]
  ];
  while (caracteres.length < 12) {
    caracteres.push(todos[crypto.randomInt(todos.length)]);
  }
  for (let indice = caracteres.length - 1; indice > 0; indice -= 1) {
    const troca = crypto.randomInt(indice + 1);
    [caracteres[indice], caracteres[troca]] = [caracteres[troca], caracteres[indice]];
  }
  return caracteres.join("");
}

function slugAcesso(valor) {
  return String(valor)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^\.+|\.+$/g, "");
}

async function gerarLoginProfessor(nome, nomeIgreja) {
  const base = `${slugAcesso(nome)}.${slugAcesso(nomeIgreja)}`.slice(0, 90);
  for (let tentativa = 1; tentativa <= 100; tentativa += 1) {
    const codigo = tentativa === 1 ? base : `${base}.${tentativa}`;
    const existente = await prisma.usuario.findFirst({
      where: { codigoAcesso: { equals: codigo, mode: "insensitive" } },
      select: { id: true }
    });
    if (!existente) return codigo;
  }
  return `${base}.${crypto.randomUUID().slice(0, 8)}`;
}

routes.post("/professores", autorizar("ADMIN", "DIRETOR"), asyncHandler(async (req, res) => {
  const dados = z.object({
    nome: z.string().trim().min(2),
    senha: z.string().min(8)
  }).parse(req.body);
  const igreja = await prisma.igreja.findUnique({
    where: { id: req.usuario.igrejaId },
    select: { nome: true }
  });
  if (!igreja) throw new AppError("Igreja não encontrada", 404);

  const codigoAcesso = await gerarLoginProfessor(dados.nome, igreja.nome);
  const email = `${codigoAcesso}@acesso.nota10.local`;

  const professor = await prisma.usuario.create({
    data: {
      nome: dados.nome,
      email,
      codigoAcesso,
      senhaHash: await bcrypt.hash(dados.senha, 12),
      senhaTemporaria: dados.senha,
      papel: "PROFESSOR",
      igrejaId: req.usuario.igrejaId,
      distritoId: req.usuario.distritoId || null,
      ativo: true,
      deveTrocarSenha: true
    },
    select: {
      id: true,
      nome: true,
      email: true,
      codigoAcesso: true,
      igrejaId: true,
      ativo: true,
      deveTrocarSenha: true
    }
  });

  res.status(201).json({ professor });
}));

routes.patch("/professores/:id/status", autorizar("ADMIN", "DIRETOR"), asyncHandler(async (req, res) => {
  const { ativo } = z.object({ ativo: z.boolean() }).parse(req.body);
  const professor = await prisma.usuario.findFirst({
    where: {
      id: req.params.id,
      papel: "PROFESSOR",
      igrejaId: req.usuario.igrejaId
    }
  });
  if (!professor) throw new AppError("Professor não encontrado nesta igreja", 404);

  const atualizado = await prisma.usuario.update({
    where: { id: professor.id },
    data: { ativo },
    select: { id: true, nome: true, codigoAcesso: true, ativo: true }
  });
  res.json(atualizado);
}));

routes.post("/professores/:id/redefinir-senha", autorizar("ADMIN", "DIRETOR"), asyncHandler(async (req, res) => {
  const professor = await prisma.usuario.findFirst({
    where: {
      id: req.params.id,
      papel: "PROFESSOR",
      igrejaId: req.usuario.igrejaId
    }
  });
  if (!professor) throw new AppError("Professor não encontrado nesta igreja", 404);

  const senhaTemporaria = gerarSenhaTemporaria();
  await prisma.usuario.update({
    where: { id: professor.id },
    data: {
      senhaHash: await bcrypt.hash(senhaTemporaria, 12),
      senhaTemporaria,
      deveTrocarSenha: true,
      ativo: true
    }
  });
  res.json({ senhaTemporaria });
}));

routes.get("/unidades", asyncHandler(async (req, res) => {
  try {
    const where = {};
    if (req.usuario.papel !== "ADMIN" || req.query.igrejaAtual === "true") {
      where.igrejaId = req.usuario.igrejaId;
    }
    if (req.usuario.papel === "PROFESSOR") {
      where.professorId = req.usuario.id;
    }

    const lista = await prisma.unidadeAcao.findMany({
      where,
      include: {
        igreja: true,
        professor: { select: { id: true, nome: true, email: true } },
        diretor: { select: { id: true, nome: true, email: true } },
        _count: { select: { alunos: true } }
      },
      orderBy: { nome: "asc" }
    });
    return res.json(lista);
  } catch {
    return res.json(unidades);
  }
}));

routes.post("/unidades", autorizar("ADMIN", "DIRETOR"), asyncHandler(async (req, res) => {
  const schema = z.object({
    nome: z.string().min(2),
    professorId: z.string().min(1)
  });
  const dados = schema.parse(req.body);

  const professor = await prisma.usuario.findFirst({
    where: {
      id: dados.professorId,
      papel: "PROFESSOR",
      igrejaId: req.usuario.igrejaId
    }
  });

  if (!professor) {
    throw new AppError("Professor responsavel nao encontrado nesta igreja", 404);
  }

  const unidade = await prisma.unidadeAcao.create({
    data: {
      nome: dados.nome,
      igrejaId: req.usuario.igrejaId,
      professorId: professor.id,
      diretorId: req.usuario.id
    },
    include: {
      igreja: true,
      professor: { select: { id: true, nome: true, email: true } },
      diretor: { select: { id: true, nome: true, email: true } },
      _count: { select: { alunos: true } }
    }
  });

  res.status(201).json(unidade);
}));

routes.patch("/unidades/:id", autorizar("ADMIN", "DIRETOR"), asyncHandler(async (req, res) => {
  const schema = z.object({
    nome: z.string().min(2).optional(),
    professorId: z.string().optional(),
    ativa: z.boolean().optional()
  });
  const dados = schema.parse(req.body);

  const unidade = await prisma.unidadeAcao.findFirst({
    where: { id: req.params.id, igrejaId: req.usuario.igrejaId }
  });
  if (!unidade) throw new AppError("Unidade de Acao nao encontrada", 404);

  if (dados.professorId) {
    const professor = await prisma.usuario.findFirst({
      where: { id: dados.professorId, papel: "PROFESSOR", igrejaId: req.usuario.igrejaId }
    });
    if (!professor) throw new AppError("Professor responsavel nao encontrado nesta igreja", 404);
  }

  const atualizada = await prisma.unidadeAcao.update({
    where: { id: unidade.id },
    data: dados,
    include: {
      igreja: true,
      professor: { select: { id: true, nome: true, email: true } },
      diretor: { select: { id: true, nome: true, email: true } },
      _count: { select: { alunos: true } }
    }
  });

  res.json(atualizada);
}));

routes.get("/alunos", asyncHandler(async (req, res) => {
  try {
    const where = {};
    if (req.usuario.papel === "ALUNO") {
      where.usuarioId = req.usuario.id;
    } else if (req.query.unidadeId) {
      where.unidadeId = req.query.unidadeId;
    }

    const lista = await prisma.aluno.findMany({
      where,
      include: { unidade: true },
      orderBy: { nome: "asc" }
    });
    return res.json(lista);
  } catch {
    return res.json(alunos);
  }
}));

routes.post("/alunos", autorizar("ADMIN", "DIRETOR", "PROFESSOR"), uploadFotoAluno.single("foto"), asyncHandler(async (req, res) => {
  const schema = z.object({
    nome: z.string().min(2),
    sexo: z.enum(["MASCULINO", "FEMININO"]).optional().default("MASCULINO"),
    unidadeId: z.string().min(1),
    whatsapp: z.string().optional().nullable().default(""),
    dataNascimento: z.string().optional().nullable(),
    dataBatismo: z.string().optional().nullable(),
    endereco: z.string().optional().nullable(),
    email: z.string().email().optional().or(z.literal(""))
  });
  const dados = schema.parse(req.body);

  const unidade = await prisma.unidadeAcao.findFirst({
    where: {
      id: dados.unidadeId,
      igrejaId: req.usuario.igrejaId,
      ...(req.usuario.papel === "PROFESSOR" ? { professorId: req.usuario.id } : {})
    }
  });

  if (!unidade) throw new AppError("Unidade nao encontrada", 404);

  let fotoUrl = fotoPadraoPorSexo(dados.sexo);
  let fotoPublicId = null;

  if (req.file) {
    if (!valorCloudinaryPreenchido(process.env.CLOUDINARY_URL)) {
      throw new AppError("Configure a CLOUDINARY_URL no backend antes de enviar fotos", 500);
    }

    const publicId = `${unidade.id}-${Date.now()}`;
    const resultado = await enviarFotoAluno(req.file.buffer, publicId);
    fotoUrl = resultado.secure_url;
    fotoPublicId = resultado.public_id;
  }

  const aluno = await prisma.aluno.create({
    data: {
      nome: dados.nome,
      sexo: dados.sexo,
      whatsapp: dados.whatsapp || "",
      dataNascimento: dados.dataNascimento ? new Date(dados.dataNascimento) : null,
      dataBatismo: dados.dataBatismo ? new Date(dados.dataBatismo) : null,
      endereco: dados.endereco || null,
      email: dados.email || null,
      fotoUrl,
      fotoPublicId,
      unidadeId: unidade.id
    },
    include: { unidade: true }
  });
  res.status(201).json(aluno);
}));

routes.put("/alunos/:id", autorizar("ADMIN", "DIRETOR", "PROFESSOR"), uploadFotoAluno.single("foto"), asyncHandler(async (req, res) => {
  const schema = z.object({
    nome: z.string().min(2),
    sexo: z.enum(["MASCULINO", "FEMININO"]).optional(),
    unidadeId: z.string().min(1),
    whatsapp: z.string().optional().nullable(),
    dataNascimento: z.string().optional().nullable(),
    dataBatismo: z.string().optional().nullable(),
    endereco: z.string().optional().nullable(),
    email: z.string().email().optional().or(z.literal(""))
  });
  const dados = schema.parse(req.body);

  const alunoExistente = await prisma.aluno.findFirst({
    where: {
      id: req.params.id,
      unidade: {
        igrejaId: req.usuario.igrejaId,
        ...(req.usuario.papel === "PROFESSOR" ? { professorId: req.usuario.id } : {})
      }
    }
  });

  if (!alunoExistente) throw new AppError("Aluno nao encontrado ou sem permissao", 404);

  let fotoUrl = alunoExistente.fotoUrl;
  let fotoPublicId = alunoExistente.fotoPublicId;

  if (req.file) {
    if (!valorCloudinaryPreenchido(process.env.CLOUDINARY_URL)) {
      throw new AppError("Configure a CLOUDINARY_URL no backend antes de enviar fotos", 500);
    }
    const publicId = `${dados.unidadeId}-${Date.now()}`;
    const resultado = await enviarFotoAluno(req.file.buffer, publicId);
    fotoUrl = resultado.secure_url;
    fotoPublicId = resultado.public_id;
  }

  const alunoAtualizado = await prisma.aluno.update({
    where: { id: req.params.id },
    data: {
      nome: dados.nome,
      sexo: dados.sexo || alunoExistente.sexo,
      whatsapp: dados.whatsapp ?? alunoExistente.whatsapp,
      dataNascimento: dados.dataNascimento === undefined ? alunoExistente.dataNascimento : (dados.dataNascimento ? new Date(dados.dataNascimento) : null),
      dataBatismo: dados.dataBatismo === undefined ? alunoExistente.dataBatismo : (dados.dataBatismo ? new Date(dados.dataBatismo) : null),
      endereco: dados.endereco === undefined ? alunoExistente.endereco : (dados.endereco || null),
      email: dados.email === undefined ? alunoExistente.email : (dados.email || null),
      fotoUrl,
      fotoPublicId,
      unidadeId: dados.unidadeId
    },
    include: { unidade: true }
  });
  res.json(alunoAtualizado);
}));

module.exports = routes;
