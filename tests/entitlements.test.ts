import { describe, it, expect } from "vitest";
import {
  FREE_FOREVER,
  PREMIUM_FEATURES,
  isFreeForever,
  isPremium,
  assertGatable,
  canAccess,
} from "@/lib/payments/entitlements";

describe("entitlements - garde anti-dark-pattern", () => {
  it("FREE_FOREVER et PREMIUM sont disjoints", () => {
    const free = new Set<string>(FREE_FOREVER);
    for (const f of PREMIUM_FEATURES) expect(free.has(f)).toBe(false);
  });

  it("contraintes fondatrices gratuites à vie", () => {
    for (const f of [
      "block_user",
      "report_user",
      "delete_account",
      "basic_filters",
    ]) {
      expect(isFreeForever(f)).toBe(true);
    }
  });

  it("sécurité et RGPD jamais payants", () => {
    for (const f of [
      "guardian_checkin",
      "emergency_resources",
      "exit_helper",
      "export_data",
      "consent_management",
      "contact_privacy",
    ]) {
      expect(isFreeForever(f)).toBe(true);
      expect(isPremium(f)).toBe(false);
    }
  });

  it("gratuit à vie -> accessible quel que soit le palier", () => {
    for (const f of FREE_FOREVER) {
      expect(canAccess(f, "free")).toBe(true);
      expect(canAccess(f, "active")).toBe(true);
    }
  });

  it("premium -> requiert un abonnement actif", () => {
    for (const f of PREMIUM_FEATURES) {
      expect(canAccess(f, "free")).toBe(false);
      expect(canAccess(f, "active")).toBe(true);
    }
  });

  it("feature inconnue -> fail-open (jamais verrouiller par erreur)", () => {
    expect(canAccess("feature_inconnue", "free")).toBe(true);
  });

  it("assertGatable lève sur une feature gratuite à vie", () => {
    expect(() => assertGatable("block_user")).toThrow(/GRATUIT À VIE/);
    expect(() => assertGatable("report_user")).toThrow();
    expect(() => assertGatable("delete_account")).toThrow();
    expect(() => assertGatable("pass_user")).toThrow(/GRATUIT À VIE/);
  });

  it("assertGatable accepte une feature premium", () => {
    expect(() => assertGatable("unlimited_ai_coach")).not.toThrow();
    expect(() => assertGatable("premium_llm_tier")).not.toThrow();
  });
});
