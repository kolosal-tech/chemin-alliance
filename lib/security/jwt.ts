import { SignJWT, jwtVerify } from "jose";
import { env } from "@/lib/env";

const SECRET = new TextEncoder().encode(env.JWT_SECRET);
const ISSUER = "chemin-alliance";
const AUDIENCE = "chemin-alliance-web";
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
    .setAudience(AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(SECRET);
}

export async function verifySession(
  token: string,
): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET, {
      issuer: ISSUER,
      audience: AUDIENCE,
      algorithms: ["HS256"],
    });
    if (typeof payload.sub !== "string") return null;
    const sv = Number(payload.sv);
    if (!Number.isInteger(sv) || sv < 0) return null;
    return {
      sub: payload.sub,
      role: payload.role === "ADMIN" ? "ADMIN" : "USER",
      sessionVersion: sv,
    };
  } catch {
    return null;
  }
}

function allowsLocalInsecureE2eCookie(): boolean {
  if (
    process.env.CI !== "true" ||
    process.env.E2E_MANAGED_FIXTURES !== "1" ||
    process.env.E2E_LOCAL_INSECURE_COOKIE !== "1"
  ) {
    return false;
  }

  try {
    const appUrl = new URL(process.env.APP_URL ?? "");
    return (
      appUrl.protocol === "http:" &&
      ["localhost", "127.0.0.1", "[::1]"].includes(appUrl.hostname)
    );
  } catch {
    return false;
  }
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    // Assouplissement limité au bundle de production Playwright exécuté en
    // CI sur une boucle locale HTTP et une base de fixtures explicitement gérée.
    secure:
      process.env.NODE_ENV === "production" && !allowsLocalInsecureE2eCookie(),
    sameSite: "lax" as const,
    path: "/",
    maxAge: SESSION_MAX_AGE,
  };
}
