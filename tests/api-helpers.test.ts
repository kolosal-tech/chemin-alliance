import { describe, expect, it } from "vitest";
import {
  PayloadTooLargeError,
  readJsonLimited,
  readOptionalJsonLimited,
} from "@/lib/api-helpers";

describe("parsers JSON bornés", () => {
  it("autorise uniquement le body vide dans la variante optionnelle", async () => {
    const empty = await readOptionalJsonLimited(
      new Request("https://alliance.example", { method: "POST" }),
    );
    expect(empty).toBeNull();

    await expect(
      readOptionalJsonLimited(
        new Request("https://alliance.example", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: "{invalid",
        }),
      ),
    ).rejects.toThrow(SyntaxError);
  });

  it("ne transforme pas un body optionnel trop grand en body vide", async () => {
    await expect(
      readOptionalJsonLimited(
        new Request("https://alliance.example", {
          method: "POST",
          body: JSON.stringify({ value: "x".repeat(2_000) }),
        }),
        256,
      ),
    ).rejects.toBeInstanceOf(PayloadTooLargeError);
  });

  it("conserve le rejet du JSON vide pour la variante obligatoire", async () => {
    await expect(
      readJsonLimited(
        new Request("https://alliance.example", { method: "POST" }),
      ),
    ).rejects.toThrow(SyntaxError);
  });
});
