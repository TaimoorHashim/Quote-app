import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { pool } from "./config/db.js";

const app = express();

app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_URL || "http://localhost:5173" }));
app.use(express.json({ limit: "100kb" }));
app.use(morgan("dev"));

app.get("/api/health", async (req, res, next) => {
  try {
    const [rows] = await pool.query("SELECT COUNT(*) AS rates FROM rates");
    res.json({ ok: true, rates: rows[0].rates });
  } catch (err) {
    next(err);
  }
});

// auth, rates and quotes routes get mounted here in the next steps

app.use((req, res) => res.status(404).json({ error: "Not found" }));

app.use((err, req, res, next) => {
  const status = err.status || 500;
  if (status >= 500) console.error(err);
  res.status(status).json({
    error: status >= 500 ? "Internal server error" : err.message,
  });
});

export default app;