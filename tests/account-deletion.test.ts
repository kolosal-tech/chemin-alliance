import { describe, expect, it } from "vitest";
import { deletedUserData } from "@/lib/account-deletion";

describe("pseudonymisation d'un compte supprimé", () => {
  it("efface tous les identifiants directs, jetons et états de profil", () => {
    const data = deletedUserData({
      passwordHash: "new-random-hash",
      now: new Date("2026-07-23T08:00:00.000Z"),
      emailNonce: "random-nonce",
    });

    expect(data).toMatchObject({
      email: "deleted-random-nonce@deleted.invalid",
      displayName: "Membre retiré",
      age: 18,
      gender: null,
      passwordHash: "new-random-hash",
      isVerified: false,
      emailVerifyToken: null,
      emailVerifyExpires: null,
      passwordResetToken: null,
      passwordResetExpires: null,
      photoUrl: null,
      photoBlurhash: null,
      cityApprox: null,
      country: null,
      phone: null,
      phoneVerified: false,
      stripeCustomerId: null,
      subscriptionStatus: null,
      onboardingDoneAt: null,
    });
    expect(data.sessionVersion).toEqual({ increment: 1 });
  });
});
