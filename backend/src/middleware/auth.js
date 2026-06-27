const jwt = require("jsonwebtoken");
const { usuarios } = require("../data/store");
const AppError = require("../utils/AppError");

function usuarioDemo(token) {
  const id = token?.startsWith("demo-") ? token.replace("demo-", "") : null;
  const usuario = usuarios.find((item) => item.id === id);
  if (!usuario) return null;

  return {
    id: usuario.id,
    nome: usuario.nome,
    email: usuario.email,
    papel: usuario.papel,
    igrejaId: usuario.igrejaId,
    unidadeId: usuario.unidadeId,
    alunoId: usuario.alunoId
  };
}

function autenticar(req, res, next) {
  const auth = req.headers.authorization || "";
  const [, token] = auth.split(" ");

  if (!token) {
    throw new AppError("Token nao informado", 401);
  }

  try {
    req.usuario = jwt.verify(token, process.env.JWT_SECRET || "dev-secret");
    return next();
  } catch (error) {
    const demo = usuarioDemo(token);
    if (demo) {
      req.usuario = demo;
      return next();
    }
    throw new AppError("Sessao invalida", 401);
  }
}

function autorizar(...papeis) {
  return (req, res, next) => {
    if (!req.usuario || !papeis.includes(req.usuario.papel)) {
      throw new AppError("Acesso nao autorizado", 403);
    }
    return next();
  };
}

module.exports = { autenticar, autorizar };
