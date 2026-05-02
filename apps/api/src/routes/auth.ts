import { Router } from "express";
import { register, login, logout, refresh, me } from "../controllers/auth.controller";
import { authenticate } from "../middleware/authenticate";

const router = Router();

// Public routes
router.post("/register", register);
router.post("/login", login);
router.post("/refresh", refresh);

// Protected routes
router.post("/logout", authenticate, logout);
router.get("/me", authenticate, me);

export default router;
