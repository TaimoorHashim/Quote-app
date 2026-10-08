import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { AppError } from "../utils/AppError.js";

export function requireAuth(req, res, next) {
  const [scheme, token] = (req.headers.authorization || "").split(" ");
  if (scheme !== "Bearer" || !token) {
    return next(new AppError(401, "UNAUTHENTICATED", "Please log in to continue."));
  }
  try {
    const payload = jwt.verify(token, env.jwtSecret, { algorithms: ["HS256"] });
    req.auth = { userId: Number(payload.sub), businessId: payload.bid };
    next();
  } catch (err) {
    const expired = err.name === "TokenExpiredError";
    next(
      new AppError(
        401,
        expired ? "TOKEN_EXPIRED" : "UNAUTHENTICATED",
        expired ? "Your session expired. Please refresh." : "Please log in to continue."
      )
    );
  }
}