import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireUser: vi.fn(),
  rateLimit: vi.fn(),
  findFirstMatch: vi.fn(),
  createMessage: vi.fn(),
  deleteManyMessages: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    match: {
      findFirst: mocks.findFirstMatch,
    },
    message: {
      create: mocks.createMessage,
      deleteMany: mocks.deleteManyMessages,
    },
  },
}));

vi.mock("@/lib/security/session", () => ({
  requireUser: mocks.requireUser,
}));

vi.mock("@/lib/security/rate-limit", () => ({
  rateLimit: mocks.rateLimit,
  LIMITS: {
    message: { limit: 20, windowMs: 60_000 },
  },
}));

vi.mock("@/lib/push", () => ({
  sendPushToUser: vi.fn(),
}));

vi.mock("@/lib/companions/reply", () => ({
  generateCompanionReply: vi.fn(),
}));

import { GET, POST } from "@/app/api/matches/[matchId]/messages/route";
import { DELETE } from "@/app/api/matches/[matchId]/messages/[messageId]/route";

const user = {
  id: "user-a",
  isVerified: true,
  locale: "fr",
  rulesetId: "evangelical-v1",
};

describe("API messages après blocage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireUser.mockResolvedValue(user);
    mocks.rateLimit.mockResolvedValue({ allowed: true, remaining: 10 });
    // Le prédicat DB renvoie null lorsque le match est clos ou qu'un blocage
    // existe dans l'un des deux sens.
    mocks.findFirstMatch.mockResolvedValue(null);
    mocks.deleteManyMessages.mockResolvedValue({ count: 0 });
  });

  it("ne restitue aucun message par URL/API", async () => {
    const response = await GET(new Request("https://app.test"), {
      params: Promise.resolve({ matchId: "match-1" }),
    });

    expect(response.status).toBe(404);
    expect(mocks.findFirstMatch).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          AND: expect.arrayContaining([{ id: "match-1", status: "ACTIVE" }]),
        }),
      }),
    );
  });

  it("n'accepte aucun nouveau message", async () => {
    const response = await POST(
      new Request("https://app.test", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ content: "bonjour" }),
      }),
      { params: Promise.resolve({ matchId: "match-1" }) },
    );

    expect(response.status).toBe(404);
    expect(mocks.createMessage).not.toHaveBeenCalled();
    expect(mocks.findFirstMatch).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          AND: expect.arrayContaining([{ id: "match-1", status: "ACTIVE" }]),
        }),
      }),
    );
  });

  it("n'autorise pas la suppression d'un ancien message", async () => {
    const response = await DELETE(new Request("https://app.test"), {
      params: Promise.resolve({
        matchId: "match-1",
        messageId: "message-1",
      }),
    });

    expect(response.status).toBe(404);
    expect(mocks.deleteManyMessages).toHaveBeenCalledWith({
      where: expect.objectContaining({
        id: "message-1",
        matchId: "match-1",
        senderId: "user-a",
        match: {
          is: expect.objectContaining({
            AND: expect.arrayContaining([{ id: "match-1", status: "ACTIVE" }]),
          }),
        },
      }),
    });
  });
});
