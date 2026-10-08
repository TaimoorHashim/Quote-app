import { env } from "../config/env.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import * as authService from "../services/auth.service.js";

const COOKIE_NAME = "refresh_token";

const cookieOptions = (expires) => ({
  httpOnly: true,
  secure: env.isProd,
  sameSite: "lax",
  path: "/api/auth",
  ...(expires && { expires }),
});

function sendSession(res, result, status = 200) {
  res.cookie(COOKIE_NAME, result.refreshToken, cookieOptions(result.refreshExpiresAt));
  res.status(status).json({
    accessToken: result.accessToken,
    user: result.user,
    business: result.business,
  });
}

export const register = asyncHandler(async (req, res) => {
  sendSession(res, await authService.register(req.body), 201);
});

export const login = asyncHandler(async (req, res) => {
  sendSession(res, await authService.login(req.body));
});

export const refresh = asyncHandler(async (req, res) => {
  sendSession(res, await authService.refresh(req.cookies[COOKIE_NAME]));
});

export const logout = asyncHandler(async (req, res) => {
  await authService.logout(req.cookies[COOKIE_NAME]);
  res.clearCookie(COOKIE_NAME, cookieOptions());
  res.status(204).end();
});

export const me = asyncHandler(async (req, res) => {
  res.json(await authService.getMe(req.auth.userId));
});