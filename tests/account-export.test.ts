import { describe, expect, it } from "vitest";
import {
  buildAccountExport,
  EXPORT_COLLECTION_LIMIT,
  type AccountExportSource,
} from "@/lib/account-export";
import { sealAllianceAnswer } from "@/lib/alliance-answer";
import { sealInsight } from "@/lib/agent-insight";
import { encryptField } from "@/lib/security/crypto";

const NOW = new Date("2026-07-23T12:00:00.000Z");

function source(): AccountExportSource {
  return {
    account: {
      id: "me",
      email: "me@example.test",
      displayName: "Membre",
      age: 34,
      gender: "F",
      role: "USER",
      kind: "HUMAN",
      locale: "fr",
      rulesetId: "rules",
      season: "JOURNEY",
      isVerified: true,
      photoUrl: "/profile/photo.jpg",
      photoBlurredByDefault: true,
      photoBlurhash: "blurhash",
      cityApprox: "Paris",
      country: "France",
      phone: "+33123456789",
      phoneVerified: true,
      stripeCustomerId: "cus_own",
      subscriptionStatus: "active",
      lastDevotionDate: NOW,
      currentStreak: 3,
      longestStreak: 8,
      onboardingDoneAt: NOW,
      deletedAt: null,
      createdAt: NOW,
      updatedAt: NOW,
    },
    faithProfile: {
      vertical: "CHRISTIAN_EVANGELICAL",
      denomination: "Test",
      ministry: "Accueil",
      engagementFrequency: "weekly",
      localChurchEncrypted: encryptField("Église locale"),
      localChurchVisibility: "AFTER_DISCERNMENT",
      testimonyEncrypted: encryptField("Témoignage privé"),
      testimonyVisibility: "AFTER_MATCH",
    },
    relationshipProfile: {
      maritalStatus: "single",
      hasChildren: false,
      childrenVisibility: "AFTER_MATCH",
      wantsChildren: true,
      acceptsChildren: true,
      familyVisionEncrypted: encryptField("Vision familiale"),
      familyVisionVisibility: "AFTER_DIALOGUE",
      intentionStatement: "Construire un foyer",
      intentionVisibility: "PUBLIC_CONTROLLED",
      interests: "Lecture",
      personality: "Calme",
      aspirations: "Servir",
    },
    privacySettings: {
      antiMalaiseEnabled: true,
      antiMalaiseRadiusKm: 25,
      invisibleMode: false,
      fieldVisibility: { city: "PRIVATE" },
    },
    consents: [
      {
        id: "consent-1",
        type: "SENSITIVE_DATA_PROCESSING",
        version: null,
        purpose: null,
        recipient: null,
        grantedAt: NOW,
        revokedAt: null,
      },
      {
        id: "consent-ai",
        type: "AI_COACH_INTERACTION",
        version: "ai-coach-interactive-2026-07-23.v1",
        purpose: "INTERACTIVE_DISCERNMENT_SUPPORT",
        recipient: "ACTIVE_AI_PROVIDER_ANTHROPIC_OPENROUTER_OR_OPENAI",
        grantedAt: NOW,
        revokedAt: null,
      },
    ],
    matches: [
      {
        id: "match-1",
        userAId: "me",
        userBId: "other",
        userA: { id: "me", displayName: "Membre" },
        userB: { id: "other", displayName: "Autre" },
        stage: "DIALOGUE",
        status: "ACTIVE",
        compatibilityJson: { faith: "aligned" },
        contactExchange: "REQUESTED",
        contactExchangeRequestedBy: "other",
        advanceRequestedBy: "me",
        requestedById: "me",
        closedBy: null,
        closeMessage: null,
        createdAt: NOW,
        updatedAt: NOW,
        lastReadAtUserA: NOW,
        lastReadAtUserB: null,
      },
    ],
    matchMessages: [
      {
        id: "message-1",
        matchId: "match-1",
        senderId: "other",
        contentEncrypted: encryptField("Message reçu"),
        kind: "USER",
        moderationStatus: "SAFE",
        blockedReason: "must-not-leak-for-received",
        createdAt: NOW,
      },
    ],
    allianceAnswers: [
      {
        id: "answer-1",
        matchId: "match-1",
        stage: "DIALOGUE",
        questionId: "q1",
        ...sealAllianceAnswer("Réponse Alliance"),
        createdAt: NOW,
      },
      {
        id: "answer-legacy",
        matchId: "match-1",
        stage: "DISCOVERY",
        questionId: "q0",
        answerEncrypted: null,
        answerLegacy: "Réponse historique",
        createdAt: NOW,
      },
    ],
    coachMessages: [
      {
        id: "coach-1",
        mode: "individual",
        role: "user",
        contentEncrypted: encryptField("Question au coach"),
        guardrail: false,
        createdAt: NOW,
      },
    ],
    agentInsights: [
      {
        id: "insight-1",
        matchId: "match-1",
        coupleSpaceId: null,
        agentId: "stage-review",
        kind: "STAGE_REVIEW",
        dataJson: sealInsight({ summary: "Bilan chiffré" }),
        visibility: "PRIVATE",
        createdAt: NOW,
        revokedAt: null,
      },
      {
        id: "insight-legacy",
        matchId: null,
        coupleSpaceId: null,
        agentId: "legacy",
        kind: "PORTRAIT",
        dataJson: { summary: "Bilan historique" },
        visibility: "PRIVATE",
        createdAt: NOW,
        revokedAt: null,
      },
    ],
    coupleSpace: {
      id: "space-1",
      userAId: "me",
      userBId: "partner",
      userA: { id: "me", displayName: "Membre" },
      userB: { id: "partner", displayName: "Partenaire" },
      status: "ACTIVE",
      origin: "MATCH",
      matchId: "match-1",
      season: "MARRIED",
      marriedAt: NOW,
      createdAt: NOW,
      updatedAt: NOW,
    },
    coupleMessages: [
      {
        id: "couple-message-1",
        spaceId: "space-1",
        senderId: "me",
        contentEncrypted: encryptField("Message couple"),
        createdAt: NOW,
      },
    ],
    gameRounds: [
      {
        id: "round-1",
        matchId: "match-1",
        coupleSpaceId: null,
        mode: "SHARED",
        questionKey: "q-game",
        questionText: null,
        initiatorId: "me",
        status: "REVEALED",
        createdAt: NOW,
        revealedAt: NOW,
        answers: [
          {
            id: "submission-1",
            answerEncrypted: encryptField("Ma réponse de jeu"),
            guessEncrypted: null,
            createdAt: NOW,
          },
        ],
      },
    ],
    sponsor: {
      name: "Parrain",
      email: "parrain@example.test",
      relation: "pastor",
      createdAt: NOW,
      blessings: [
        {
          id: "blessing-1",
          matchId: "match-1",
          status: "BLESSED",
          noteEncrypted: encryptField("Note de bénédiction"),
          createdAt: NOW,
          respondedAt: NOW,
        },
      ],
    },
    blocksMade: [
      {
        id: "block-1",
        createdAt: NOW,
        other: { id: "blocked", displayName: "Profil bloqué" },
      },
    ],
    passesMade: [
      {
        id: "pass-1",
        createdAt: NOW,
        other: { id: "passed", displayName: "Profil passé" },
      },
    ],
    bookings: [
      {
        id: "booking-1",
        slotStart: NOW,
        status: "CONFIRMED",
        createdAt: NOW,
        coach: {
          id: "coach-public",
          displayName: "Coach",
          affiliation: "Cabinet",
          specialties: ["couple"],
          pricePerSessionEUR: 75,
        },
      },
    ],
    reportsMade: [
      {
        id: "report-made",
        reason: "Comportement",
        status: "OPEN",
        createdAt: NOW,
        resolvedAt: null,
        target: { id: "target", displayName: "Profil signalé" },
      },
    ],
    reportsReceived: [
      {
        id: "report-received",
        status: "REVIEWING",
        createdAt: NOW,
        resolvedAt: null,
      },
    ],
    aiCoachUsages: [{ day: NOW, count: 2 }],
    phoneVerifications: [
      { id: "phone-1", expiresAt: NOW, attempts: 1, createdAt: NOW },
    ],
    restrictedThirdPartyCounts: { blocksReceived: 1, passesReceived: 2 },
    registeredPushDevices: 3,
  };
}

