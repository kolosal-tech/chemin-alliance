import { createHash, randomBytes } from "node:crypto";

/**
 * Parrain / Marraine - helpers purs (testables).
 * Voir docs/superpowers/specs/2026-06-18-parrain-marraine-design.md
 */

export const SPONSOR_RELATIONS = [
  "family",
  "pastor",
  "priest",
  "friend",
] as const;
export type SponsorRelation = (typeof SPONSOR_RELATIONS)[number];

export function isSponsorRelation(v: string): v is SponsorRelation {
  return (SPONSOR_RELATIONS as readonly string[]).includes(v);
}

export const BLESSING_TOKEN_BYTES = 32;
export const BLESSING_TOKEN_TTL_MS = 72 * 60 * 60 * 1000;
export const BLESSING_DELIVERY_LEASE_MS = 10 * 60 * 1000;

const BLESSING_TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

/** Bearer de lien magique : URL-safe, non devinable (256 bits). */
export function generateBlessingToken(): string {
  return randomBytes(BLESSING_TOKEN_BYTES).toString("base64url");
}

/** Rejette les paramètres aberrants avant tout accès à la base. */
export function isBlessingToken(value: string): boolean {
  return BLESSING_TOKEN_PATTERN.test(value);
}

/** Empreinte persistable du bearer. Le token brut ne doit jamais être stocké. */
export function hashBlessingToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function blessingTokenExpiresAt(now: Date): Date {
  return new Date(now.getTime() + BLESSING_TOKEN_TTL_MS);
}

/** Décision du parrain -> statut de bénédiction. */
export function statusForDecision(
  decision: "bless" | "caution",
): "BLESSED" | "CAUTION" {
  return decision === "bless" ? "BLESSED" : "CAUTION";
}
