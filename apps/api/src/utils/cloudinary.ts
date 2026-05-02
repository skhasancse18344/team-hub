import crypto from "crypto";
import { cloudinary } from "../config/cloudinary";

const AVATAR_FOLDER = "team-hub/avatars";
// max 5 MB, images only
const UPLOAD_PRESET_MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_FORMATS = ["jpg", "jpeg", "png", "webp", "gif"];

/**
 * Generate a short-lived signed upload signature.
 * The frontend uses this to upload directly to Cloudinary — the API secret
 * never reaches the browser.
 */
export function generateUploadSignature(userId: string): {
  signature: string;
  timestamp: number;
  folder: string;
  publicId: string;
  cloudName: string;
  apiKey: string;
} {
  const timestamp = Math.round(Date.now() / 1000);
  const publicId = `${AVATAR_FOLDER}/${userId}`;

  const paramsToSign = {
    folder: AVATAR_FOLDER,
    public_id: publicId,
    timestamp,
    // overwrite existing image for same userId
    overwrite: true,
    // auto-transform to jpg, strip exif metadata
    format: "jpg",
    transformation: "c_fill,g_face,h_400,w_400,q_auto",
  };

  const signature = cloudinary.utils.api_sign_request(
    paramsToSign,
    process.env.CLOUDINARY_API_SECRET!
  );

  return {
    signature,
    timestamp,
    folder: AVATAR_FOLDER,
    publicId,
    cloudName: process.env.CLOUDINARY_CLOUD_NAME!,
    apiKey: process.env.CLOUDINARY_API_KEY!,
  };
}

/**
 * Validate a Cloudinary secure_url before persisting it.
 * Ensures the URL belongs to our cloud and the correct folder.
 */
export function validateCloudinaryUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    const isCloudinaryHost =
      parsed.hostname === "res.cloudinary.com" ||
      parsed.hostname.endsWith(".cloudinary.com");
    const belongsToOurCloud = parsed.pathname.includes(
      `/${process.env.CLOUDINARY_CLOUD_NAME}/`
    );
    const inOurFolder = parsed.pathname.includes(AVATAR_FOLDER);
    return isCloudinaryHost && belongsToOurCloud && inOurFolder;
  } catch {
    return false;
  }
}

/**
 * Delete a Cloudinary asset by its public_id.
 * Called when a user replaces or removes their avatar.
 */
export async function deleteCloudinaryAsset(
  publicId: string
): Promise<void> {
  await cloudinary.uploader.destroy(publicId);
}

export { UPLOAD_PRESET_MAX_BYTES, ALLOWED_FORMATS, AVATAR_FOLDER };
