const express = require("express");
var cors = require("cors");
require("dotenv").config({ path: __dirname + "/config.env" });
var mysql = require("mysql");
var bodyParser = require("body-parser");
var lang = require("lodash/lang");

const app = express();
app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

var pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
  database: process.env.DB_DATABASE,
});

pool.getConnection((err, connection) => {
  if (err) console.error(err);
  else {
    // serve the images in image folder to frontend
    app.use("/images", express.static("image"));

    app.get("/api/getAllCategory", (req, res) => {
      connection.query("SELECT * FROM CATEGORIES", (err, categories) => {
        err ? console.error(err) : res.send(categories);
      });
    });

    app.get("/api/getAllProduct", (req, res) => {
      connection.query("SELECT * FROM PRODUCTS", (err, products) => {
        err ? console.error(err) : res.send(products);
      });
    });

    app.get("/api/getFilteredProducts", (req, res) => {
      let cid = req.query.cid;
      let pid = req.query.pid;

      // use pid to filter
      if (!lang.isNil(cid) && lang.isNil(pid)) {
        const query = "SELECT * FROM PRODUCTS where cid = ?";
        connection.query(query, [cid], (err, products) => {
          err ? console.error(err) : res.send(products);
        });
      } else if (!lang.isNil(pid)) {
        // use cid to filter
        const query =
          "SELECT PRODUCTS.pid,PRODUCTS.cid,PRODUCTS.name,PRODUCTS.price,PRODUCTS.inventory,PRODUCTS.img,PRODUCTS.description, CATEGORIES.name AS cname from PRODUCTS JOIN CATEGORIES ON PRODUCTS.cid = CATEGORIES.cid and pid =?";
        connection.query(query, [pid], (err, product) => {
          err ? console.error(err) : res.send(product);
        });
      }
    });

    connection.release();
  }
});

// app.get("/", (req, res) => {
//   res.send("Hello World!");
// });

app.listen(process.env.SERVER_PORT);
