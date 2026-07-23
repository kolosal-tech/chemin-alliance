import { beforeEach, describe, expect, it, vi } from "vitest";
import { MAX_PROFILE_PHOTO_REQUEST_BYTES } from "@/lib/profile-photo";

const mocks = vi.hoisted(() => ({
  requireUser: vi.fn(),
  rateLimit: vi.fn(),
  userUpdate: vi.fn(),
  uploadProfilePhoto: vi.fn(),
}));

vi.mock("@/lib/security/session", () => ({
  requireUser: mocks.requireUser,
}));

vi.mock("@/lib/security/rate-limit", () => ({
  rateLimit: mocks.rateLimit,
  LIMITS: { unread: { limit: 10, windowMs: 60_000 } },
}));

vi.mock("@/lib/db", () => ({
  prisma: { user: { update: mocks.userUpdate } },
}));

vi.mock("@/lib/storage", () => ({
  blurredVariantPath: vi.fn(),
  photoProxyUrl: vi.fn(),
  photoUploadEnabled: vi.fn(() => true),
  putPhotoObject: vi.fn(),
  deleteProfilePhotoObjects: vi.fn(),
  uploadProfilePhoto: mocks.uploadProfilePhoto,
}));

vi.mock("@/lib/blurhash", () => ({
  blurredVariant: vi.fn(),
  encodeBlurhash: vi.fn(),
}));

import { POST } from "@/app/api/me/photo/route";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireUser.mockResolvedValue({ id: "member-1", photoUrl: null });
  mocks.rateLimit.mockResolvedValue({ allowed: true, remaining: 9 });
});

describe("POST /api/me/photo", () => {
  it("rejette un multipart chunked trop grand avant stockage ou mutation", async () => {
    const form = new FormData();
    form.set(
      "photo",
      new Blob([new Uint8Array(MAX_PROFILE_PHOTO_REQUEST_BYTES + 1)], {
        type: "image/jpeg",
      }),
      "large.jpg",
    );
    const request = new Request("https://alliance.example/api/me/photo", {
      method: "POST",
      body: form,
    });
    expect(request.headers.get("content-length")).toBeNull();

    const response = await POST(request);

    expect(response.status).toBe(413);
    expect(await response.json()).toMatchObject({ error: "TOO_LARGE" });
    expect(mocks.uploadProfilePhoto).not.toHaveBeenCalled();
    expect(mocks.userUpdate).not.toHaveBeenCalled();
  });

  it("transforme un faux multipart en erreur client contrôlée", async () => {
    const response = await POST(
      new Request("https://alliance.example/api/me/photo", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{}",
      }),
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      error: "INVALID_MULTIPART",
    });
    expect(mocks.uploadProfilePhoto).not.toHaveBeenCalled();
  });
});
