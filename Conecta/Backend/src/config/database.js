import mysql from "mysql2/promise";
import "dotenv/config";

const pool = mysql.createPool({
  host: process.env.DB_HOST || "127.0.0.1",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "@Ch18050212",
  database: process.env.DB_NAME || "conecta_cefet",
  dateStrings: true,
  waitForConnections: true,
  connectionLimit: 10,
});

export default pool;
