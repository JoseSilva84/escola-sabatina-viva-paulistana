function errorHandler(error, req, res, next) {
  if (error.name === "ZodError") {
    return res.status(422).json({
      message: "Dados inválidos",
      issues: error.errors
    });
  }

  const statusCode = error.statusCode || 500;
  return res.status(statusCode).json({
    message: error.message || "Erro interno"
  });
}

module.exports = { errorHandler };
