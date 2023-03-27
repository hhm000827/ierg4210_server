const express = require("express");
var https = require("https");
var cors = require("cors");
var pool = require("./pool");
var bodyParser = require("body-parser");
var lang = require("lodash/lang");
require("dotenv").config({ path: __dirname + "/config.env" });
const multer = require("multer");
const fs = require("fs");
const bycrpt = require("bcrypt");
var cookieParser = require("cookie-parser");
const { createJwt, verifyIsAdmin, getUserEmail } = require("./jwt");
const { login, changePassword, createProduct, updateProduct, deleteProduct, createCategory, updateCategory, deleteCategory, createCustomId, storeRecord } = require("./validation");
var csrf = require("csurf");
const { validate, ValidationError } = require("express-validation");
const crypto = require("crypto");

var privateKey = fs.readFileSync("./config/backend.key", "utf8");
var certificate = fs.readFileSync("./config/13_112_244_194.chained.crt", "utf8");
var credentials = { key: privateKey, cert: certificate };

const app = express();

var csrfProtection = csrf({ cookie: { httpOnly: true, sameSite: "none", secure: true, maxAge: 60 * 60 * 24 * 3 } });
app.use(cookieParser());
app.use(
  cors({
    origin: process.env.CORS_ORIGIN.split(" "),
    credentials: true,
  })
);

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// serve the images in image folder to frontend
app.use("/images", express.static("image"));

//config of file upload
let storage = multer.diskStorage({
  destination: "./image/",
  filename: function (req, file, callback) {
    callback(null, req.body["name"] + "." + file.mimetype.split("/").pop());
  },
});

const upload = multer({
  limits: { fileSize: 5000000 },
  storage: storage,
  fileFilter(req, file, cb) {
    let result = verifyIsAdmin(req.cookies.auth);
    if (!lang.isEqual(result, true)) cb("no permission to upload", false);
    else if (file.size <= 0) cb("image is required", false);
    else if (!file.originalname.match(/\.(jpg|jpeg|gif|png)$/)) cb("Please upload an image", false);
    else cb(null, true);
  },
});

