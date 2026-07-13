const app = require("./app");
const { spawn } = require("child_process");
const path = require("path");

const port = process.env.PORT || 3001;

if (process.argv.includes("--check")) {
  console.log("backend ok");
  process.exit(0);
}

function gerarAcessosEmSegundoPlano() {
  if (process.env.GERAR_ACESSOS_ON_START === "false") return;

  const script = path.resolve(__dirname, "scripts", "gerarAcessos.js");
  const processo = spawn(process.execPath, [script], {
    cwd: path.resolve(__dirname, ".."),
    env: process.env,
    stdio: "inherit"
  });

  processo.on("exit", (code) => {
    if (code === 0) {
      console.log("Acessos iniciais verificados no PostgreSQL.");
    } else {
      console.error(`Falha ao gerar acessos iniciais. Codigo: ${code}`);
    }
  });
}

app.listen(port, () => {
  console.log(`Professor Nota 10 API em http://localhost:${port}`);
  gerarAcessosEmSegundoPlano();
});