describe("buildAccountExport", () => {
  it("exporte toutes les catégories autorisées et déchiffre leurs contenus", () => {
    const result = buildAccountExport(source(), NOW);

    expect(result.export.complete).toBe(true);
    expect(result.faithProfile?.testimony).toBe("Témoignage privé");
    expect(result.relationshipProfile?.familyVision).toBe("Vision familiale");
    expect(result.matchMessages[0]).toMatchObject({
      direction: "received",
      content: "Message reçu",
      blockedReason: null,
    });
    expect(result.allianceAnswers.map((row) => row.answer)).toEqual([
      "Réponse Alliance",
      "Réponse historique",
    ]);
    expect(result.coachAi.messages[0].content).toBe("Question au coach");
    expect(result.consents).toContainEqual(
      expect.objectContaining({
        id: "consent-ai",
        type: "AI_COACH_INTERACTION",
        version: "ai-coach-interactive-2026-07-23.v1",
        purpose: "INTERACTIVE_DISCERNMENT_SUPPORT",
        recipient: "ACTIVE_AI_PROVIDER_ANTHROPIC_OPENROUTER_OR_OPENAI",
      }),
    );
    expect(result.agentInsights.map((row) => row.storageFormat)).toEqual([
      "encrypted",
      "legacy",
    ]);
    expect(result.couple?.messages[0].content).toBe("Message couple");
    expect(result.games[0].mySubmission?.answer).toBe("Ma réponse de jeu");
    expect(result.sponsor?.blessings[0].note).toBe("Note de bénédiction");
    expect(result.reports.received[0]).toMatchObject({
      detailsWithheldToProtectThirdParties: true,
    });
    expect(result.securityActivity.registeredPushDevices).toBe(3);
  });

  it("ne propage aucun hash, jeton, secret push ou ciphertext", () => {
    const input = source() as AccountExportSource & {
      account: AccountExportSource["account"] & Record<string, unknown>;
      coupleSpace: NonNullable<AccountExportSource["coupleSpace"]> &
        Record<string, unknown>;
      sponsor: NonNullable<AccountExportSource["sponsor"]> &
        Record<string, unknown>;
    };
    input.account.passwordHash = "password-hash-secret";
    input.account.emailVerifyToken = "email-token-secret";
    input.account.passwordResetToken = "reset-token-secret";
    input.account.sessionVersion = 42;
    input.account.pushSubscription = {
      endpoint: "push-endpoint-secret",
      p256dh: "push-key-secret",
      auth: "push-auth-secret",
    };
    input.coupleSpace!.inviteCode = "couple-invite-secret";
    input.coupleSpace!.inviteCodeHash = "couple-invite-hash-secret";
    input.coupleSpace!.inviteEmailHash = "couple-email-hash-secret";
    input.sponsor!.tokenHash = "blessing-token-hash-secret";

    const serialized = JSON.stringify(buildAccountExport(input, NOW));
    for (const forbidden of [
      "password-hash-secret",
      "email-token-secret",
      "reset-token-secret",
      "push-endpoint-secret",
      "push-key-secret",
      "push-auth-secret",
      "couple-invite-secret",
      "couple-invite-hash-secret",
      "couple-email-hash-secret",
      "blessing-token-hash-secret",
    ]) {
      expect(serialized).not.toContain(forbidden);
    }
    expect(serialized).not.toContain(input.matchMessages[0].contentEncrypted);
    expect(serialized).not.toContain(input.allianceAnswers[0].answerEncrypted!);
  });

  it("annonce honnêtement une collection tronquée", () => {
    const input = source();
    input.consents = Array.from(
      { length: EXPORT_COLLECTION_LIMIT + 1 },
      (_, index) => ({
        id: `consent-${index}`,
        type: "TERMS_OF_SERVICE",
        version: null,
        purpose: null,
        recipient: null,
        grantedAt: NOW,
        revokedAt: null,
      }),
    );

    const result = buildAccountExport(input, NOW);
    expect(result.consents).toHaveLength(EXPORT_COLLECTION_LIMIT);
    expect(result.export.complete).toBe(false);
    expect(result.export.collections.consents).toEqual({
      exported: EXPORT_COLLECTION_LIMIT,
      truncated: true,
      limit: EXPORT_COLLECTION_LIMIT,
    });
  });

  it("signale un ciphertext corrompu sans l'exposer ni prétendre être complet", () => {
    const input = source();
    input.coachMessages[0].contentEncrypted = "ciphertext.corrompu.invalide";

    const result = buildAccountExport(input, NOW);
    expect(result.coachAi.messages[0].content).toBeNull();
    expect(result.export.complete).toBe(false);
    expect(result.export.integrityIssues).toEqual([
      "coachAi.messages.coach-1.content",
    ]);
    expect(JSON.stringify(result)).not.toContain(
      "ciphertext.corrompu.invalide",
    );
  });
});
