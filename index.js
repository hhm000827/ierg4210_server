const express = require("express");
var cors = require("cors");
require("dotenv").config({ path: __dirname + "/config.env" });

const app = express();
app.use(cors());
app.use("/images", express.static("image"));

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.listen(process.env.SERVER_PORT);
