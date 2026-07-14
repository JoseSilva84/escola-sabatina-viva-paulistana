const fs = require("fs");
const path = require("path");

let cache = null;

function normalizar(valor) {
  return String(valor || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function arquivoFonte() {
  const candidatos = [
    path.resolve(__dirname, "../../regiaoDistritoIgreja.md"),
    path.resolve(__dirname, "../../../regiaoDistritoIgreja.md")
  ];
  return candidatos.find((arquivo) => fs.existsSync(arquivo));
}

function carregarMapa() {
  if (cache) return cache;
  cache = new Map();

  const arquivo = arquivoFonte();
  if (!arquivo) return cache;

  const linhas = fs.readFileSync(arquivo, "utf8").split(/\r?\n/);
  let regiaoAtual = "";

  linhas.forEach((linha) => {
    const regiao = linha.match(/^##\s+(.+?)\s*$/);
    if (regiao) {
      regiaoAtual = regiao[1].trim();
      return;
    }

    const distrito = linha.match(/^\*\*(.+?)\*\*\s*$/);
    if (distrito && regiaoAtual) {
      cache.set(normalizar(distrito[1]), regiaoAtual);
    }
  });

  return cache;
}

function regiaoPorDistrito(nomeDistrito) {
  return carregarMapa().get(normalizar(nomeDistrito)) || "Regiao geral";
}

module.exports = { regiaoPorDistrito };
