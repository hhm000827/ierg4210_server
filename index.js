const express = require("express");
var cors = require("cors");
var pool = require("./pool");
var bodyParser = require("body-parser");
var lang = require("lodash/lang");
require("dotenv").config({ path: __dirname + "/config.env" });
var string = require("lodash/string");

const app = express();
app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// serve the images in image folder to frontend
app.use("/images", express.static("image"));

const convertEscapeWord = (input) => {
  result = string.escape(input);
  return string.escapeRegExp(input);
};

app.get("/api/getAllProduct", (req, res) => {
  pool.query("SELECT * FROM PRODUCTS", (err, products) => {
    err ? console.error(err) : res.send(products);
  });
});

app.get("/api/getFilteredProducts", (req, res) => {
  let cid = req.query.cid;
  let pid = req.query.pid;

  // use pid to filter
  if (!lang.isNil(cid) && lang.isNil(pid)) {
    const query = "SELECT * FROM PRODUCTS where cid = ?";
    pool.query(query, [cid], (err, products) => {
      err ? console.error(err) : res.send(products);
    });
  } else if (!lang.isNil(pid)) {
    // use cid to filter
    const query =
      "SELECT PRODUCTS.pid,PRODUCTS.cid,PRODUCTS.name,PRODUCTS.price,PRODUCTS.inventory,PRODUCTS.img,PRODUCTS.description, CATEGORIES.name AS category from PRODUCTS JOIN CATEGORIES ON PRODUCTS.cid = CATEGORIES.cid and pid =?";
    pool.query(query, [pid], (err, product) => {
      err ? console.error(err) : res.send(product[0]);
    });
  }
});

//! Category API
app.get("/api/getAllCategory", (req, res) => {
  pool.query("SELECT * FROM CATEGORIES", (err, categories) => {
    err ? console.error(err) : res.send(categories);
  });
});

app.post("/api/createCategory", (req, res) => {
  let name = convertEscapeWord(req.body["name"]);
  let query = "SELECT * FROM CATEGORIES WHERE name=? LIMIT 1";

  // find if name is already existing first
  pool.query(query, [name], (err, result) => {
    err
      ? res.status(500).send("Cannot create category, please try again later")
      : lang.isNil(result) || lang.isEmpty(result)
      ? ((query = "INSERT INTO CATEGORIES (name) VALUES (?)"),
        pool.query(query, [name], (err, result) => {
          err ? res.status(500).send("Cannot create category, please try again later") : res.send("success to create new category");
        }))
      : res.status(400).send("This category already exists, please retype the category");
  });
});

app.put("/api/updateCategory", (req, res) => {
  let name = convertEscapeWord(req.body["name"]);
  let cid = req.body["cid"];
  let query = "SELECT * FROM CATEGORIES WHERE name=? LIMIT 1";

  // find if name is already existing first
  pool.query(query, [name], (err, result) => {
    err
      ? res.status(500).send("Cannot update category, please try again later")
      : lang.isNil(result) || lang.isEmpty(result)
      ? ((query = "UPDATE CATEGORIES SET name=? WHERE cid=?"),
        pool.query(query, [name, cid], (err, result) => {
          err ? res.status(500).send("Cannot update category, please try again later") : res.send("Success to update category");
        }))
      : res.status(400).send("This category already exists, please retype the category");
  });
});

app.delete("/api/deleteCategory", (req, res) => {
  let cid = req.body["cid"];
  let query = "SELECT * FROM CATEGORIES WHERE cid=?";

  pool.query(query, [cid], (err, result) => {
    err
      ? res.status(500).send("Cannot delete category, please try again later")
      : !lang.isNil(result) && !lang.isEmpty(result)
      ? ((query = "DELETE FROM CATEGORIES WHERE cid=?"),
        pool.query(query, [cid], (err, result) => {
          err ? res.status(500).send("Cannot delete category, please try again later") : res.send("Success to delete category");
        }))
      : res.status(404).send("Category doesn't exist");
  });
});

app.listen(process.env.SERVER_PORT);
