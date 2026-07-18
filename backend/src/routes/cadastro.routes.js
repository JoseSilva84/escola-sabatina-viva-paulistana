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
const { regiaoPorDistrito } = require("../utils/regioes");

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
    const lista = await prisma.igreja.findMany({
      where,
      include: { distrito: true, _count: { select: { usuarios: true, unidades: true } } },
      orderBy: { nome: "asc" }
    });
    return res.json(lista);
  } catch {
    return res.json(igrejas);
  }
}));

routes.patch("/igrejas/:id", autorizar("ADMIN", "DIRETOR"), asyncHandler(async (req, res) => {
  const dados = z.object({
    nome: z.string().trim().min(2)
  }).parse(req.body);

  const igreja = await prisma.igreja.findFirst({
    where: {
      id: req.params.id,
      ...(req.usuario.papel === "ADMIN" ? {} : { id: req.usuario.igrejaId })
    }
  });
  if (!igreja) throw new AppError("Igreja nao encontrada ou sem permissao", 404);

  const atualizada = await prisma.igreja.update({
    where: { id: igreja.id },
    data: { nome: dados.nome },
    include: { distrito: true, _count: { select: { usuarios: true, unidades: true } } }
  });

  res.json(atualizada);
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

function localizacaoConta(usuario) {
  const igreja = usuario.igreja || usuario.aluno?.unidade?.igreja || null;
  const distrito = igreja?.distrito || null;
  return {
    igrejaId: igreja?.id || usuario.igrejaId || null,
    igrejaNome: igreja?.nome || "Igreja nao informada",
    distritoId: distrito?.id || usuario.distritoId || null,
    distritoNome: distrito?.nome || "Distrito nao informado",
    regiao: regiaoPorDistrito(distrito?.nome)
  };
}

function contaPublica(usuario) {
  return {
    id: usuario.id,
    nome: usuario.nome,
    email: usuario.email,
    codigoAcesso: usuario.codigoAcesso,
    papel: usuario.papel,
    ativo: usuario.ativo,
    deveTrocarSenha: usuario.deveTrocarSenha,
    criadoEm: usuario.criadoEm,
    alunoId: usuario.aluno?.id || null,
    unidadeNome: usuario.aluno?.unidade?.nome || null,
    unidadesProfessor: usuario._count?.unidadesProfessor || 0,
    ...localizacaoConta(usuario)
  };
}

const includeLocalizacaoUsuario = {
  igreja: { include: { distrito: true } },
  aluno: {
    include: {
      unidade: {
        include: {
          igreja: { include: { distrito: true } }
        }
      }
    }
  },
  _count: { select: { unidadesProfessor: true } }
};

routes.get("/professores/todos", autorizar("ADMIN"), asyncHandler(async (_req, res) => {
  const lista = await prisma.usuario.findMany({
    where: { papel: "PROFESSOR" },
    include: includeLocalizacaoUsuario,
    orderBy: [{ igreja: { nome: "asc" } }, { nome: "asc" }]
  });
  res.json(lista.map(contaPublica));
}));

routes.get("/usuarios-contas", autorizar("ADMIN"), asyncHandler(async (_req, res) => {
  const lista = await prisma.usuario.findMany({
    where: { papel: { in: ["DIRETOR", "PROFESSOR", "ALUNO"] } },
    include: includeLocalizacaoUsuario,
    orderBy: [{ papel: "asc" }, { nome: "asc" }]
  });
  res.json(lista.map(contaPublica));
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
    return res.json(lista.map((aluno) => ({
      ...aluno,
      unidade: aluno.unidade
        ? {
            ...aluno.unidade,
            igreja: aluno.unidade.igreja
              ? {
                  ...aluno.unidade.igreja,
                  distrito: aluno.unidade.igreja.distrito
                    ? {
                        ...aluno.unidade.igreja.distrito,
                        regiao: regiaoPorDistrito(aluno.unidade.igreja.distrito.nome)
                      }
                    : aluno.unidade.igreja.distrito
                }
              : aluno.unidade.igreja
          }
        : aluno.unidade
    })));
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
    } else if (req.usuario.papel === "PROFESSOR") {
      where.unidade = { professorId: req.usuario.id };
    } else if (req.usuario.papel === "DIRETOR") {
      where.unidade = { igrejaId: req.usuario.igrejaId };
    } else if (req.query.unidadeId) {
      where.unidadeId = req.query.unidadeId;
    }

    const lista = await prisma.aluno.findMany({
      where,
      include: {
        unidade: {
          include: {
            igreja: { include: { distrito: true } },
            professor: { select: { id: true, nome: true, email: true } }
          }
        },
        usuario: {
          select: {
            id: true,
            codigoAcesso: true,
            email: true,
            ativo: true,
            senhaTemporaria: true,
            deveTrocarSenha: true
          }
        }
      },
      orderBy: { nome: "asc" }
    });
    const listaComRegiao = lista.map((aluno) => ({
      ...aluno,
      unidade: aluno.unidade
        ? {
            ...aluno.unidade,
            igreja: aluno.unidade.igreja
              ? {
                  ...aluno.unidade.igreja,
                  distrito: aluno.unidade.igreja.distrito
                    ? {
                        ...aluno.unidade.igreja.distrito,
                        regiao: regiaoPorDistrito(aluno.unidade.igreja.distrito.nome)
                      }
                    : aluno.unidade.igreja.distrito
                }
              : aluno.unidade.igreja
          }
        : aluno.unidade
    }));
    return res.json(listaComRegiao);
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
  } else if (dados.sexo && dados.sexo !== alunoExistente.sexo && !alunoExistente.fotoPublicId) {
    fotoUrl = fotoPadraoPorSexo(dados.sexo);
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

routes.post("/alunos/:id/acesso", autorizar("ADMIN", "DIRETOR", "PROFESSOR"), asyncHandler(async (req, res) => {
  const dados = z.object({
    codigoAcesso: z.string().trim().min(3),
    senha: z.string().min(6),
    ativo: z.boolean().optional().default(true)
  }).parse(req.body);

  const aluno = await prisma.aluno.findFirst({
    where: {
      id: req.params.id,
      unidade: {
        igrejaId: req.usuario.igrejaId,
        ...(req.usuario.papel === "PROFESSOR" ? { professorId: req.usuario.id } : {})
      }
    },
    include: { unidade: true, usuario: true }
  });

  if (!aluno) throw new AppError("Aluno nao encontrado ou sem permissao", 404);

  const codigoEmUso = await prisma.usuario.findFirst({
    where: {
      codigoAcesso: { equals: dados.codigoAcesso, mode: "insensitive" },
      ...(aluno.usuarioId ? { id: { not: aluno.usuarioId } } : {})
    },
    select: { id: true }
  });
  if (codigoEmUso) throw new AppError("Este login ja esta em uso", 409);

  const senhaHash = await bcrypt.hash(dados.senha, 12);
  const emailAcesso = `aluno.${aluno.id}@aluno.nota10.local`;

  let usuario;
  if (aluno.usuarioId) {
    usuario = await prisma.usuario.update({
      where: { id: aluno.usuarioId },
      data: {
        nome: aluno.nome,
        codigoAcesso: dados.codigoAcesso,
        senhaHash,
        senhaTemporaria: dados.senha,
        deveTrocarSenha: true,
        ativo: dados.ativo,
        fotoUrl: aluno.fotoUrl || aluno.usuario?.fotoUrl || null,
        sexoPerfil: aluno.sexo
      },
      select: { id: true, codigoAcesso: true, email: true, ativo: true, senhaTemporaria: true, deveTrocarSenha: true }
    });
  } else {
    usuario = await prisma.usuario.create({
      data: {
        nome: aluno.nome,
        email: emailAcesso,
        codigoAcesso: dados.codigoAcesso,
        whatsapp: aluno.whatsapp || null,
        fotoUrl: aluno.fotoUrl || null,
        sexoPerfil: aluno.sexo,
        senhaHash,
        senhaTemporaria: dados.senha,
        papel: "ALUNO",
        igrejaId: aluno.unidade.igrejaId,
        distritoId: req.usuario.distritoId || null,
        ativo: dados.ativo,
        deveTrocarSenha: true,
        aluno: { connect: { id: aluno.id } }
      },
      select: { id: true, codigoAcesso: true, email: true, ativo: true, senhaTemporaria: true, deveTrocarSenha: true }
    });
  }

  res.json({ usuario });
}));

module.exports = routes;