app.get("/api/getCsrfToken", csrfProtection, function (req, res) {
  // pass the csrfToken to the view
  res.json({ csrfToken: req.csrfToken() });
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

app.post("/api/login", csrfProtection, validate(login), (req, res) => {
  let email = req.body.email;
  let password = req.body.password;
  let query = "SELECT * FROM USERS WHERE email=? LIMIT 1";

  pool.query(query, [email], (err, result) => {
    if (err) console.error(err), res.status(500).send("Cannot login, please try again later");
    else {
      if (lang.isNil(result) || lang.isEmpty(result)) res.status(400).send("either email or password is incorrect");
      else {
        const hashPassword = result[0].password;
        const isValid = bycrpt.compareSync(password, hashPassword);
        if (isValid) {
          let data = { email: email, isAdmin: result[0].isAdmin, loginTime: new Date() };
          let token = createJwt(data);
          res.clearCookie("auth", { httpOnly: true, sameSite: "none", secure: true });
          res.cookie("auth", token, { httpOnly: true, sameSite: "none", secure: true, maxAge: 1000 * 60 * 60 * 24 * 3 });
          res.send({ name: email.split("@")[0], message: "login success" });
        } else res.status(400).send("either email or password is incorrect");
      }
    }
  });
});

app.post("/api/changePassword", csrfProtection, validate(changePassword), (req, res) => {
  let { email, password, newPassword } = req.body;
  let query = "SELECT * FROM USERS WHERE email=? LIMIT 1";

  pool.query(query, [email], (err, result) => {
    if (err) console.error(err), res.status(500).send("Cannot change password, please try again later");
    else {
      if (lang.isNil(result) || lang.isEmpty(result)) res.status(400).send("either email or old password is incorrect");
      else {
        const hashPassword = result[0].password;
        const isValid = bycrpt.compareSync(password, hashPassword);
        if (isValid) {
          newHashPassword = bycrpt.hashSync(newPassword, 10);
          query = "UPDATE USERS SET password=? WHERE email=?";
          pool.query(query, [newHashPassword, email], (err, changeResult) => {
            if (err) console.error(err), res.status(500).send("Cannot change password, please try again later");
            else res.send("password changed successfully");
          });
        } else res.status(400).send("either email or old password is incorrect");
      }
    }
  });
});

app.get("/api/verify", (req, res) => {
  let result = verifyIsAdmin(req.cookies.auth);
  res.send(result);
});

app.get("/api/logout", (req, res) => {
  res.clearCookie("auth", { httpOnly: true, secure: true, sameSite: "none", maxAge: -1 });
  res.clearCookie("_csrf", { httpOnly: true, secure: true, sameSite: "none", maxAge: -1 });
  res.end();
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

app.post("/api/createProduct", csrfProtection, upload.single("file"), validate(createProduct), (req, res) => {
  let isAdmin = verifyIsAdmin(req.cookies.auth);
  if (!lang.isEqual(isAdmin, true)) res.status(401).send("No permission");
  else {
    let { name, description, cid, price, inventory } = req.body;
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

app.put("/api/updateProduct", csrfProtection, upload.single("file"), validate(updateProduct), (req, res) => {
  let isAdmin = verifyIsAdmin(req.cookies.auth);
  if (!lang.isEqual(isAdmin, true)) res.status(401).send("No permission");
  else {
    let { pid, name, description, cid, price, inventory, oldImg, oldName } = req.body;
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

app.delete("/api/deleteProduct", csrfProtection, validate(deleteProduct), (req, res) => {
  let isAdmin = verifyIsAdmin(req.cookies.auth);
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

app.post("/api/createCategory", csrfProtection, validate(createCategory), (req, res) => {
  let isAdmin = verifyIsAdmin(req.cookies.auth);
  if (!lang.isEqual(isAdmin, true)) res.status(401).send("No permission");
  else {
    let name = req.body["name"];
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

app.put("/api/updateCategory", csrfProtection, validate(updateCategory), (req, res) => {
  let isAdmin = verifyIsAdmin(req.cookies.auth);
  if (!lang.isEqual(isAdmin, true)) res.status(401).send("No permission");
  else {
    let { name, cid } = req.body;
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

app.delete("/api/deleteCategory", csrfProtection, validate(deleteCategory), (req, res) => {
  let isAdmin = verifyIsAdmin(req.cookies.auth);
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

//! Paypal API
app.post("/api/createCustomId", csrfProtection, validate(createCustomId), (req, res) => {
  let { shoppingCart, totalPrice, currency } = req.body;
  let merchant = process.env.MERCHANT;
  const salt = crypto.randomBytes(16).toString("hex");
  let hash = crypto.createHash("sha256");

  hash.update(shoppingCart + currency + totalPrice + merchant + salt);
  let digest = hash.digest("hex");
  res.send({ digest: digest });
});

app.post("/api/storeRecord", csrfProtection, validate(storeRecord), (req, res) => {
  const email = getUserEmail(req.cookies.auth);
  let { shoppingCart, record } = req.body;
  shoppingCart = JSON.parse(shoppingCart);

  let products = shoppingCart.map((item) => {
    return { name: item.name, quantity: item.quantity, subtotal: item.subtotal };
  });
  products = JSON.stringify(products);

  record = JSON.parse(record);
  record = { id: record.id, status: record.status, payments: record.purchase_units[0].payments };
  record = JSON.stringify(record);

  let query = "INSERT INTO RECORDS (email,record,products) VALUES (?,?,?)";
  pool.query(query, [email, record, products], (err, result) => {
    err ? (console.error(err), res.status(500).send("Cannot store record to DB")) : res.send("success to store record to DB");
  });
});

app.get("/api/getUserRecord", csrfProtection, (req, res) => {
  let query = "SELECT record,products FROM RECORDS WHERE RECORDS.email = ? ORDER BY cart.RECORDS.time desc limit 5";
  const email = getUserEmail(req.cookies.auth);
  if (email === false) res.send([]);
  else pool.query(query, [email], (err, result) => (err ? (console.error(err), res.status(500).send("Cannot get record from DB")) : res.send(result)));
});

app.use((err, req, res, next) => {
  if (err instanceof ValidationError) {
    if (req.file) fs.unlink(req.file.path, (err) => (err ? console.log(err) : console.log("delete file successfully")));
    return res.status(err.statusCode).json(err);
  } else if (err.code === "EBADCSRFTOKEN") res.status(403).send(err.message);
});

var httpsServer = https.createServer(credentials, app);
httpsServer.listen(process.env.SERVER_PORT);
