import mysql from "mysql2/promise";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import "dotenv/config";

const dir = path.dirname(fileURLToPath(import.meta.url));
const read = (file) => fs.readFileSync(path.join(dir, file), "utf8");

const conn = await mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  multipleStatements: true,
});

try {
  await conn.query(
    `CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME}\` CHARACTER SET utf8mb4`
  );
  await conn.query(`USE \`${process.env.DB_NAME}\``);
  await conn.query(read("schema.sql"));
  await conn.query(read("seed.sql"));
  console.log("Database ready.");
} catch (err) {
  console.error("Migration failed:", err.message);
  process.exitCode = 1;
} finally {
  await conn.end();
}