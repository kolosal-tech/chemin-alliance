import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  audit,
  auditAdmin,
  auditPseudonym,
  type AdminAuditInput,
} from "@/lib/audit";

describe("journal d'audit minimal", () => {
  let info: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    info = vi.spyOn(console, "info").mockImplementation(() => {});
  });

  afterEach(() => {
    info.mockRestore();
  });

  it("pseudonymise de façon stable sans révéler l'identifiant", () => {
    const first = auditPseudonym("internal-user-id");
    const second = auditPseudonym("internal-user-id");
    const other = auditPseudonym("other-user-id");

    expect(first).toMatch(/^psn_[a-f0-9]{32}$/);
    expect(first).toBe(second);
    expect(first).not.toBe(other);
    expect(first).not.toContain("internal-user-id");
  });

  it("n'émet que les champs administratifs autorisés et aucun identifiant brut", () => {
    auditAdmin({
      event: "admin.report.mutate",
      action: "ban",
      result: "success",
      actorId: "admin-internal-id",
      targetId: "member-internal-id",
    });

    expect(info).toHaveBeenCalledOnce();
    const line = String(info.mock.calls[0]?.[0]);
    expect(line).not.toContain("admin-internal-id");
    expect(line).not.toContain("member-internal-id");
    const record = JSON.parse(line) as Record<string, unknown>;
    expect(Object.keys(record).sort()).toEqual(
      [
        "action",
        "actorId",
        "event",
        "result",
        "schemaVersion",
        "tag",
        "targetId",
        "ts",
      ].sort(),
    );
    expect(record).toMatchObject({
      schemaVersion: 1,
      tag: "admin_audit",
      event: "admin.report.mutate",
      action: "ban",
      result: "success",
      actorId: expect.stringMatching(/^psn_/),
      targetId: expect.stringMatching(/^psn_/),
    });
  });

  it("rejette à l'exécution un couple événement/action hors liste fermée", () => {
    const invalid = {
      event: "admin.report.mutate",
      action: "export_all_pii",
      result: "success",
      actorId: "admin-id",
      targetId: "target-id",
    } as unknown as AdminAuditInput;

    expect(() => auditAdmin(invalid)).toThrow(
      "ADMIN_AUDIT_EVENT_OR_ACTION_INVALID",
    );
    expect(info).not.toHaveBeenCalled();
  });

  it("pseudonymise aussi les événements historiques sans métadonnée libre", () => {
    audit("password.change", "user-internal-id");

    const line = String(info.mock.calls[0]?.[0]);
    expect(line).not.toContain("user-internal-id");
    expect(JSON.parse(line)).toMatchObject({
      tag: "audit",
      event: "password.change",
      result: "success",
      actorId: expect.stringMatching(/^psn_/),
    });
  });
});
