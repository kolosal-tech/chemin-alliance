import { describe, expect, it } from "vitest";
import { serializeJsonLd } from "@/lib/security/json-ld";

describe("sérialisation JSON-LD dans HTML", () => {
  it("neutralise toute sortie de balise sans modifier la valeur JSON", () => {
    const input = {
      title: "</script><script>alert('xss')</script>",
      text: "A&B > C < D",
      separators: "avant\u2028milieu\u2029après",
    };

    const serialized = serializeJsonLd(input);

    expect(serialized).not.toContain("</script");
    expect(serialized).not.toMatch(/[<>&\u2028\u2029]/);
    expect(serialized).toContain("\\u003c/script\\u003e");
    expect(JSON.parse(serialized)).toEqual(input);
  });

  it("refuse les valeurs que JSON ne peut pas sérialiser", () => {
    expect(() => serializeJsonLd(undefined)).toThrow(
      "JSON_LD_VALUE_NOT_SERIALIZABLE",
    );
  });
});
