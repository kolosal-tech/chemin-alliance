import { describe, it, expect } from "vitest";
import { matchScore } from "@/lib/matching";

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
