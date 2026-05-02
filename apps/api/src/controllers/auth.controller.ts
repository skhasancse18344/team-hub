import { Request, Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import { db } from "../lib/db";
import { AppError } from "../utils/AppError";
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  setTokenCookies,
  clearTokenCookies,
} from "../utils/token";
import { JWT_CONFIG, COOKIE_CONFIG } from "../config/jwt";

const BCRYPT_ROUNDS = 12;
const REFRESH_HASH_ROUNDS = 10;

// ─── Register ─────────────────────────────────────────────────────────────────

export async function register(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { name, email, password } = req.body as {
      name?: string;
      email?: string;
      password?: string;
    };

    if (!name || !email || !password) {
      throw new AppError(400, "name, email and password are required");
    }

    if (password.length < 8) {
      throw new AppError(400, "Password must be at least 8 characters");
    }

    const existing = await db.user.findUnique({ where: { email } });
    if (existing) {
      throw new AppError(409, "Email already in use");
    }

    const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);

    const user = await db.user.create({
      data: { name, email, password: hashedPassword },
      select: { id: true, name: true, email: true, createdAt: true },
    });

    const accessToken = signAccessToken(user.id);
    const refreshToken = signRefreshToken(user.id);

    await storeRefreshToken(user.id, refreshToken);
    setTokenCookies(res, accessToken, refreshToken);

    res.status(201).json({ user });
  } catch (err) {
    next(err);
  }
}

// ─── Login ────────────────────────────────────────────────────────────────────

export async function login(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { email, password } = req.body as {
      email?: string;
      password?: string;
    };

    if (!email || !password) {
      throw new AppError(400, "email and password are required");
    }

    const user = await db.user.findUnique({ where: { email } });

    // constant-time comparison even when user not found
    const passwordMatch =
      user != null
        ? await bcrypt.compare(password, user.password)
        : await bcrypt.compare(password, "$2b$12$invalidhashfortimingnormalis");

    if (!user || !passwordMatch) {
      throw new AppError(401, "Invalid credentials");
    }

    const accessToken = signAccessToken(user.id);
    const refreshToken = signRefreshToken(user.id);

    await storeRefreshToken(user.id, refreshToken);
    setTokenCookies(res, accessToken, refreshToken);

    res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatarUrl: user.avatarUrl,
      },
    });
  } catch (err) {
    next(err);
  }
}

// ─── Logout ───────────────────────────────────────────────────────────────────

export async function logout(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const token = req.cookies[COOKIE_CONFIG.refreshToken] as string | undefined;

    if (token) {
      // delete all matching hashed tokens for this user
      const userId = req.user?.id;
      if (userId) {
        const userTokens = await db.refreshToken.findMany({
          where: { userId, expiresAt: { gt: new Date() } },
        });

        for (const stored of userTokens) {
          const match = await bcrypt.compare(token, stored.tokenHash);
          if (match) {
            await db.refreshToken.delete({ where: { id: stored.id } });
            break;
          }
        }
      }
    }

    clearTokenCookies(res);
    res.json({ message: "Logged out" });
  } catch (err) {
    next(err);
  }
}

// ─── Refresh ──────────────────────────────────────────────────────────────────

export async function refresh(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const token = req.cookies[COOKIE_CONFIG.refreshToken] as string | undefined;

    if (!token) {
      throw new AppError(401, "No refresh token");
    }

    let payload: { sub: string };
    try {
      payload = verifyRefreshToken(token);
    } catch {
      clearTokenCookies(res);
      throw new AppError(401, "Invalid or expired refresh token");
    }

    // verify token hash exists in DB and is not expired
    const storedTokens = await db.refreshToken.findMany({
      where: { userId: payload.sub, expiresAt: { gt: new Date() } },
    });

    let matchedId: string | null = null;
    for (const stored of storedTokens) {
      if (await bcrypt.compare(token, stored.tokenHash)) {
        matchedId = stored.id;
        break;
      }
    }

    if (!matchedId) {
      clearTokenCookies(res);
      throw new AppError(401, "Refresh token revoked or expired");
    }

    // rotate — delete old, issue new (prevents token reuse)
    await db.refreshToken.delete({ where: { id: matchedId } });

    const newAccessToken = signAccessToken(payload.sub);
    const newRefreshToken = signRefreshToken(payload.sub);

    await storeRefreshToken(payload.sub, newRefreshToken);
    setTokenCookies(res, newAccessToken, newRefreshToken);

    res.json({ message: "Tokens refreshed" });
  } catch (err) {
    next(err);
  }
}

// ─── Me (current user) ────────────────────────────────────────────────────────

export async function me(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const user = await db.user.findUnique({
      where: { id: req.user!.id },
      select: { id: true, name: true, email: true, avatarUrl: true, createdAt: true },
    });

    if (!user) throw new AppError(404, "User not found");

    res.json({ user });
  } catch (err) {
    next(err);
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function storeRefreshToken(userId: string, token: string): Promise<void> {
  const tokenHash = await bcrypt.hash(token, REFRESH_HASH_ROUNDS);
  const expiresAt = new Date(Date.now() + JWT_CONFIG.refreshExpiresMs);

  await db.refreshToken.create({
    data: { userId, tokenHash, expiresAt },
  });

  // prune expired tokens for this user (keep DB clean)
  await db.refreshToken.deleteMany({
    where: { userId, expiresAt: { lte: new Date() } },
  });
}
