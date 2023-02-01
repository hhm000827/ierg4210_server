require("dotenv").config({ path: __dirname + "/config.env" });
var mysql = require("mysql");

var pool = mysql.createPool({
  connectionLimit: 100,
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
  database: process.env.DB_DATABASE,
});

pool.getConnection((err, connection) => {
  if (err) console.error(err);
  if (connection) connection.release();
  return;
});

module.exports = pool;
