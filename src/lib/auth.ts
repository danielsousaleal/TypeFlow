import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import type { User } from "./types";

const COOKIE_NAME = "typeflow_session";
const SESSION_DAYS = 30;

function getSecret() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error("AUTH_SECRET precisa estar configurado.");
  }
  return new TextEncoder().encode(secret);
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export async function createSessionToken(user: User) {
  return new SignJWT({ nick: user.nick })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(String(user.id))
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(getSecret());
}

export async function setSessionCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export async function getSessionUser(): Promise<User | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, getSecret());
    const id = Number(payload.sub);
    const nick = typeof payload.nick === "string" ? payload.nick : null;

    if (!Number.isFinite(id) || !nick) return null;
    return { id, nick };
  } catch {
    return null;
  }
}

export function validateCredentials(nick: string, password: string) {
  const cleanNick = nick.trim();

  if (cleanNick.length < 3 || cleanNick.length > 24) {
    return "O nick precisa ter entre 3 e 24 caracteres.";
  }

  if (!/^[a-zA-Z0-9_\-.]+$/.test(cleanNick)) {
    return "Use apenas letras, números, _ . e - no nick.";
  }

  if (password.length < 4 || password.length > 72) {
    return "A senha precisa ter entre 4 e 72 caracteres.";
  }

  return null;
}
