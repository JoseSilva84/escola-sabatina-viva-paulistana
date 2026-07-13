const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const prisma = require("../utils/prisma");

const arquivoFonteBackend = path.resolve(__dirname, "../../regiaoDistritoIgreja.md");
const arquivoFonteRaiz = path.resolve(__dirname, "../../../regiaoDistritoIgreja.md");
const arquivoFonte = fs.existsSync(arquivoFonteBackend) ? arquivoFonteBackend : arquivoFonteRaiz;
const arquivoSaida = path.resolve(__dirname, "../../acessos-diretores.csv");

function corrigirMojibake(texto) {
  if (!/[ÃÂâ]/.test(texto)) return texto;
  try {
    const corrigido = Buffer.from(texto, "latin1").toString("utf8");
    return corrigido.includes("\uFFFD") ? texto : corrigido;
  } catch {
    return texto;
  }
}

function slug(texto) {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function idEstavel(prefixo, ...partes) {
  const chave = partes.join("|").normalize("NFKC").toLowerCase();
  const hash = crypto.createHash("sha256").update(chave).digest("hex").slice(0, 10);
  return `${prefixo}-${slug(partes.at(-1)).slice(0, 45)}-${hash}`;
}

function lerDistritos(conteudo) {
  const distritos = [];
  let atual = null;

  for (const linhaOriginal of corrigirMojibake(conteudo).split(/\r?\n/)) {
    const linha = linhaOriginal.trim();
    const tituloDistrito = linha.match(/^\*\*(.+)\*\*$/);
    const igreja = linha.match(/^-\s+(.+)$/);

    if (tituloDistrito) {
      atual = { nome: tituloDistrito[1].trim(), igrejas: [] };
      distritos.push(atual);
    } else if (igreja && atual) {
      atual.igrejas.push(igreja[1].trim());
    }
  }

  return distritos.filter((distrito) => distrito.igrejas.length > 0);
}

function gerarSenha() {
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
  return caracteres
    .map((valor) => ({ valor, ordem: crypto.randomInt(1_000_000) }))
    .sort((a, b) => a.ordem - b.ordem)
    .map((item) => item.valor)
    .join("");
}

function gerarLoginIgreja(igreja, ordemDuplicada = 1) {
  const base = slug(igreja) || "igreja";
  return ordemDuplicada > 1 ? `${base}-${ordemDuplicada}` : base;
}

function csv(valor) {
  return `"${String(valor).replace(/"/g, "\"\"")}"`;
}

function lerLinhaCsv(linha) {
  return [...linha.matchAll(/"((?:""|[^"])*)"/g)]
    .map((item) => item[1].replace(/""/g, "\""));
}

function chaveIgreja(distrito, igreja) {
  return `${distrito}\u0000${igreja}`;
}

function carregarSenhasExistentes() {
  const porIgreja = new Map();
  const porLogin = new Map();
  if (!fs.existsSync(arquivoSaida)) return { porIgreja, porLogin };

  const linhas = fs.readFileSync(arquivoSaida, "utf8")
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .filter(Boolean);
  if (linhas.length < 2) return { porIgreja, porLogin };

  for (const campos of linhas.slice(1).map(lerLinhaCsv)) {
    const [distrito, igreja, login, senha] = campos;
    if (!distrito || !igreja || !senha) continue;
    porIgreja.set(chaveIgreja(distrito, igreja), senha);
    if (login) porLogin.set(login.toLowerCase(), senha);
  }

  return { porIgreja, porLogin };
}

function gerarLoginsPorIgreja(distritos) {
  const totaisPorNome = new Map();
  for (const distrito of distritos) {
    for (const igreja of distrito.igrejas) {
      const chaveNome = slug(igreja) || "igreja";
      totaisPorNome.set(chaveNome, (totaisPorNome.get(chaveNome) || 0) + 1);
    }
  }

  const ocorrenciasPorNome = new Map();
  const logins = new Map();
  for (const distrito of distritos) {
    for (const igreja of distrito.igrejas) {
      const chaveNome = slug(igreja) || "igreja";
      const repetida = totaisPorNome.get(chaveNome) > 1;
      const ocorrencia = (ocorrenciasPorNome.get(chaveNome) || 0) + 1;
      ocorrenciasPorNome.set(chaveNome, ocorrencia);
      logins.set(
        chaveIgreja(distrito.nome, igreja),
        gerarLoginIgreja(igreja, repetida ? ocorrencia : 1)
      );
    }
  }

  return logins;
}

function atualizarCsvExistente(loginsPorIgreja) {
  if (!fs.existsSync(arquivoSaida)) return;
  const linhas = fs.readFileSync(arquivoSaida, "utf8")
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .filter(Boolean);
  if (linhas.length < 2) return;

  const registros = linhas.slice(1).map(lerLinhaCsv);
  const atualizadas = [
    ["distrito", "igreja", "login", "senha_temporaria"].map(csv).join(","),
    ...registros.map((campos) => {
      const [distrito, igreja] = campos;
      const senha = campos.length >= 4 ? campos[3] : campos[2];
      const login = loginsPorIgreja.get(chaveIgreja(distrito, igreja))
        || gerarLoginIgreja(igreja);
      return [distrito, igreja, login, senha].map(csv).join(",");
    })
  ];
  fs.writeFileSync(arquivoSaida, `\uFEFF${atualizadas.join("\n")}\n`, "utf8");
}

