import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { pool } from "../config/db.js";
import { env } from "../config/env.js";
import { AppError } from "../utils/AppError.js";

const BCRYPT_ROUNDS = 12;
const REUSE_GRACE_MS = 10 * 1000;
// Compared against when an email is unknown, so timing doesn't reveal which emails exist.
const DUMMY_HASH = await bcrypt.hash("not-a-real-password", BCRYPT_ROUNDS);

const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");

const invalidSession = () =>
  new AppError(401, "UNAUTHENTICATED", "Please log in to continue.");

function signAccessToken(user) {
  return jwt.sign({ bid: user.business_id }, env.jwtSecret, {
    algorithm: "HS256",
    subject: String(user.id),
    expiresIn: env.accessTokenTtl,
  });
}

async function issueRefreshToken(userId, db = pool) {
  const token = crypto.randomBytes(48).toString("hex");
  const expiresAt = new Date(Date.now() + env.refreshTokenDays * 24 * 60 * 60 * 1000);
  await db.query(
    "INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES (?, ?, ?)",
    [userId, sha256(token), expiresAt]
  );
  return { token, expiresAt };
}

function buildResult(row, refresh) {
  return {
    accessToken: signAccessToken(row),
    refreshToken: refresh.token,
    refreshExpiresAt: refresh.expiresAt,
    user: { id: row.id, name: row.name, email: row.email, role: row.role },
    business: {
      id: row.business_id,
      name: row.business_name,
      currency: row.currency,
      taxRate: row.tax_rate,
    },
  };
}

const USER_WITH_BUSINESS = `
  SELECT u.id, u.business_id, u.name, u.email, u.role, u.password_hash,
         b.name AS business_name, b.currency, b.tax_rate
  FROM users u JOIN businesses b ON b.id = u.business_id`;

export async function register({ businessName, name, email, password }) {
  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [biz] = await conn.query(
      "INSERT INTO businesses (name, currency, tax_rate) VALUES (?, 'CAD', 5.00)",
      [businessName]
    );
    const [usr] = await conn.query(
      "INSERT INTO users (business_id, name, email, password_hash) VALUES (?, ?, ?, ?)",
      [biz.insertId, name, email, passwordHash]
    );
    const refresh = await issueRefreshToken(usr.insertId, conn);
    await conn.commit();
    return buildResult(
      {
        id: usr.insertId,
        business_id: biz.insertId,
        name,
        email,
        role: "owner",
        business_name: businessName,
        currency: "CAD",
        tax_rate: 5,
      },
      refresh
    );
  } catch (err) {
    await conn.rollback();
    if (err.code === "ER_DUP_ENTRY") {
      throw new AppError(409, "EMAIL_TAKEN", "An account with this email already exists.");
    }
    throw err;
  } finally {
    conn.release();
  }
}

export async function login({ email, password }) {
  const [rows] = await pool.query(`${USER_WITH_BUSINESS} WHERE u.email = ? LIMIT 1`, [email]);
  const row = rows[0];
  const passwordOk = await bcrypt.compare(password, row ? row.password_hash : DUMMY_HASH);
  if (!row || !passwordOk) {
    throw new AppError(401, "INVALID_CREDENTIALS", "Invalid email or password.");
  }
  const refresh = await issueRefreshToken(row.id);
  return buildResult(row, refresh);
}

export async function refresh(rawToken) {
  if (!rawToken) throw invalidSession();

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [tokens] = await conn.query(
      "SELECT id, user_id, expires_at, revoked_at FROM refresh_tokens WHERE token_hash = ? FOR UPDATE",
      [sha256(rawToken)]
    );
    const stored = tokens[0];
    if (!stored) throw invalidSession();

    if (stored.revoked_at) {
      // An old token was presented again. A short gap is a double request (two tabs);
      // a longer gap suggests theft, so every session for this user is revoked.
      if (Date.now() - new Date(stored.revoked_at).getTime() > REUSE_GRACE_MS) {
        await conn.query(
          "UPDATE refresh_tokens SET revoked_at = ? WHERE user_id = ? AND revoked_at IS NULL",
          [new Date(), stored.user_id]
        );
        await conn.commit();
      }
      throw invalidSession();
    }
    if (new Date(stored.expires_at) < new Date()) throw invalidSession();

    await conn.query("UPDATE refresh_tokens SET revoked_at = ? WHERE id = ?", [
      new Date(),
      stored.id,
    ]);
    const [users] = await conn.query(`${USER_WITH_BUSINESS} WHERE u.id = ? LIMIT 1`, [
      stored.user_id,
    ]);
    if (!users[0]) throw invalidSession();

    const next = await issueRefreshToken(stored.user_id, conn);
    await conn.commit();
    return buildResult(users[0], next);
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

export async function logout(rawToken) {
  if (!rawToken) return;
  await pool.query(
    "UPDATE refresh_tokens SET revoked_at = ? WHERE token_hash = ? AND revoked_at IS NULL",
    [new Date(), sha256(rawToken)]
  );
}

export async function getMe(userId) {
  const [rows] = await pool.query(`${USER_WITH_BUSINESS} WHERE u.id = ? LIMIT 1`, [userId]);
  if (!rows[0]) throw invalidSession();
  const { accessToken, refreshToken, refreshExpiresAt, ...profile } = buildResult(rows[0], {
    token: "",
    expiresAt: null,
  });
  return profile;
}