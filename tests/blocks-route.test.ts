import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireUser: vi.fn(),
  blockUserAndCloseMatches: vi.fn(),
}));

vi.mock("@/lib/security/session", () => ({
  requireUser: mocks.requireUser,
}));

vi.mock("@/lib/blocks", () => ({
  blockUserAndCloseMatches: mocks.blockUserAndCloseMatches,
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    block: {
      findMany: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
}));

import { POST } from "@/app/api/blocks/route";

function request(targetUserId: string) {
  return new Request("https://app.test/api/blocks", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ targetUserId }),
  });
}

describe("POST /api/blocks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireUser.mockResolvedValue({ id: "user-a" });
    mocks.blockUserAndCloseMatches.mockResolvedValue(undefined);
  });

  it("ne confirme qu'après la transaction de blocage et fermeture", async () => {
    const response = await POST(request("user-b"));

    expect(mocks.blockUserAndCloseMatches).toHaveBeenCalledWith(
      "user-a",
      "user-b",
    );
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      blocked: true,
    });
  });

  it("rejette le blocage de soi sans mutation", async () => {
    const response = await POST(request("user-a"));

    expect(response.status).toBe(400);
    expect(mocks.blockUserAndCloseMatches).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toEqual({
      error: "CANNOT_BLOCK_SELF",
    });
  });

  it("ne renvoie jamais un faux succès si la transaction échoue", async () => {
    const error = Object.assign(new Error("BLOCK_TARGET_NOT_FOUND"), {
      status: 404,
    });
    mocks.blockUserAndCloseMatches.mockRejectedValue(error);

    const response = await POST(request("missing"));

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: "NOT_FOUND" });
  });
});
