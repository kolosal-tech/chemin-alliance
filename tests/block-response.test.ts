import { describe, expect, it } from "vitest";
import { isConfirmedBlockResponse } from "@/lib/block-response";

describe("confirmation client du blocage", () => {
  it("n'accepte que la confirmation HTTP et métier explicite", async () => {
    const response = Response.json({ ok: true, blocked: true });
    await expect(isConfirmedBlockResponse(response)).resolves.toBe(true);
  });

  it("échoue fermée si le serveur répond en erreur malgré un corps positif", async () => {
    const response = Response.json(
      { ok: true, blocked: true },
      { status: 500 },
    );
    await expect(isConfirmedBlockResponse(response)).resolves.toBe(false);
  });

  it.each([
    ["corps contradictoire", JSON.stringify({ ok: true, blocked: false })],
    ["corps incomplet", JSON.stringify({ ok: true })],
    ["corps non JSON", "service unavailable"],
  ])("échoue fermée pour un %s", async (_label, body) => {
    const response = new Response(body, {
      status: 200,
      headers: { "content-type": "application/json" },
    });
    await expect(isConfirmedBlockResponse(response)).resolves.toBe(false);
  });
});
