const fs = require("fs");
const path = require("path");

let cache = null;

function corrigirMojibake(texto) {
  if (!/[ÃƒÃ‚Ã¢]/.test(texto)) return texto;

  try {
    const corrigido = Buffer.from(texto, "latin1").toString("utf8");
    return corrigido.includes("\uFFFD") ? texto : corrigido;
  } catch {
    return texto;
  }
}

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
  cache = { distritos: new Map(), regioes: [] };

  const arquivo = arquivoFonte();
  if (!arquivo) return cache;

  const linhas = corrigirMojibake(fs.readFileSync(arquivo, "utf8")).split(/\r?\n/);
  let regiaoAtual = "";

  linhas.forEach((linha) => {
    const regiao = linha.match(/^##\s+(.+?)\s*$/);
    if (regiao) {
      regiaoAtual = regiao[1].trim();
      if (!cache.regioes.includes(regiaoAtual)) cache.regioes.push(regiaoAtual);
      return;
    }

    const distrito = linha.match(/^\*\*(.+?)\*\*\s*$/);
    if (distrito && regiaoAtual) {
      cache.distritos.set(normalizar(distrito[1]), regiaoAtual);
    }
  });

  return cache;
}

function regiaoPorDistrito(nomeDistrito) {
  return carregarMapa().distritos.get(normalizar(nomeDistrito)) || "Região geral";
}

function regioesConhecidas() {
  return carregarMapa().regioes;
}

module.exports = { regiaoPorDistrito, regioesConhecidas };
