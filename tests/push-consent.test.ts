import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findMany: vi.fn(),
  setVapidDetails: vi.fn(),
  sendNotification: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    pushSubscription: {
      findMany: mocks.findMany,
      deleteMany: vi.fn(),
    },
  },
}));
vi.mock("@/lib/env", () => ({
  env: {
    NEXT_PUBLIC_WEB_PUSH_PUBLIC_KEY: "public-test-key",
    WEB_PUSH_PRIVATE_KEY: "private-test-key",
    WEB_PUSH_EMAIL: "mailto:push@example.test",
  },
}));
vi.mock("web-push", () => ({
  default: {
    setVapidDetails: mocks.setVapidDetails,
    sendNotification: mocks.sendNotification,
  },
}));

import { sendPushToUser } from "@/lib/push";

describe("consentement du destinataire Push", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.findMany.mockResolvedValue([]);
  });

  it("filtre les abonnements par consentement sensible encore actif", async () => {
    await expect(
      sendPushToUser("withdrawn-user", {
        title: "Rappel",
        body: "Contenu",
      }),
    ).resolves.toBe(0);

    expect(mocks.findMany).toHaveBeenCalledWith({
      where: {
        userId: "withdrawn-user",
        user: {
          is: {
            consents: {
              some: {
                type: "SENSITIVE_DATA_PROCESSING",
                revokedAt: null,
              },
            },
          },
        },
      },
    });
    expect(mocks.sendNotification).not.toHaveBeenCalled();
  });
});
