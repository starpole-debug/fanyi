import crypto from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const COOKIE_NAME = "translator_admin_session";

function secret() {
  return process.env.ADMIN_SESSION_SECRET || "dev-only-session-secret";
}

function expectedUsername() {
  return process.env.ADMIN_USERNAME || "admin";
}

function expectedPassword() {
  return process.env.ADMIN_PASSWORD || "change-me";
}

function sign(payload: string) {
  return crypto.createHmac("sha256", secret()).update(payload).digest("hex");
}

export async function createAdminSession(username: string) {
  const payload = `${username}:${Date.now()}`;
  const token = `${payload}.${sign(payload)}`;
  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7
  });
}

export async function clearAdminSession() {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

export async function isAdminAuthenticated() {
  const store = await cookies();
  const raw = store.get(COOKIE_NAME)?.value;
  if (!raw) {
    return false;
  }

  const splitIndex = raw.lastIndexOf(".");
  if (splitIndex <= 0) {
    return false;
  }

  const payload = raw.slice(0, splitIndex);
  const signature = raw.slice(splitIndex + 1);
  if (sign(payload) !== signature) {
    return false;
  }

  return payload.startsWith(`${expectedUsername()}:`);
}

export async function requireAdmin() {
  if (!(await isAdminAuthenticated())) {
    redirect("/admin/login");
  }
}

export function validateAdminCredentials(username: string, password: string) {
  return username === expectedUsername() && password === expectedPassword();
}
