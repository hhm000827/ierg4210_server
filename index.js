const express = require("express");
var cors = require("cors");
var pool = require("./pool");
var bodyParser = require("body-parser");
var lang = require("lodash/lang");
require("dotenv").config({ path: __dirname + "/config.env" });
var string = require("lodash/string");
var he = require("he");
const multer = require("multer");
const fs = require("fs");
const bycrpt = require("bcrypt");
const { createJwt, verifyIsAdmin } = require("./jwt");

const app = express();
app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// serve the images in image folder to frontend
app.use("/images", express.static("image"));

const convertEscapeWord = (input) => {
  result = string.escape(input);
  result = string.escapeRegExp(input);
  return he.encode(result);
};

//config of file upload
let storage = multer.diskStorage({
  destination: "./image/",
  filename: function (req, file, callback) {
    callback(null, convertEscapeWord(req.body["name"]) + "." + file.mimetype.split("/").pop());
  },
});

const upload = multer({
  limits: { fileSize: 5000000 },
  storage: storage,
  fileFilter(req, file, cb) {
    let result = verifyIsAdmin(req.headers["authorization"]);
    if (!lang.isEqual(result, true)) cb("no permission to upload", false);
    else if (file.size <= 0) cb("image is required", false);
    else if (!file.originalname.match(/\.(jpg|jpeg|gif|png)$/)) cb("Please upload an image", false);
    else cb(null, true);
  },
});

//! User API
// app.post("/api/createUser", (req, res) => {
//   let email = req.body.email;
//   let password = bycrpt.hashSync(req.body.password, 10);
//   let isAdmin = req.body.isAdmin;

//   let query = "SELECT * FROM USERS WHERE email=? LIMIT 1";
//   // find if name is already existing first
//   pool.query(query, [email], (err, result) => {
//     err
//       ? (console.error(err), res.status(500).send("Cannot create user, please try again later"))
//       : lang.isNil(result) || lang.isEmpty(result)
//       ? ((query = "INSERT INTO USERS  VALUES (NULL,?,?,?)"),
//         pool.query(query, [email, password, isAdmin], (err, result) => {
//           err ? (console.error(err), res.status(500).send("Cannot create user, please try again later")) : res.send("success to create new user");
//         }))
//       : res.status(400).send("This user already exists, please retype the email");
//   });
// });

app.post("/api/login", (req, res) => {
  let email = req.body.email;
  let password = req.body.password;
  let query = "SELECT * FROM USERS WHERE email=? LIMIT 1";

  pool.query(query, [email], (err, result) => {
    if (err) console.error(err), res.status(500).send("Cannot login, please try again later");
    else {
      if (lang.isNil(result) || lang.isEmpty(result)) res.status(400).send("This email doesn't exist, please retype the email");
      else {
        const hashPassword = result[0].password;
        const isValid = bycrpt.compareSync(password, hashPassword);
        if (isValid) {
          let data = { email: email, isAdmin: result[0].isAdmin, loginTime: new Date() };
          let token = createJwt(data);
          res.send({ token: "Bearer " + token, name: email.split("@")[0], message: "login success" });
        } else res.status(400).send("This password is incorrect");
      }
    }
  });
});

app.get("/api/verify", (req, res) => {
  let result = verifyIsAdmin(req.headers["authorization"]);
  res.send(result);
});

//! Product API
app.get("/api/getAllProduct", (req, res) => {
  pool.query("SELECT * FROM PRODUCTS", (err, products) => {
    err ? console.error(err) : res.send(products);
  });
});

