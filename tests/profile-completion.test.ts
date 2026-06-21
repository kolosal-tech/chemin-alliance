import { describe, it, expect } from "vitest";
import {
  profileCompletion,
  sectionDone,
  matchingGateBlocked,
  PROFILE_SECTIONS,
  type CompletionInput,
} from "@/lib/profile-completion";

const empty: CompletionInput = {
  isVerified: false,
  photoUrl: null,
  cityApprox: null,
  faithProfile: null,
  relationshipProfile: null,
};

const full: CompletionInput = {
  isVerified: true,
  photoUrl: "https://x/p.png",
  cityApprox: "Lyon",
  faithProfile: { denomination: "Évangélique", engagementFrequency: null },
  relationshipProfile: {
    intentionStatement: "Avancer avec vérité.",
    wantsChildren: true,
    interests: "Randonnée",
    personality: null,
    aspirations: null,
  },
};

describe("profileCompletion - agrégat", () => {
  it("profil vide : 0 %, rien fait, tout manquant", () => {
    const c = profileCompletion(empty);
    expect(c.percent).toBe(0);
    expect(c.done).toBe(0);
    expect(c.isComplete).toBe(false);
    expect(c.missing).toEqual([...PROFILE_SECTIONS]);
  });

  it("profil complet : 100 %, isComplete, rien ne manque", () => {
    const c = profileCompletion(full);
    expect(c.percent).toBe(100);
    expect(c.done).toBe(c.total);
    expect(c.isComplete).toBe(true);
    expect(c.missing).toEqual([]);
  });

  it("partiel (ville + intention + vérifié) : 3/7, arrondi 43 %", () => {
    const c = profileCompletion({
      ...empty,
      isVerified: true,
      cityApprox: "Paris",
      relationshipProfile: {
        intentionStatement: "Un projet clair.",
        wantsChildren: null,
        interests: null,
        personality: null,
        aspirations: null,
      },
    });
    expect(c.done).toBe(3);
    expect(c.percent).toBe(43);
    expect(c.missing).toEqual(["photo", "faith", "family", "aboutMe"]);
  });
});

describe("sectionDone - règles par section", () => {
  it("blancs/espaces comptés comme manquants", () => {
    expect(sectionDone("city", { ...empty, cityApprox: "   " })).toBe(false);
    expect(
      sectionDone("intention", {
        ...empty,
        relationshipProfile: {
          ...full.relationshipProfile!,
          intentionStatement: "",
        },
      }),
    ).toBe(false);
  });

  it("family : répondre wantsChildren=false suffit (≠ null)", () => {
    const rp = { ...full.relationshipProfile!, wantsChildren: false };
    expect(sectionDone("family", { ...empty, relationshipProfile: rp })).toBe(
      true,
    );
    const rpNull = { ...full.relationshipProfile!, wantsChildren: null };
    expect(
      sectionDone("family", { ...empty, relationshipProfile: rpNull }),
    ).toBe(false);
  });

  it("faith : dénomination OU fréquence d'engagement", () => {
    expect(
      sectionDone("faith", {
        ...empty,
        faithProfile: {
          denomination: null,
          engagementFrequency: "Hebdomadaire",
        },
      }),
    ).toBe(true);
    expect(
      sectionDone("faith", {
        ...empty,
        faithProfile: { denomination: null, engagementFrequency: null },
      }),
    ).toBe(false);
  });

  it("aboutMe : un seul des trois champs suffit", () => {
    const rp = {
      intentionStatement: null,
      wantsChildren: null,
      interests: null,
      personality: "Calme",
      aspirations: null,
    };
    expect(sectionDone("aboutMe", { ...empty, relationshipProfile: rp })).toBe(
      true,
    );
  });
});

describe("matchingGateBlocked - gate fort = profil complet ET onboarding", () => {
  const complete = profileCompletion(full);
  const incomplete = profileCompletion(empty);

  it("flag OFF : jamais bloqué (même profil vide, onboarding non fait)", () => {
    expect(
      matchingGateBlocked({
        gateEnabled: false,
        completion: incomplete,
        onboardingDone: false,
      }),
    ).toBe(false);
  });

  it("flag ON + complet + onboarding fait : pas bloqué", () => {
    expect(
      matchingGateBlocked({
        gateEnabled: true,
        completion: complete,
        onboardingDone: true,
      }),
    ).toBe(false);
  });

  it("flag ON + complet mais onboarding NON fait : bloqué", () => {
    expect(
      matchingGateBlocked({
        gateEnabled: true,
        completion: complete,
        onboardingDone: false,
      }),
    ).toBe(true);
  });

  it("flag ON + onboarding fait mais profil incomplet : bloqué", () => {
    expect(
      matchingGateBlocked({
        gateEnabled: true,
        completion: incomplete,
        onboardingDone: true,
      }),
    ).toBe(true);
  });
});
