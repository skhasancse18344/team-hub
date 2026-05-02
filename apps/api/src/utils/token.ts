import jwt from "jsonwebtoken";
import { Response } from "express";
import { JWT_CONFIG, COOKIE_CONFIG } from "../config/jwt";

// ─── Token signing ────────────────────────────────────────────────────────────

export function signAccessToken(userId: string): string {
  return jwt.sign({ sub: userId }, JWT_CONFIG.accessSecret, {
    expiresIn: JWT_CONFIG.accessExpiresIn,
  });
}

export function signRefreshToken(userId: string): string {
  return jwt.sign({ sub: userId }, JWT_CONFIG.refreshSecret, {
    expiresIn: JWT_CONFIG.refreshExpiresIn,
  });
}

// ─── Token verification ───────────────────────────────────────────────────────

export function verifyAccessToken(token: string): { sub: string } {
  return jwt.verify(token, JWT_CONFIG.accessSecret) as { sub: string };
}

export function verifyRefreshToken(token: string): { sub: string } {
  return jwt.verify(token, JWT_CONFIG.refreshSecret) as { sub: string };
}

// ─── Cookie helpers ───────────────────────────────────────────────────────────

const isProduction = process.env.NODE_ENV === "production";

export function setTokenCookies(
  res: Response,
  accessToken: string,
  refreshToken: string
): void {
  res.cookie(COOKIE_CONFIG.accessToken, accessToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "strict" : "lax",
    maxAge: 15 * 60 * 1000, // 15 minutes
  });

  res.cookie(COOKIE_CONFIG.refreshToken, refreshToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "strict" : "lax",
    maxAge: JWT_CONFIG.refreshExpiresMs,
    path: "/api/auth/refresh", // restrict to refresh endpoint
  });
}

export function clearTokenCookies(res: Response): void {
  res.clearCookie(COOKIE_CONFIG.accessToken);
  res.clearCookie(COOKIE_CONFIG.refreshToken, { path: "/api/auth/refresh" });
}
