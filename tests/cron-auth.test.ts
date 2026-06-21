import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { requireCronAuth } from "@/lib/cron/auth";

function reqWith(auth?: string): Request {
  return new Request("https://x/api/cron/x", {
    headers: auth ? { authorization: auth } : {},
  });
}

const SECRET = "s3cret-cron-value-au-moins-32-caracteres";

describe("requireCronAuth - garde cron dormant + Bearer", () => {
  let saved: string | undefined;
  beforeEach(() => {
    saved = process.env.CRON_SECRET;
  });
  afterEach(() => {
    if (saved === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = saved;
  });

  it("dormant (503) sans CRON_SECRET - même avec un Bearer", () => {
    delete process.env.CRON_SECRET;
    expect.assertions(1);
    try {
      requireCronAuth(reqWith(`Bearer ${SECRET}`));
    } catch (e) {
      expect((e as { status?: number }).status).toBe(503);
    }
  });

  it("401 si en-tête absent ou mauvais", () => {
    process.env.CRON_SECRET = SECRET;
    for (const h of [undefined, "Bearer mauvais", SECRET]) {
      try {
        requireCronAuth(reqWith(h));
        throw new Error("aurait dû lever");
      } catch (e) {
        expect((e as { status?: number }).status).toBe(401);
      }
    }
  });

  it("ne lève pas avec le bon Bearer", () => {
    process.env.CRON_SECRET = SECRET;
    expect(() => requireCronAuth(reqWith(`Bearer ${SECRET}`))).not.toThrow();
  });
});
