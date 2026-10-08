import { Router } from "express";
import { validate } from "../middleware/validate.js";
import { requireAuth } from "../middleware/auth.js";
import { authLimiter } from "../middleware/rateLimiters.js";
import { registerSchema, loginSchema } from "../schemas/auth.schema.js";
import * as controller from "../controllers/auth.controller.js";

const router = Router();

router.post("/register", authLimiter, validate(registerSchema), controller.register);
router.post("/login", authLimiter, validate(loginSchema), controller.login);
router.post("/refresh", controller.refresh);
router.post("/logout", controller.logout);
router.get("/me", requireAuth, controller.me);

export default router;