app.get("/api/getAllProductNameAndPid", (req, res) => {
  pool.query("SELECT pid as value, name as label FROM PRODUCTS", (err, products) => {
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

app.post("/api/createProduct", upload.single("file"), (req, res) => {
  let isAdmin = verifyIsAdmin(req.headers["authorization"]);
  if (!lang.isEqual(isAdmin, true)) res.status(401).send("No permission");
  else {
    let { name, description, cid, price, inventory } = req.body;
    name = convertEscapeWord(name);
    description = convertEscapeWord(description);
    let file = req.file;
    let query = "SELECT * FROM PRODUCTS WHERE name=? LIMIT 1";

    // find if name is already existing first
    pool.query(query, [name], (err, result) => {
      err
        ? (console.error(err), res.status(500).send("Cannot create product, please try again later"))
        : lang.isNil(result) || lang.isEmpty(result)
        ? ((query = "INSERT INTO PRODUCTS  VALUES (?,?,?,?,?,?,?)"),
          pool.query(query, [null, cid, name, price, file.filename, inventory, description], (err, result) => {
            err ? (console.error(err), res.status(500).send("Cannot create product, please try again later")) : res.send("success to create new product");
          }))
        : res.status(400).send("This product already exists, please retype the product");
    });
  }
});

app.put("/api/updateProduct", upload.single("file"), (req, res) => {
  let isAdmin = verifyIsAdmin(req.headers["authorization"]);
  if (!lang.isEqual(isAdmin, true)) res.status(401).send("No permission");
  else {
    let { pid, name, description, cid, price, inventory, oldImg, oldName } = req.body;
    name = convertEscapeWord(name);
    description = convertEscapeWord(description);
    let query = "SELECT * FROM PRODUCTS WHERE name=? LIMIT 1";
    let file = req.file;

    // if name not change, then just amend others, no need see if name is existed or not
    if (lang.isEqual(name, oldName) && name && oldName) {
      query = `UPDATE PRODUCTS SET cid=?,price=?,inventory=?,description=?${!lang.isNil(file) ? ",img=?" : ""} WHERE pid=?`;
      pool.query(query, !lang.isNil(file) ? [cid, price, inventory, description, file.filename, pid] : [cid, price, inventory, description, pid], (err, result) => {
        err
          ? (console.error(err), res.status(500).send("Cannot update product, please try again later"))
          : !lang.isNil(file) && !lang.isEqual(oldImg, file.filename)
          ? (fs.unlink("./image/" + oldImg, (err) => (err ? console.error(err) : console.log("Delete File successfully."))), res.send("Success to update product"))
          : res.send("Success to update product");
      });
    }
    // if name is changed, then check if name is already existing first
    else {
      pool.query(query, [name], (err, result) => {
        err
          ? (console.error(err), res.status(500).send("Cannot update product, please try again later"))
          : lang.isNil(result) || lang.isEmpty(result)
          ? ((query = `UPDATE PRODUCTS SET name=?,cid=?,price=?,inventory=?,description=?${!lang.isNil(file) ? ",img=?" : ""} WHERE pid=?`),
            pool.query(query, !lang.isNil(file) ? [name, cid, price, inventory, description, file.filename, pid] : [name, cid, price, inventory, description, pid], (err, result) => {
              err
                ? (console.error(err), res.status(500).send("Cannot update product, please try again later"))
                : !lang.isNil(file) && !lang.isEqual(oldImg, file.filename)
                ? (fs.unlink("./image/" + oldImg, (err) => (err ? console.error(err) : console.log("Delete File successfully."))), res.send("Success to update product"))
                : res.send("Success to update product");
            }))
          : res.status(400).send("This product already exists, please retype the product");
      });
    }
  }
});

app.delete("/api/deleteProduct", (req, res) => {
  let isAdmin = verifyIsAdmin(req.headers["authorization"]);
  if (!lang.isEqual(isAdmin, true)) res.status(401).send("No permission");
  else {
    let { pid, img } = req.body;
    let query = "SELECT * FROM PRODUCTS WHERE pid=?";

    pool.query(query, [pid], (err, result) => {
      err
        ? (console.error(err), res.status(500).send("Cannot delete product, please try again later"))
        : !lang.isNil(result) && !lang.isEmpty(result)
        ? ((query = "DELETE FROM PRODUCTS WHERE pid=?"),
          pool.query(query, [pid], (err, result) => {
            err
              ? (console.error(err), res.status(500).send("Cannot delete product, please try again later"))
              : (fs.unlink("./image/" + img, (err) => (err ? console.error(err) : console.log("Delete File successfully."))), res.send("Success to delete product"));
          }))
        : res.status(404).send("Product doesn't exist");
    });
  }
});

//! Category API
app.get("/api/getAllCategory", (req, res) => {
  let query = "";
  if (lang.isNil(req.query["dropdown"]) || lang.isEqual(req.query["dropdown"], "false")) query = "SELECT * FROM CATEGORIES";
  else if (!lang.isNil(req.query["dropdown"]) && lang.isEqual(req.query["dropdown"], "true")) query = "SELECT cid AS value,name AS label FROM CATEGORIES";
  pool.query(query, (err, categories) => {
    err ? console.error(err) : res.send(categories);
  });
});

app.post("/api/createCategory", (req, res) => {
  let isAdmin = verifyIsAdmin(req.headers["authorization"]);
  if (!lang.isEqual(isAdmin, true)) res.status(401).send("No permission");
  else {
    let name = convertEscapeWord(req.body["name"]);
    let query = "SELECT * FROM CATEGORIES WHERE name=? LIMIT 1";

    // find if name is already existing first
    pool.query(query, [name], (err, result) => {
      err
        ? (console.error(err), res.status(500).send("Cannot create category, please try again later"))
        : lang.isNil(result) || lang.isEmpty(result)
        ? ((query = "INSERT INTO CATEGORIES (name) VALUES (?)"),
          pool.query(query, [name], (err, result) => {
            err ? (console.error(err), res.status(500).send("Cannot create category, please try again later")) : res.send("success to create new category");
          }))
        : res.status(400).send("This category already exists, please retype the category");
    });
  }
});

app.put("/api/updateCategory", (req, res) => {
  let isAdmin = verifyIsAdmin(req.headers["authorization"]);
  if (!lang.isEqual(isAdmin, true)) res.status(401).send("No permission");
  else {
    let name = convertEscapeWord(req.body["name"]);
    let cid = req.body["cid"];
    let query = "SELECT * FROM CATEGORIES WHERE name=? LIMIT 1";

    // find if name is already existing first
    pool.query(query, [name], (err, result) => {
      err
        ? (console.error(err), res.status(500).send("Cannot update category, please try again later"))
        : lang.isNil(result) || lang.isEmpty(result)
        ? ((query = "UPDATE CATEGORIES SET name=? WHERE cid=?"),
          pool.query(query, [name, cid], (err, result) => {
            err ? (console.error(err), res.status(500).send("Cannot update category, please try again later")) : res.send("Success to update category");
          }))
        : res.status(400).send("This category already exists, please retype the category");
    });
  }
});

app.delete("/api/deleteCategory", (req, res) => {
  let isAdmin = verifyIsAdmin(req.headers["authorization"]);
  if (!lang.isEqual(isAdmin, true)) res.status(401).send("No permission");
  else {
    let cid = req.body["cid"];
    let query = "SELECT * FROM CATEGORIES WHERE cid=?";

    pool.query(query, [cid], (err, result) => {
      err
        ? (console.error(err), res.status(500).send("Cannot delete category, please try again later"))
        : !lang.isNil(result) && !lang.isEmpty(result)
        ? ((query = "DELETE FROM CATEGORIES WHERE cid=?"),
          pool.query(query, [cid], (err, result) => {
            err ? (console.error(err), res.status(500).send("Cannot delete category, please try again later")) : res.send("Success to delete category");
          }))
        : res.status(404).send("Category doesn't exist");
    });
  }
});

app.listen(process.env.SERVER_PORT);
