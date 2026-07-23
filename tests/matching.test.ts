import { describe, it, expect } from "vitest";
import {
  activeMatchGrantsProfileVisibility,
  matchRequestRejection,
  matchScore,
} from "@/lib/matching";
import { buildMatchProfileView } from "@/lib/match-profile";

// Epoch fixe -> activityScore déterministe (pas de dépendance à l'horloge).
const NOW = 1_700_000_000_000;
const fresh = new Date(NOW); // 0 jour -> activité maximale
const stale = new Date(NOW - 200 * 86_400_000); // >60 jours -> activité faible

type Cand = Parameters<typeof matchScore>[0];

function cand(o: {
  vertical?: string;
  denomination?: string | null;
  engagementFrequency?: string | null;
  intention?: boolean;
  familyVision?: boolean;
  wantsChildren?: boolean | null;
  hasChildren?: boolean;
  acceptsChildren?: boolean | null;
  city?: string | null;
  country?: string | null;
  updatedAt?: Date;
  noFaith?: boolean;
  noRel?: boolean;
}): Cand {
  return {
    id: o.denomination ?? o.vertical ?? "u",
    cityApprox: o.city ?? null,
    country: o.country ?? null,
    updatedAt: o.updatedAt ?? fresh,
    faithProfile: o.noFaith
      ? null
      : {
          vertical: o.vertical ?? "CHRISTIAN_EVANGELICAL",
          denomination: o.denomination ?? null,
          engagementFrequency: o.engagementFrequency ?? null,
        },
    relationshipProfile: o.noRel
      ? null
      : {
          intentionStatement: o.intention ? "Fonder un foyer chrétien" : null,
          familyVisionEncrypted: o.familyVision ? "enc" : null,
          wantsChildren: o.wantsChildren ?? null,
          hasChildren: o.hasChildren ?? false,
          acceptsChildren: o.acceptsChildren ?? null,
        },
  } as unknown as Cand;
}

const STRONG = {
  denomination: "Baptiste",
  engagementFrequency: "hebdomadaire",
  intention: true,
  familyVision: true,
  wantsChildren: true,
  city: "Ouagadougou",
  country: "BF",
};

function requestUser(
  over: Partial<Parameters<typeof matchRequestRejection>[0]> = {},
): NonNullable<Parameters<typeof matchRequestRejection>[0]> {
  return {
    id: "user",
    deletedAt: null,
    season: "JOURNEY",
    isVerified: true,
    gender: "M",
    photoUrl: "/portrait.jpg",
    onboardingDoneAt: new Date(),
    cityApprox: "Ouagadougou",
    faithProfile: {
      denomination: "Baptiste",
      engagementFrequency: "weekly",
    },
    relationshipProfile: {
      intentionStatement: "Fonder un foyer chrétien",
      wantsChildren: true,
      interests: "Lecture",
      personality: "Calme",
      aspirations: "Servir",
    },
    privacySettings: {
      antiMalaiseEnabled: false,
      invisibleMode: false,
    },
    ...over,
  };
}

