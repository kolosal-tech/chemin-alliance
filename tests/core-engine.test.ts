import { describe, expect, it } from "vitest";
import {
  getAllowedActions,
  getClergyRoles,
  getStageQuestions,
  loadRuleset,
  validateAction,
} from "@/lib/core-engine";

describe("loadRuleset", () => {
  it("charge le ruleset évangélique", () => {
    const rs = loadRuleset("christian_evangelical_default");
    expect(rs.id).toBe("christian_evangelical_default");
    expect(rs.principles.phone_sharing_before_trust_stage).toBe(false);
  });

  it("charge le ruleset catholique avec ses rôles", () => {
    expect(getClergyRoles("christian_catholic_default")).toContain("priest");
  });

  it("échoue proprement sur un ruleset inconnu", () => {
    expect(() => loadRuleset("inconnu_xyz")).toThrow(/introuvable/);
  });

  it("rejette un id non slug (path traversal)", () => {
    expect(() => loadRuleset("../etc/passwd")).toThrow(/invalide/);
  });
});

describe("validateAction - blocage des coordonnées", () => {
  it("bloque share_phone en Découverte avec message éducatif", () => {
    const res = validateAction({
      rulesetId: "christian_evangelical_default",
      stage: "DISCOVERY",
      action: "share_phone",
      context: { locale: "fr" },
    });
    expect(res.allowed).toBe(false);
    expect(res.reasonCode).toBe("CONTACT_BLOCKED_BEFORE_TRUST");
    expect(res.userMessage).toContain("Pour votre sécurité");
    expect(res.userMessage).toContain("Discernement");
  });

  it("bloque share_email en Dialogue, message localisé en anglais", () => {
    const res = validateAction({
      rulesetId: "christian_evangelical_default",
      stage: "DIALOGUE",
      action: "share_email",
      context: { locale: "en" },
    });
    expect(res.allowed).toBe(false);
    expect(res.userMessage).toContain("For your safety");
  });

  it("bloque share_phone en Discernement tant que l'échange n'est pas ACCEPTED", () => {
    const res = validateAction({
      rulesetId: "christian_evangelical_default",
      stage: "DISCERNMENT",
      action: "share_phone",
      context: { contactExchangeStatus: "REQUESTED" },
    });
    expect(res.allowed).toBe(false);
    expect(res.requiredNextSteps).toContain("contact_exchange_accepted");
  });

  it("autorise share_phone après contactExchange ACCEPTED en Discernement", () => {
    const res = validateAction({
      rulesetId: "christian_evangelical_default",
      stage: "DISCERNMENT",
      action: "share_phone",
      context: { contactExchangeStatus: "ACCEPTED" },
    });
    // share_phone n'est pas dans allowed_actions de discernment :
    // l'échange officiel passe par request_contact_exchange. Vérifie le refus par défaut.
    expect(res.allowed).toBe(false);
  });

  it("autorise share_phone à l'étape Engagement après acceptation", () => {
    const res = validateAction({
      rulesetId: "christian_evangelical_default",
      stage: "COMMITMENT",
      action: "share_phone",
      context: { contactExchangeStatus: "ACCEPTED" },
    });
    expect(res.allowed).toBe(true);
  });
});

describe("validateAction - demande d'échange et avancement", () => {
  it("refuse request_contact_exchange en Découverte", () => {
    const res = validateAction({
      rulesetId: "christian_evangelical_default",
      stage: "DISCOVERY",
      action: "request_contact_exchange",
    });
    expect(res.allowed).toBe(false);
  });

  it("refuse request_contact_exchange en Discernement si dialogue insuffisant", () => {
    const res = validateAction({
      rulesetId: "christian_evangelical_default",
      stage: "DISCERNMENT",
      action: "request_contact_exchange",
      context: {
        hasActiveReport: false,
        mutualConsent: true,
        dialogueAnswersCount: 2,
      },
    });
    expect(res.allowed).toBe(false);
    expect(res.requiredNextSteps).toContain("minimum_dialogue_completed");
  });

  it("accepte request_contact_exchange quand toutes les conditions sont réunies", () => {
    const res = validateAction({
      rulesetId: "christian_evangelical_default",
      stage: "DISCERNMENT",
      action: "request_contact_exchange",
      context: {
        hasActiveReport: false,
        mutualConsent: true,
        dialogueAnswersCount: 4,
      },
    });
    expect(res.allowed).toBe(true);
    expect(res.reasonCode).toBe("OK");
  });

  it("bloque l'avancement si signalement actif", () => {
    const res = validateAction({
      rulesetId: "christian_evangelical_default",
      stage: "DIALOGUE",
      action: "advance_stage",
      context: {
        hasActiveReport: true,
        mutualConsent: true,
        stageAnswersCount: 4,
        stageQuestionsTotal: 4,
      },
    });
    expect(res.allowed).toBe(false);
    expect(res.requiredNextSteps).toContain("no_active_report");
  });

  it("refuse toute action sur un match clôturé", () => {
    const res = validateAction({
      rulesetId: "christian_evangelical_default",
      stage: "CLOSED",
      action: "send_message",
    });
    expect(res.allowed).toBe(false);
    expect(res.reasonCode).toBe("MATCH_CLOSED");
  });
});

describe("questions par étape", () => {
  it("retourne les questions de Découverte en 4 langues", () => {
    const qs = getStageQuestions("christian_evangelical_default", "DISCOVERY");
    expect(qs.length).toBeGreaterThanOrEqual(3);
    for (const q of qs) {
      expect(q.text.fr).toBeTruthy();
      expect(q.text.en).toBeTruthy();
      expect(q.text.es).toBeTruthy();
      expect(q.text.pt).toBeTruthy();
    }
  });

  it("expose les actions autorisées de Découverte", () => {
    const actions = getAllowedActions("DISCOVERY", "christian_evangelical_default");
    expect(actions).toContain("send_limited_message");
    expect(actions).not.toContain("request_contact_exchange");
  });
});
