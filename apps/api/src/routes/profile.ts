import { Router } from "express";
import {
  getProfile,
  updateProfile,
  getAvatarUploadSignature,
  updateAvatar,
  removeAvatar,
} from "../controllers/profile.controller";
import { authenticate } from "../middleware/authenticate";

const router = Router();

// All profile routes require authentication
router.use(authenticate);

router.get("/", getProfile);
router.patch("/", updateProfile);
router.get("/avatar/signature", getAvatarUploadSignature);
router.patch("/avatar", updateAvatar);
router.delete("/avatar", removeAvatar);

export default router;
