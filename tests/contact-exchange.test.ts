import { describe, expect, it } from "vitest";
import {
  canRespondToContactExchange,
  CONTACT_REQUESTABLE_STATUSES,
} from "@/lib/contact-exchange";

const pending = {
  status: "ACTIVE" as const,
  contactExchange: "REQUESTED" as const,
  contactExchangeRequestedBy: "user-a",
  userAId: "user-a",
  userBId: "user-b",
};

describe("échange de coordonnées à double consentement", () => {
  it("interdit formellement l'auto-acceptation par le demandeur", () => {
    expect(canRespondToContactExchange(pending, "user-a")).toBe(false);
  });

  it("autorise uniquement l'autre membre d'un match actif", () => {
    expect(canRespondToContactExchange(pending, "user-b")).toBe(true);
    expect(canRespondToContactExchange(pending, "intrus")).toBe(false);
    expect(
      canRespondToContactExchange({ ...pending, status: "CLOSED" }, "user-b"),
    ).toBe(false);
  });

  it("échoue fermé pour une ancienne demande sans auteur", () => {
    expect(
      canRespondToContactExchange(
        { ...pending, contactExchangeRequestedBy: null },
        "user-b",
      ),
    ).toBe(false);
  });

  it("ne permet de démarrer une demande que depuis un état non accepté", () => {
    expect(CONTACT_REQUESTABLE_STATUSES).toEqual([
      "NOT_ALLOWED",
      "AVAILABLE",
      "DECLINED",
      "REVOKED",
    ]);
    expect(CONTACT_REQUESTABLE_STATUSES).not.toContain("REQUESTED");
    expect(CONTACT_REQUESTABLE_STATUSES).not.toContain("ACCEPTED");
  });
});
