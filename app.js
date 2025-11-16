const express = require("express");
const app = express();

app.use(express.json());

// your routes
const routes = require("./routes");
app.use("/", routes);

module.exports = app;
