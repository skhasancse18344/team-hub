import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export const api = axios.create({
  baseURL: API_URL,
  withCredentials: true, // send httpOnly cookies on every request
  headers: { "Content-Type": "application/json" },
});

// ─── Auth ─────────────────────────────────────────────────────────────────────

export async function loginRequest(email, password) {
  const { data } = await api.post("/api/auth/login", { email, password });
  return data.user;
}

export async function registerRequest(name, email, password) {
  const { data } = await api.post("/api/auth/register", { name, email, password });
  return data.user;
}

export async function logoutRequest() {
  await api.post("/api/auth/logout");
}

export async function meRequest() {
  const { data } = await api.get("/api/auth/me");
  return data.user;
}



export async function fetchProfile() {
  const { data } = await api.get("/api/profile");
  return data.user;
}

export async function updateProfile(payload) {
  const { data } = await api.patch("/api/profile", payload);
  return data.user;
}

// Step 1: ask the API for a signed Cloudinary upload signature
export async function fetchUploadSignature() {
  const { data } = await api.get("/api/profile/avatar/signature");
  return data;
}

// Step 2: upload the file directly to Cloudinary using the signature
export async function uploadToCloudinary(file, signatureData) {
  const { signature, timestamp, folder, publicId, cloudName, apiKey } =
    signatureData;

  const form = new FormData();
  form.append("file", file);
  form.append("signature", signature);
  form.append("timestamp", String(timestamp));
  form.append("api_key", apiKey);
  form.append("folder", folder);
  form.append("public_id", publicId);
  form.append("overwrite", "true");
  form.append("format", "jpg");
  form.append("transformation", "c_fill,g_face,h_400,w_400,q_auto");

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
    { method: "POST", body: form }
  );

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error?.message ?? "Cloudinary upload failed");
  }

  const result = await res.json();
  return result.secure_url;
}

// Step 3: tell the API to persist the returned URL
export async function confirmAvatar(avatarUrl) {
  const { data } = await api.patch("/api/profile/avatar", { avatarUrl });
  return data.user;
}

export async function removeAvatar() {
  const { data } = await api.delete("/api/profile/avatar");
  return data.user;
}
