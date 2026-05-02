export const JWT_CONFIG = {
  accessSecret: process.env.JWT_ACCESS_SECRET ?? "changeme-access-secret",
  refreshSecret: process.env.JWT_REFRESH_SECRET ?? "changeme-refresh-secret",
  accessExpiresIn: "15m",
  refreshExpiresIn: "7d",
  refreshExpiresMs: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
} as const;

export const COOKIE_CONFIG = {
  accessToken: "access_token",
  refreshToken: "refresh_token",
} as const;
