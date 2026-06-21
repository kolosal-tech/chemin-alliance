import { randomBytes } from "node:crypto";

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

/** Token de lien magique : URL-safe, non devinable (256 bits). */
export function generateBlessingToken(): string {
  return randomBytes(32).toString("base64url");
}

/** Décision du parrain -> statut de bénédiction. */
export function statusForDecision(
  decision: "bless" | "caution",
): "BLESSED" | "CAUTION" {
  return decision === "bless" ? "BLESSED" : "CAUTION";
}
