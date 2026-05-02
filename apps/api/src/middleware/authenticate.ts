import { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/AppError";
import { verifyAccessToken } from "../utils/token";
import { COOKIE_CONFIG } from "../config/jwt";

/**
 * Protects a route. Reads the access token from:
 *   1. httpOnly cookie (preferred)
 *   2. Authorization: Bearer <token> header (fallback for API clients)
 *
 * Attaches `req.user.id` on success.
 */
export function authenticate(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  try {
    const cookieToken = req.cookies[COOKIE_CONFIG.accessToken] as
      | string
      | undefined;

    const headerToken = req.headers.authorization?.startsWith("Bearer ")
      ? req.headers.authorization.slice(7)
      : undefined;

    const token = cookieToken ?? headerToken;

    if (!token) {
      throw new AppError(401, "Authentication required");
    }

    const payload = verifyAccessToken(token);
    req.user = { id: payload.sub };

    next();
  } catch (err) {
    if (err instanceof AppError) {
      next(err);
    } else {
      // jwt.verify throws JsonWebTokenError / TokenExpiredError
      next(new AppError(401, "Invalid or expired access token"));
    }
  }
}
