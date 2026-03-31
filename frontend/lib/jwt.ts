export type JwtPayload = {
  sub?: string;
  email?: string;
  role?: string;
};

/** JWT payload (client-side, faqat o‘qish uchun). */
export function decodeJwtPayload(token: string): JwtPayload | null {
  try {
    const [, payload] = token.split(".");
    if (!payload) return null;
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const json = atob(base64);
    return JSON.parse(json) as JwtPayload;
  } catch {
    return null;
  }
}
