const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
require("dotenv").config();
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

function lerLinhaCsv(linha) {
  return [...linha.matchAll(/"((?:""|[^"])*)"/g)]
    .map((item) => item[1].replace(/""/g, "\""));
}

function chaveIgreja(distrito, igreja) {
  return `${distrito}\u0000${igreja}`;
}

function carregarAcessosCsv() {
  const porIgreja = new Map();
  const porLogin = new Map();
  let admin = { login: "admin", email: "admin@nota10.com", senha: "Adm#Sabatina@2026-K9qT!7" };

  if (!fs.existsSync(arquivoSaida)) return { porIgreja, porLogin, admin };

  const linhas = fs.readFileSync(arquivoSaida, "utf8")
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .filter(Boolean);
  if (linhas.length < 2) return { porIgreja, porLogin, admin };

  for (const campos of linhas.slice(1).map(lerLinhaCsv)) {
    const [distrito, igreja, login, senha] = campos;
    if (!distrito || !igreja || !login || !senha) continue;
    if (distrito === "ADMIN") {
      admin = { login, email: "admin@nota10.com", senha };
      continue;
    }
    porIgreja.set(chaveIgreja(distrito, igreja), { login, senha });
    porLogin.set(login.toLowerCase(), { distrito, igreja, login, senha });
  }

  return { porIgreja, porLogin, admin };
}

function acessoInicialDiretor(acessosCsv, distrito, igreja) {
  return acessosCsv.porIgreja.get(chaveIgreja(distrito, igreja)) || null;
}

async function garantirAdmin(acessosCsv) {
  const distrito = await prisma.distrito.upsert({
    where: { nome: "ADMINISTRACAO" },
    update: {},
    create: { id: idEstavel("distrito", "ADMINISTRACAO"), nome: "ADMINISTRACAO" }
  });

  const igreja = await prisma.igreja.upsert({
    where: {
      distritoId_nome: {
        distritoId: distrito.id,
        nome: "Escola Sabatina Viva"
      }
    },
    update: {},
    create: {
      id: idEstavel("igreja", distrito.nome, "Escola Sabatina Viva"),
      nome: "Escola Sabatina Viva",
      distritoId: distrito.id
    }
  });

  const adminExistente = await prisma.usuario.findFirst({
    where: {
      OR: [
        { email: acessosCsv.admin.email },
        { codigoAcesso: { equals: acessosCsv.admin.login, mode: "insensitive" } }
      ],
      papel: "ADMIN"
    },
    select: { id: true }
  });

  if (adminExistente) {
    if (process.env.RESET_ADMIN_PASSWORD === "true") {
      await prisma.usuario.update({
        where: { id: adminExistente.id },
        data: {
          codigoAcesso: acessosCsv.admin.login,
          senhaHash: await bcrypt.hash(acessosCsv.admin.senha, 12),
          senhaTemporaria: acessosCsv.admin.senha,
          deveTrocarSenha: true,
          ativo: true
        }
      });
      console.log("Senha do admin redefinida a partir do CSV.");
    }
    return false;
  }

  await prisma.usuario.create({
    data: {
      nome: "Administrador Nota 10",
      email: acessosCsv.admin.email,
      codigoAcesso: acessosCsv.admin.login,
      senhaHash: await bcrypt.hash(acessosCsv.admin.senha, 12),
      senhaTemporaria: acessosCsv.admin.senha,
      papel: "ADMIN",
      igrejaId: igreja.id,
      distritoId: distrito.id,
      ativo: true,
      deveTrocarSenha: true
    }
  });

  return true;
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

async function executar() {
  const acessosCsv = carregarAcessosCsv();
  const adminCriado = await garantirAdmin(acessosCsv);

  if (!fs.existsSync(arquivoFonte)) {
    console.warn(`Arquivo de distritos e igrejas nao encontrado: ${arquivoFonte}`);
    console.warn("Geracao de acessos ignorada. O backend continuara iniciando normalmente.");
    console.log(adminCriado ? "Conta admin criada." : "Conta admin preservada.");
    return;
  }

  const distritos = lerDistritos(fs.readFileSync(arquivoFonte, "utf8"));
  if (!distritos.length) {
    throw new Error("Nenhum distrito com igrejas foi encontrado no arquivo.");
  }

  const acessosCriados = [];
  const loginsPorIgreja = gerarLoginsPorIgreja(distritos);
  const normalizarLogins = process.env.NORMALIZAR_LOGINS_EXISTENTES === "true";
  const resetarSenhasDiretores = process.env.RESET_DIRETOR_PASSWORDS === "true";
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
      const acessoInicial = acessoInicialDiretor(acessosCsv, distrito.nome, igreja.nome);
      const codigoAcesso = acessoInicial?.login
        || loginsPorIgreja.get(chaveIgreja(distrito.nome, igreja.nome))
        || gerarLoginIgreja(igreja.nome);
      const senhaExistente = acessoInicial?.senha || null;

      const diretorExistente = await prisma.usuario.findFirst({
        where: { igrejaId: igreja.id, papel: "DIRETOR" },
        select: { id: true, codigoAcesso: true, senhaTemporaria: true }
      });
      if (diretorExistente) {
        if (resetarSenhasDiretores && acessoInicial) {
          await prisma.usuario.update({
            where: { id: diretorExistente.id },
            data: {
              codigoAcesso,
              senhaHash: await bcrypt.hash(acessoInicial.senha, 12),
              senhaTemporaria: acessoInicial.senha,
              deveTrocarSenha: true,
              ativo: true
            }
          });
        } else if (normalizarLogins && acessoInicial && diretorExistente.codigoAcesso !== codigoAcesso) {
          await prisma.usuario.update({
            where: { id: diretorExistente.id },
            data: { codigoAcesso }
          });
        }
        continue;
      }

      const senha = senhaExistente || gerarSenha();
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
    }
  }

  console.log(`${distritos.length} distritos e ${totalIgrejas} igrejas processados.`);
  console.log(adminCriado ? "Conta admin criada." : "Conta admin preservada.");
  console.log(`${acessosCriados.length} contas de diretor criadas.`);
  if (acessosCriados.length) {
    console.log("Novas contas foram criadas usando os acessos do CSV.");
  } else {
    console.log("Nenhum login ou senha existente foi alterado.");
  }
  if (normalizarLogins) {
    console.log("Normalizacao de logins existentes ativada por NORMALIZAR_LOGINS_EXISTENTES=true.");
  }
  if (resetarSenhasDiretores) {
    console.log("Reset de senhas dos diretores ativado por RESET_DIRETOR_PASSWORDS=true.");
  }
  if (fs.existsSync(arquivoSaida)) {
    console.log(`Arquivo de entrega preservado em: ${arquivoSaida}`);
  }
}

executar()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
