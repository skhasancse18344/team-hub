import { Request, Response, NextFunction } from "express";
import { db } from "../lib/db";
import { AppError } from "../utils/AppError";
import {
  generateUploadSignature,
  validateCloudinaryUrl,
} from "../utils/cloudinary";

const SAFE_USER_SELECT = {
  id: true,
  name: true,
  email: true,
  avatarUrl: true,
  createdAt: true,
  updatedAt: true,
} as const;

// ─── Get profile ──────────────────────────────────────────────────────────────

export async function getProfile(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const user = await db.user.findUnique({
      where: { id: req.user!.id },
      select: SAFE_USER_SELECT,
    });

    if (!user) throw new AppError(404, "User not found");

    res.json({ user });
  } catch (err) {
    next(err);
  }
}

// ─── Update profile ───────────────────────────────────────────────────────────

export async function updateProfile(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { name } = req.body as { name?: string };

    if (name !== undefined) {
      if (typeof name !== "string" || name.trim().length === 0) {
        throw new AppError(400, "name must be a non-empty string");
      }
      if (name.trim().length > 100) {
        throw new AppError(400, "name must be 100 characters or less");
      }
    }

    const updated = await db.user.update({
      where: { id: req.user!.id },
      data: {
        ...(name !== undefined && { name: name.trim() }),
      },
      select: SAFE_USER_SELECT,
    });

    res.json({ user: updated });
  } catch (err) {
    next(err);
  }
}

// ─── Get upload signature ─────────────────────────────────────────────────────

export async function getAvatarUploadSignature(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const signatureData = generateUploadSignature(req.user!.id);
    res.json(signatureData);
  } catch (err) {
    next(err);
  }
}

// ─── Confirm avatar (store URL after direct upload) ──────────────────────────

export async function updateAvatar(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { avatarUrl } = req.body as { avatarUrl?: string };

    if (!avatarUrl || typeof avatarUrl !== "string") {
      throw new AppError(400, "avatarUrl is required");
    }

    // Validate the URL actually belongs to our Cloudinary account and folder
    if (!validateCloudinaryUrl(avatarUrl)) {
      throw new AppError(400, "Invalid avatar URL");
    }

    const updated = await db.user.update({
      where: { id: req.user!.id },
      data: { avatarUrl },
      select: SAFE_USER_SELECT,
    });

    res.json({ user: updated });
  } catch (err) {
    next(err);
  }
}

// ─── Remove avatar ────────────────────────────────────────────────────────────

export async function removeAvatar(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const updated = await db.user.update({
      where: { id: req.user!.id },
      data: { avatarUrl: null },
      select: SAFE_USER_SELECT,
    });

    res.json({ user: updated });
  } catch (err) {
    next(err);
  }
}
