import { SignJWT, jwtVerify } from "jose";
import { env } from "@/lib/env";

const SECRET = new TextEncoder().encode(env.JWT_SECRET);
const ISSUER = "chemin-alliance";
export const SESSION_COOKIE = "ca_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 jours

export type SessionPayload = {
  sub: string; // user id
  role: "USER" | "ADMIN";
};

export async function signSession(payload: SessionPayload): Promise<string> {
  return new SignJWT({ role: payload.role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuer(ISSUER)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(SECRET);
}

export async function verifySession(
  token: string,
): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET, { issuer: ISSUER });
    if (typeof payload.sub !== "string") return null;
    return {
      sub: payload.sub,
      role: payload.role === "ADMIN" ? "ADMIN" : "USER",
    };
  } catch {
    return null;
  }
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: SESSION_MAX_AGE,
  };
}
