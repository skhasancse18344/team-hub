import type { Membership } from "../../generated/prisma/client";

// Augment Express Request to carry the authenticated user and active membership
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
      };
      membership?: Membership;
    }
  }
}

export {};