async function executar() {
  if (!fs.existsSync(arquivoFonte)) {
    throw new Error(`Arquivo não encontrado: ${arquivoFonte}`);
  }

  const distritos = lerDistritos(fs.readFileSync(arquivoFonte, "utf8"));
  if (!distritos.length) {
    throw new Error("Nenhum distrito com igrejas foi encontrado no arquivo.");
  }

  const senhasExistentes = carregarSenhasExistentes();
  const acessosCriados = [];
  const acessosProcessados = [];
  const loginsPorIgreja = gerarLoginsPorIgreja(distritos);
  let totalIgrejas = 0;

  for (const itemDistrito of distritos) {
    const distritoId = idEstavel("distrito", itemDistrito.nome);
    const distrito = await prisma.distrito.upsert({
      where: { nome: itemDistrito.nome },
      update: {},
      create: { id: distritoId, nome: itemDistrito.nome }
    });

    for (const nomeIgreja of itemDistrito.igrejas) {
      totalIgrejas += 1;
      const igrejaId = idEstavel("igreja", itemDistrito.nome, nomeIgreja);
      const igreja = await prisma.igreja.upsert({
        where: {
          distritoId_nome: {
            distritoId: distrito.id,
            nome: nomeIgreja
          }
        },
        update: {},
        create: {
          id: igrejaId,
          nome: nomeIgreja,
          distritoId: distrito.id
        }
      });
      const codigoAcesso = loginsPorIgreja.get(chaveIgreja(distrito.nome, igreja.nome))
        || gerarLoginIgreja(igreja.nome);
      const senhaExistente = senhasExistentes.porIgreja.get(chaveIgreja(distrito.nome, igreja.nome))
        || senhasExistentes.porLogin.get(codigoAcesso.toLowerCase())
        || null;

      const diretorExistente = await prisma.usuario.findFirst({
        where: { igrejaId: igreja.id, papel: "DIRETOR" },
        select: { id: true, codigoAcesso: true, senhaTemporaria: true }
      });
      if (diretorExistente) {
        const dadosAtualizacao = {};
        if (diretorExistente.codigoAcesso !== codigoAcesso) {
          dadosAtualizacao.codigoAcesso = codigoAcesso;
        }
        if (!diretorExistente.senhaTemporaria && senhaExistente) {
          dadosAtualizacao.senhaTemporaria = senhaExistente;
        }
        if (Object.keys(dadosAtualizacao).length) {
          await prisma.usuario.update({
            where: { id: diretorExistente.id },
            data: dadosAtualizacao
          });
        }
        acessosProcessados.push({
          distrito: distrito.nome,
          igreja: igreja.nome,
          login: codigoAcesso,
          senha: diretorExistente.senhaTemporaria || senhaExistente || ""
        });
        continue;
      }

      const senha = gerarSenha();
      await prisma.usuario.create({
        data: {
          nome: "Diretor da Escola Sabatina",
          email: `diretor+${igreja.id}@acesso.nota10.local`,
          codigoAcesso,
          senhaHash: await bcrypt.hash(senha, 12),
          senhaTemporaria: senha,
          papel: "DIRETOR",
          igrejaId: igreja.id,
          distritoId: distrito.id,
          ativo: true,
          deveTrocarSenha: true
        }
      });
      acessosCriados.push({
        distrito: distrito.nome,
        igreja: igreja.nome,
        login: codigoAcesso,
        senha
      });
      acessosProcessados.push({
        distrito: distrito.nome,
        igreja: igreja.nome,
        login: codigoAcesso,
        senha
      });
    }
  }

  console.log(`${distritos.length} distritos e ${totalIgrejas} igrejas processados.`);
  console.log(`${acessosCriados.length} contas de diretor criadas.`);
  if (acessosProcessados.length) {
    const linhas = [
      ["distrito", "igreja", "login", "senha_temporaria"].map(csv).join(","),
      ...acessosProcessados.map((item) => (
        [item.distrito, item.igreja, item.login, item.senha].map(csv).join(",")
      ))
    ];
    fs.writeFileSync(arquivoSaida, `\uFEFF${linhas.join("\n")}\n`, "utf8");
    console.log(`Acessos salvos no banco e exportados em: ${arquivoSaida}`);
  } else {
    console.log("Nenhuma senha foi alterada; o processo é seguro para reexecução.");
    if (fs.existsSync(arquivoSaida)) {
      console.log("O CSV existente foi preservado.");
    }
  }
  atualizarCsvExistente(loginsPorIgreja);
}

executar()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
