const app = require("./app");

const port = process.env.PORT || 3001;

if (process.argv.includes("--check")) {
  console.log("backend ok");
  process.exit(0);
}

app.listen(port, () => {
  console.log(`Professor Nota 10 API em http://localhost:${port}`);
});
