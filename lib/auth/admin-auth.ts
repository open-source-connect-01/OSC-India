import crypto from "crypto";
import { cookies } from "next/headers";

export const ADMIN_COOKIE_NAME = "osc_admin_session";
const SESSION_MAX_AGE_SECONDS = 8 * 60 * 60; // 8 hours

function getSecretKey(): string {
  return (
    process.env.ADMIN_SESSION_SECRET ||
    process.env.AUTH_SECRET ||
    "osc_admin_secure_secret_fallback_key_2026"
  );
}

/**
 * Validates provided credentials against server-side environment variables.
 * Uses timingSafeEqual to protect against timing attacks.
 */
export function validateAdminCredentials(emailInput: string, passwordInput: string): boolean {
  const configuredEmail = (process.env.ADMIN_PORTAL_EMAIL || "sayanghosh1887@gmail.com")
    .trim()
    .toLowerCase();
  const configuredPassword = process.env.ADMIN_PORTAL_PASSWORD || "Admin@OSC2026!";

  const normInputEmail = (emailInput || "").trim().toLowerCase();
  if (normInputEmail !== configuredEmail) {
    return false;
  }

  const inputBuffer = Buffer.from(passwordInput || "");
  const expectedBuffer = Buffer.from(configuredPassword);

  if (inputBuffer.length !== expectedBuffer.length) {
    // Perform dummy timing comparison to prevent side-channel leaks
    crypto.timingSafeEqual(inputBuffer, inputBuffer);
    return false;
  }

  return crypto.timingSafeEqual(inputBuffer, expectedBuffer);
}

/**
 * Generates an HMAC-SHA256 signed session token.
 */
export function createAdminToken(): string {
  const secret = getSecretKey();
  const timestamp = Date.now().toString();
  const hmac = crypto.createHmac("sha256", secret);
  hmac.update(`osc-admin:${timestamp}`);
  const signature = hmac.digest("hex");
  return `${timestamp}.${signature}`;
}

/**
 * Verifies that an admin token is genuine, untampered, and unexpired.
 */
export function verifyAdminToken(token?: string | null): boolean {
  if (!token || typeof token !== "string") return false;

  const parts = token.split(".");
  if (parts.length !== 2) return false;

  const [timestampStr, signature] = parts;
  const timestamp = parseInt(timestampStr, 10);
  if (isNaN(timestamp)) return false;

  const maxAgeMs = SESSION_MAX_AGE_SECONDS * 1000;
  const now = Date.now();

  // Expired or from the future (> 1 minute clock drift)
  if (now - timestamp > maxAgeMs || timestamp > now + 60000) {
    return false;
  }

  const secret = getSecretKey();
  const hmac = crypto.createHmac("sha256", secret);
  hmac.update(`osc-admin:${timestampStr}`);
  const expectedSig = hmac.digest("hex");

  const sigBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSig);

  if (sigBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(sigBuffer, expectedBuffer);
}

/**
 * Checks whether the current request holds a valid signed admin session cookie.
 */
export async function verifyAdminSession(): Promise<boolean> {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(ADMIN_COOKIE_NAME)?.value;
    return verifyAdminToken(sessionCookie);
  } catch {
    return false;
  }
}

/**
 * Issues and sets the signed HTTP-only cookie.
 */
export async function setAdminSessionCookie(): Promise<void> {
  const token = createAdminToken();
  const cookieStore = await cookies();
  cookieStore.set(ADMIN_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

/**
 * Deletes the admin session cookie to immediately lock the admin portal.
 */
export async function clearAdminSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(ADMIN_COOKIE_NAME);
}