describe("demande directe - garde d'éligibilité", () => {
  it.each([
    ["supprimée", { deletedAt: new Date() }],
    ["non vérifiée", { isVerified: false }],
    ["hors JOURNEY", { season: "ENGAGED" as const }],
    ["sans ville", { cityApprox: null }],
    ["sans intention", { relationshipProfile: null }],
  ])("rejette une cible %s", (_label, targetOverride) => {
    expect(
      matchRequestRejection(
        requestUser({ id: "actor" }),
        requestUser({ id: "target", gender: "F", ...targetOverride }),
        { hasBlock: false, hasActiveReport: false },
      ),
    ).toBe("TARGET_NOT_ELIGIBLE");
  });

  it("rejette une cible en mode invisible sans révéler la raison", () => {
    const actor = requestUser({ id: "actor" });
    const target = requestUser({
      id: "target",
      gender: "F",
      privacySettings: {
        antiMalaiseEnabled: false,
        invisibleMode: true,
      },
    });

    expect(
      matchRequestRejection(actor, target, {
        hasBlock: false,
        hasActiveReport: false,
      }),
    ).toBe("TARGET_NOT_ELIGIBLE");
  });

  it("rejette un blocage dans l'un ou l'autre sens", () => {
    expect(
      matchRequestRejection(
        requestUser({ id: "actor" }),
        requestUser({ id: "target", gender: "F" }),
        { hasBlock: true, hasActiveReport: false },
      ),
    ).toBe("TARGET_NOT_ELIGIBLE");
  });

  it("rejette un signalement actif pertinent pour la paire", () => {
    expect(
      matchRequestRejection(
        requestUser({ id: "actor" }),
        requestUser({ id: "target", gender: "F" }),
        { hasBlock: false, hasActiveReport: true },
      ),
    ).toBe("TARGET_NOT_ELIGIBLE");
  });

  it("applique l'anti-malaise dès que l'un des deux l'active", () => {
    expect(
      matchRequestRejection(
        requestUser({
          id: "actor",
          privacySettings: {
            antiMalaiseEnabled: true,
            invisibleMode: false,
          },
        }),
        requestUser({ id: "target", gender: "F" }),
        { hasBlock: false, hasActiveReport: false },
      ),
    ).toBe("TARGET_NOT_ELIGIBLE");
  });

  it("rejette également un auteur inéligible", () => {
    expect(
      matchRequestRejection(
        requestUser({ id: "actor", isVerified: false }),
        requestUser({ id: "target", gender: "F" }),
        { hasBlock: false, hasActiveReport: false },
      ),
    ).toBe("ACTOR_NOT_ELIGIBLE");
  });

  it("rejette le contournement du filtre de genre et d'un profil déjà passé", () => {
    const actor = requestUser({ id: "actor", gender: "M" });
    const sameGenderTarget = requestUser({ id: "target", gender: "M" });
    const oppositeGenderTarget = requestUser({ id: "target", gender: "F" });

    expect(
      matchRequestRejection(actor, sameGenderTarget, {
        hasBlock: false,
        hasActiveReport: false,
      }),
    ).toBe("TARGET_NOT_ELIGIBLE");
    expect(
      matchRequestRejection(actor, oppositeGenderTarget, {
        hasBlock: false,
        hasActiveReport: false,
        actorPassedTarget: true,
      }),
    ).toBe("TARGET_NOT_ELIGIBLE");
  });

  it("respecte aussi le gate de profil fort lorsqu'il est activé", () => {
    expect(
      matchRequestRejection(
        requestUser({ id: "actor" }),
        requestUser({ id: "target", gender: "F" }),
        {
          hasBlock: false,
          hasActiveReport: false,
          actorProfileGateBlocked: true,
        },
      ),
    ).toBe("ACTOR_NOT_ELIGIBLE");
  });

  it("n'ouvre AFTER_MATCH que pour un Match ACTIVE, jamais PENDING", () => {
    expect(activeMatchGrantsProfileVisibility("PENDING")).toBe(false);
    expect(activeMatchGrantsProfileVisibility("ACTIVE")).toBe(true);
    expect(activeMatchGrantsProfileVisibility("CLOSED")).toBe(false);

    const pendingFields = buildMatchProfileView(
      {
        faith: null,
        relationship: {
          intentionStatement: "Fonder un foyer chrétien",
          intentionVisibility: "PUBLIC_CONTROLLED",
          hasChildren: false,
          childrenVisibility: "AFTER_MATCH",
          familyVisionEncrypted: null,
          familyVisionVisibility: "AFTER_DIALOGUE",
          interests: null,
          personality: null,
          aspirations: null,
        },
      },
      {
        matched: activeMatchGrantsProfileVisibility("PENDING"),
        stage: "DISCOVERY",
      },
    );
    expect(
      pendingFields.find((field) => field.key === "children")?.visible,
    ).toBe(false);
  });
});

describe("matchScore - score d'affinité pondéré 0..100", () => {
  it("deux profils fortement alignés et actifs atteignent 100", () => {
    const a = cand(STRONG);
    const b = cand(STRONG);
    expect(matchScore(a, b, NOW)).toBe(100);
  });

  it("profils opposés (tradition, pratique, désir d'enfants) restent bas", () => {
    const a = cand({
      vertical: "CHRISTIAN_EVANGELICAL",
      denomination: "Baptiste",
      engagementFrequency: "hebdomadaire",
      wantsChildren: true,
    });
    const b = cand({
      vertical: "CHRISTIAN_CATHOLIC",
      denomination: "Catholique romain",
      engagementFrequency: "rarement",
      wantsChildren: false,
      updatedAt: stale,
    });
    const score = matchScore(a, b, NOW);
    expect(score).toBeLessThan(35);
    expect(score).toBeLessThan(matchScore(cand(STRONG), cand(STRONG), NOW));
  });

  it("profils sans sous-profil renseigné -> score neutre médian", () => {
    const blank = cand({ noFaith: true, noRel: true });
    const score = matchScore(blank, blank, NOW);
    expect(score).toBeGreaterThanOrEqual(25);
    expect(score).toBeLessThanOrEqual(60);
  });

  it("monotone : même dénomination > dénomination différente, sinon égal", () => {
    const me = cand(STRONG);
    const same = cand(STRONG);
    const diff = cand({ ...STRONG, denomination: "Pentecôtiste" });
    expect(matchScore(me, same, NOW)).toBeGreaterThan(
      matchScore(me, diff, NOW),
    );
  });

  it("favorise un candidat actif récemment", () => {
    const me = cand(STRONG);
    const active = cand({ ...STRONG, updatedAt: fresh });
    const dormant = cand({ ...STRONG, updatedAt: stale });
    expect(matchScore(me, active, NOW)).toBeGreaterThan(
      matchScore(me, dormant, NOW),
    );
  });

  it("toujours borné 0..100 et déterministe", () => {
    const a = cand({ vertical: "OTHER" });
    const b = cand(STRONG);
    const s1 = matchScore(a, b, NOW);
    const s2 = matchScore(a, b, NOW);
    expect(s1).toBe(s2);
    expect(s1).toBeGreaterThanOrEqual(0);
    expect(s1).toBeLessThanOrEqual(100);
  });
});
