require("dotenv").config();

const express = require("express");
const cors = require("cors");
const routes = require("./routes");
const { errorHandler } = require("./middleware/errorHandler");

const app = express();

app.use(cors({ origin: process.env.CORS_ORIGIN || "*" }));
app.use(express.json());

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", name: "Professor Nota 10" });
});

app.use("/api", routes);
app.use(errorHandler);

module.exports = app;
