import { beforeEach, describe, expect, it, vi } from "vitest";
import { sealInsight } from "@/lib/agent-insight";

const mocks = vi.hoisted(() => ({
  findFirst: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    agentInsight: { findFirst: mocks.findFirst },
  },
}));

import { getSafetySignalForMatch } from "@/lib/safety-signals";

describe("signal de sécurité fail-closed", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  it("retourne none seulement en l'absence réelle de signal", async () => {
    mocks.findFirst.mockResolvedValue(null);
    await expect(getSafetySignalForMatch("match-1")).resolves.toEqual({
      flagged: false,
      severity: "none",
      signals: [],
    });
  });

  it("restitue un signal HIGH authentifié", async () => {
    mocks.findFirst.mockResolvedValue({
      id: "insight-1",
      dataJson: sealInsight({
        severity: "high",
        signals: ["money_request"],
      }),
    });
    await expect(getSafetySignalForMatch("match-1")).resolves.toEqual({
      flagged: true,
      severity: "high",
      signals: ["money_request"],
    });
  });

  it("ne transforme jamais un ciphertext corrompu en flagged:false", async () => {
    mocks.findFirst.mockResolvedValue({
      id: "insight-corrupt",
      dataJson: "ciphertext.corrompu.invalide",
    });
    await expect(getSafetySignalForMatch("match-1")).resolves.toEqual({
      flagged: true,
      severity: "high",
      signals: [],
    });
    expect(console.warn).toHaveBeenCalledWith(
      "[safety-signal] donnée illisible",
      "insight-corrupt",
    );
  });

  it("échoue également fermée sur un payload authentique mais mal formé", async () => {
    mocks.findFirst.mockResolvedValue({
      id: "insight-malformed",
      dataJson: sealInsight({ severity: "high", signals: "money_request" }),
    });
    await expect(getSafetySignalForMatch("match-1")).resolves.toMatchObject({
      flagged: true,
      severity: "high",
    });
  });
});
