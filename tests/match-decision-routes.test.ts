import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireUser: vi.fn(),
  requirePending: vi.fn(),
  requireClosable: vi.fn(),
  updateMany: vi.fn(),
  update: vi.fn(),
  createMessage: vi.fn(),
  deleteBlessings: vi.fn(),
  serializable: vi.fn(),
  transaction: vi.fn(),
  findUser: vi.fn(),
  sendPush: vi.fn(),
  sendEmail: vi.fn(),
}));

vi.mock("@/lib/security/session", () => ({
  requireUser: mocks.requireUser,
}));

vi.mock("@/lib/alliance", () => ({
  requirePendingMatchDecisionMember: mocks.requirePending,
  requireClosableMatchMember: mocks.requireClosable,
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    match: {
      updateMany: mocks.updateMany,
      update: mocks.update,
    },
    message: { create: mocks.createMessage },
    user: { findUnique: mocks.findUser },
    $transaction: mocks.transaction,
  },
}));

vi.mock("@/lib/push", () => ({
  sendPushToUser: mocks.sendPush,
}));

vi.mock("@/lib/push-messages", () => ({
  requestAcceptedNotification: vi.fn(() => ({ title: "acceptée" })),
}));

vi.mock("@/lib/email", () => ({
  sendMatchAcceptedEmail: mocks.sendEmail,
}));

vi.mock("@/lib/security/crypto", () => ({
  encryptField: vi.fn((value: string) => `encrypted:${value}`),
}));

const closeTx = {
  match: { updateMany: mocks.updateMany },
  message: { create: mocks.createMessage },
  blessing: { deleteMany: mocks.deleteBlessings },
};

vi.mock("@/lib/blessing", () => ({
  withSerializableRetry: mocks.serializable,
}));

import { POST as acceptMatch } from "@/app/api/matches/[matchId]/accept/route";
import { POST as closeMatch } from "@/app/api/matches/[matchId]/close/route";

const user = {
  id: "recipient",
  displayName: "Destinataire",
};
const params = { params: Promise.resolve({ matchId: "match-1" }) };

describe("décision sur une demande PENDING", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireUser.mockResolvedValue(user);
    mocks.updateMany.mockResolvedValue({ count: 1 });
    mocks.findUser.mockResolvedValue(null);
    mocks.sendPush.mockResolvedValue(undefined);
    mocks.sendEmail.mockResolvedValue(undefined);
    mocks.deleteBlessings.mockResolvedValue({ count: 1 });
    mocks.createMessage.mockResolvedValue({ id: "message-1" });
    mocks.serializable.mockImplementation(
      async (operation: (client: typeof closeTx) => Promise<unknown>) =>
        operation(closeTx),
    );
    mocks.transaction.mockResolvedValue([]);
  });

  it("interdit au demandeur de s'auto-accepter", async () => {
    mocks.requirePending.mockResolvedValue({
      id: "match-1",
      status: "PENDING",
      requestedById: user.id,
    });

    const response = await acceptMatch(new Request("https://app.test"), params);

    expect(response.status).toBe(403);
    expect(mocks.updateMany).not.toHaveBeenCalled();
  });

  it("active atomiquement la demande acceptée par le destinataire", async () => {
    mocks.requirePending.mockResolvedValue({
      id: "match-1",
      status: "PENDING",
      requestedById: "requester",
    });

    const response = await acceptMatch(new Request("https://app.test"), params);

    expect(response.status).toBe(200);
    expect(mocks.updateMany).toHaveBeenCalledWith({
      where: { id: "match-1", status: "PENDING" },
      data: { status: "ACTIVE" },
    });
  });

  it("refuse une acceptation concurrente si l'état a déjà changé", async () => {
    mocks.requirePending.mockResolvedValue({
      id: "match-1",
      status: "PENDING",
      requestedById: "requester",
    });
    mocks.updateMany.mockResolvedValue({ count: 0 });

    const response = await acceptMatch(new Request("https://app.test"), params);

    expect(response.status).toBe(409);
    expect(mocks.sendPush).not.toHaveBeenCalled();
  });

  it("refuse PENDING sans lire ni créer de contenu de conversation", async () => {
    mocks.requireClosable.mockResolvedValue({
      id: "match-1",
      status: "PENDING",
      requestedById: "requester",
    });
    const request = new Request("https://app.test", {
      method: "POST",
      body: "corps volontairement non JSON",
    });

    const response = await closeMatch(request, params);

    expect(response.status).toBe(200);
    expect(mocks.updateMany).toHaveBeenCalledWith({
      where: { id: "match-1", status: "PENDING" },
      data: {
        stage: "CLOSED",
        status: "CLOSED",
        closedBy: user.id,
        closeMessage: null,
        contactExchange: "REVOKED",
        contactExchangeRequestedBy: null,
        advanceRequestedBy: null,
      },
    });
    expect(mocks.deleteBlessings).toHaveBeenCalledWith({
      where: { matchId: "match-1", status: "PENDING" },
    });
    expect(mocks.createMessage).not.toHaveBeenCalled();
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("interdit au demandeur de refuser sa propre demande", async () => {
    mocks.requireClosable.mockResolvedValue({
      id: "match-1",
      status: "PENDING",
      requestedById: user.id,
    });

    const response = await closeMatch(new Request("https://app.test"), params);

    expect(response.status).toBe(403);
    expect(mocks.updateMany).not.toHaveBeenCalled();
    expect(mocks.deleteBlessings).not.toHaveBeenCalled();
  });

  it("clôture ACTIVE, révoque les PENDING et écrit le dernier message atomiquement", async () => {
    mocks.requireClosable.mockResolvedValue({
      id: "match-1",
      status: "ACTIVE",
      requestedById: "requester",
    });
    const request = new Request("https://app.test", {
      method: "POST",
      body: JSON.stringify({ message: "Que Dieu te garde." }),
    });

    const response = await closeMatch(request, params);

    expect(response.status).toBe(200);
    expect(mocks.serializable).toHaveBeenCalledOnce();
    expect(mocks.updateMany).toHaveBeenCalledWith({
      where: { id: "match-1", status: "ACTIVE" },
      data: {
        stage: "CLOSED",
        status: "CLOSED",
        closedBy: user.id,
        closeMessage: null,
      },
    });
    expect(mocks.deleteBlessings).toHaveBeenCalledWith({
      where: { matchId: "match-1", status: "PENDING" },
    });
    expect(mocks.createMessage).toHaveBeenCalledWith({
      data: {
        matchId: "match-1",
        senderId: user.id,
        contentEncrypted: "encrypted:Que Dieu te garde.",
      },
    });
  });
});
