import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  auditAdmin: vi.fn(),
  reportsFindMany: vi.fn(),
  reportFindUnique: vi.fn(),
  reportUpdate: vi.fn(),
  userUpdate: vi.fn(),
  coachesFindMany: vi.fn(),
  coachCreate: vi.fn(),
  coachDelete: vi.fn(),
  transaction: vi.fn(),
}));

vi.mock("@/lib/security/session", () => ({
  requireAdmin: mocks.requireAdmin,
}));

vi.mock("@/lib/audit", () => ({
  auditAdmin: mocks.auditAdmin,
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    report: {
      findMany: mocks.reportsFindMany,
      findUnique: mocks.reportFindUnique,
      update: mocks.reportUpdate,
    },
    user: { update: mocks.userUpdate },
    coach: {
      findMany: mocks.coachesFindMany,
      create: mocks.coachCreate,
      delete: mocks.coachDelete,
    },
    $transaction: mocks.transaction,
  },
}));

import { GET as getReports } from "@/app/api/admin/reports/route";
import { PATCH as patchReport } from "@/app/api/admin/reports/[id]/route";
import {
  GET as getCoaches,
  POST as createCoach,
} from "@/app/api/admin/coaches/route";
import { DELETE as deleteCoach } from "@/app/api/admin/coaches/[id]/route";

const admin = { id: "admin-id", role: "ADMIN" };

function coachRequest(body: unknown) {
  return new Request("https://app.test/api/admin/coaches", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function reportRequest(action: string) {
  return new Request("https://app.test/api/admin/reports/report-1", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ action }),
  });
}

describe("audit des routes d'administration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAdmin.mockResolvedValue(admin);
    mocks.reportsFindMany.mockResolvedValue([]);
    mocks.coachesFindMany.mockResolvedValue([]);
    mocks.coachCreate.mockResolvedValue({
      id: "coach-1",
      displayName: "Nom sensible non journalisé",
    });
    mocks.coachDelete.mockResolvedValue({ id: "coach-1" });
    mocks.reportUpdate.mockResolvedValue({ id: "report-1" });
    mocks.userUpdate.mockReturnValue(Promise.resolve({ id: "member-1" }));
    mocks.transaction.mockResolvedValue([]);
  });

  it("audite la lecture de la file de signalements", async () => {
    const response = await getReports();

    expect(response.status).toBe(200);
    expect(mocks.auditAdmin).toHaveBeenCalledWith({
      event: "admin.reports.read",
      action: "list",
      result: "success",
      actorId: "admin-id",
      targetId: "collection:reports",
    });
  });

  it("audite un refus sans exécuter la lecture", async () => {
    mocks.requireAdmin.mockRejectedValue(
      Object.assign(new Error("FORBIDDEN"), { status: 403 }),
    );

    const response = await getCoaches();

    expect(response.status).toBe(403);
    expect(mocks.coachesFindMany).not.toHaveBeenCalled();
    expect(mocks.auditAdmin).toHaveBeenCalledWith({
      event: "admin.coaches.read",
      action: "list",
      result: "denied",
      actorId: "anonymous-admin-api",
      targetId: "collection:coaches",
    });
  });

  it("audite la création sans transmettre nom, bio ou affiliation au journal", async () => {
    const response = await createCoach(
      coachRequest({
        displayName: "Pasteur Exemple",
        affiliation: "Église Exemple",
        bio: "Contenu personnel",
        certified: true,
        specialties: ["couple"],
        pricePerSessionEUR: 0,
      }),
    );

    expect(response.status).toBe(201);
    expect(mocks.auditAdmin).toHaveBeenCalledWith({
      event: "admin.coach.mutate",
      action: "create",
      result: "success",
      actorId: "admin-id",
      targetId: "coach-1",
    });
    expect(JSON.stringify(mocks.auditAdmin.mock.calls)).not.toContain(
      "Pasteur Exemple",
    );
    expect(JSON.stringify(mocks.auditAdmin.mock.calls)).not.toContain(
      "Contenu personnel",
    );
  });

  it("audite un bannissement dont le signalement est absent", async () => {
    mocks.reportFindUnique.mockResolvedValue(null);

    const response = await patchReport(reportRequest("BAN"), {
      params: Promise.resolve({ id: "report-404" }),
    });

    expect(response.status).toBe(404);
    expect(mocks.auditAdmin).toHaveBeenCalledWith({
      event: "admin.report.mutate",
      action: "ban",
      result: "not_found",
      actorId: "admin-id",
      targetId: "report-404",
    });
  });

  it("audite une transition de modération réussie", async () => {
    const response = await patchReport(reportRequest("RESOLVED"), {
      params: Promise.resolve({ id: "report-1" }),
    });

    expect(response.status).toBe(200);
    expect(mocks.auditAdmin).toHaveBeenCalledWith({
      event: "admin.report.mutate",
      action: "resolved",
      result: "success",
      actorId: "admin-id",
      targetId: "report-1",
    });
  });

  it("cible le membre affecté lors d'un bannissement sans journaliser le motif", async () => {
    mocks.reportFindUnique.mockResolvedValue({
      targetUserId: "member-1",
      reason: "ne doit jamais atteindre le journal",
    });

    const response = await patchReport(reportRequest("BAN"), {
      params: Promise.resolve({ id: "report-1" }),
    });

    expect(response.status).toBe(200);
    expect(mocks.auditAdmin).toHaveBeenCalledWith({
      event: "admin.report.mutate",
      action: "ban",
      result: "success",
      actorId: "admin-id",
      targetId: "member-1",
    });
    expect(JSON.stringify(mocks.auditAdmin.mock.calls)).not.toContain(
      "ne doit jamais atteindre le journal",
    );
  });

  it("audite l'échec d'une suppression d'accompagnateur", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.coachDelete.mockRejectedValue(new Error("database unavailable"));

    const response = await deleteCoach(new Request("https://app.test"), {
      params: Promise.resolve({ id: "coach-1" }),
    });

    expect(response.status).toBe(500);
    expect(mocks.auditAdmin).toHaveBeenCalledWith({
      event: "admin.coach.mutate",
      action: "delete",
      result: "failure",
      actorId: "admin-id",
      targetId: "coach-1",
    });
  });
});
