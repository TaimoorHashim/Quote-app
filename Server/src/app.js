import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import { env } from "./config/env.js";
import { pool } from "./config/db.js";
import { AppError } from "./utils/AppError.js";
import authRoutes from "./routes/auth.routes.js";

const app = express();

app.use(helmet());
app.use(cors({ origin: env.clientUrl, credentials: true }));
app.use(express.json({ limit: "100kb" }));
app.use(cookieParser());
app.use(morgan("dev"));

app.get("/api/health", async (req, res, next) => {
  try {
    const [rows] = await pool.query("SELECT COUNT(*) AS rates FROM rates");
    res.json({ ok: true, rates: rows[0].rates });
  } catch (err) {
    next(err);
  }
});

app.use("/api/auth", authRoutes);

app.use((req, res, next) => {
  next(new AppError(404, "NOT_FOUND", "Route not found."));
});

app.use((err, req, res, next) => {
  if (err instanceof AppError) {
    return res.status(err.status).json({
      error: { code: err.code, message: err.message, details: err.details },
    });
  }
  if (err.type === "entity.parse.failed") {
    return res
      .status(400)
      .json({ error: { code: "INVALID_JSON", message: "Request body is not valid JSON." } });
  }
  if (err.type === "entity.too.large") {
    return res
      .status(413)
      .json({ error: { code: "PAYLOAD_TOO_LARGE", message: "Request body is too large." } });
  }
  console.error(err);
  res.status(500).json({
    error: {
      code: "INTERNAL_ERROR",
      message: "Something went wrong on our side. Please try again.",
    },
  });
});

export default app;