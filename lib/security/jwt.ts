import { SignJWT, jwtVerify } from "jose";
import { env } from "@/lib/env";

const SECRET = new TextEncoder().encode(env.JWT_SECRET);
const ISSUER = "chemin-alliance";
export const SESSION_COOKIE = "ca_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 jours

export type SessionPayload = {
  sub: string; // user id
  role: "USER" | "ADMIN";
  // Version de session (User.sessionVersion). Doit correspondre à la valeur en DB
  // (vérifié dans getSessionUser) sinon la session est révoquée. Incrémentée à
  // chaque changement/reset de mot de passe pour tuer les jetons déjà émis.
  sessionVersion: number;
};

export async function signSession(payload: SessionPayload): Promise<string> {
  return new SignJWT({ role: payload.role, sv: payload.sessionVersion })
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
    // Jetons émis avant l'introduction du claim `sv` n'ont pas cette valeur :
    // on les traite comme sessionVersion 0 (== défaut DB) pour rester tolérant.
    const sv = Number(payload.sv);
    return {
      sub: payload.sub,
      role: payload.role === "ADMIN" ? "ADMIN" : "USER",
      sessionVersion: Number.isFinite(sv) ? sv : 0,
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
