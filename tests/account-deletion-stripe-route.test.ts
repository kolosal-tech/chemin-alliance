import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireUser: vi.fn(),
  eraseStripe: vi.fn(),
  deletePhotos: vi.fn(),
  hashPassword: vi.fn(),
  eraseAccount: vi.fn(),
  userUpdate: vi.fn(),
}));

vi.mock("@/lib/security/session", () => ({
  requireUser: mocks.requireUser,
  requireAuthenticatedUser: mocks.requireUser,
}));
vi.mock("@/lib/payments/stripe-erasure", () => ({
  eraseLinkedStripeCustomer: mocks.eraseStripe,
}));
vi.mock("@/lib/storage", () => ({
  deleteProfilePhotoObjects: mocks.deletePhotos,
  photoProxyUrl: vi.fn((value) => value),
}));
vi.mock("@/lib/security/password", () => ({
  hashPassword: mocks.hashPassword,
}));
vi.mock("@/lib/account-deletion", () => ({
  eraseAccountData: mocks.eraseAccount,
}));
vi.mock("@/lib/security/crypto", () => ({
  decryptOptional: vi.fn(),
}));
vi.mock("@/lib/security/jwt", () => ({
  SESSION_COOKIE: "ca_session",
}));
vi.mock("@/lib/db", () => ({
  prisma: { user: { update: mocks.userUpdate } },
}));

import { DELETE } from "@/app/api/me/route";

describe("DELETE /api/me avec lien Stripe", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireUser.mockResolvedValue({
      id: "user_1",
      stripeCustomerId: "cus_1",
      photoUrl: "user_1/photo.webp",
    });
    mocks.eraseStripe.mockResolvedValue("DELETED");
    mocks.deletePhotos.mockResolvedValue(true);
    mocks.hashPassword.mockResolvedValue("anonymous-password-hash");
    mocks.eraseAccount.mockResolvedValue(undefined);
  });

  it("respecte l'ordre Stripe, stockage, puis pseudonymisation locale", async () => {
    const response = await DELETE();
    expect(response.status).toBe(200);
    expect(mocks.eraseStripe).toHaveBeenCalledWith("cus_1");
    expect(mocks.deletePhotos).toHaveBeenCalledWith("user_1/photo.webp");
    expect(mocks.eraseAccount).toHaveBeenCalledWith(
      "user_1",
      "anonymous-password-hash",
    );
    expect(mocks.eraseStripe.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.deletePhotos.mock.invocationCallOrder[0],
    );
    expect(mocks.deletePhotos.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.eraseAccount.mock.invocationCallOrder[0],
    );
    expect(response.headers.get("set-cookie")).toContain("ca_session=;");
    await expect(response.json()).resolves.toEqual({
      ok: true,
      deleted: true,
    });
  });

  it("échoue fermé avant tout effacement local si Stripe échoue", async () => {
    mocks.eraseStripe.mockRejectedValue(new Error("Stripe unavailable"));
    const response = await DELETE();
    expect(response.status).toBe(502);
    expect(mocks.deletePhotos).not.toHaveBeenCalled();
    expect(mocks.hashPassword).not.toHaveBeenCalled();
    expect(mocks.eraseAccount).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toEqual({
      error: "ACCOUNT_DELETION_INCOMPLETE",
    });
  });

  it("ne pseudonymise pas si le stockage échoue après Stripe", async () => {
    mocks.deletePhotos.mockResolvedValue(false);
    const response = await DELETE();
    expect(response.status).toBe(502);
    expect(mocks.eraseStripe).toHaveBeenCalledOnce();
    expect(mocks.hashPassword).not.toHaveBeenCalled();
    expect(mocks.eraseAccount).not.toHaveBeenCalled();
  });

  it.each(["NOT_LINKED", "ALREADY_DELETED"])(
    "poursuit sans répétition destructive pour le résultat %s",
    async (result) => {
      mocks.eraseStripe.mockResolvedValue(result);
      const response = await DELETE();
      expect(response.status).toBe(200);
      expect(mocks.eraseAccount).toHaveBeenCalledOnce();
    },
  );
});
