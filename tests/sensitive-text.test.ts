import { describe, it, expect } from "vitest";
import {
  sanitizeText,
  escapeHtml,
  sensitiveText,
} from "../lib/security/sensitive-text";

const cp = (n: number) => String.fromCodePoint(n);

describe("sanitizeText - strip controle/format (par propriete Unicode)", () => {
  // Code points invisibles/format cites par la revue adversariale.
  const hostile = [
    0x0007, // BEL (C0)
    0x007f, // DEL (C1 boundary)
    0x200b, // ZWSP
    0x200d, // ZWJ
    0x202e, // RIGHT-TO-LEFT OVERRIDE
    0x2060, // WORD JOINER (zero-width)
    0x2063, // INVISIBLE SEPARATOR (math format)
    0x061c, // ARABIC LETTER MARK (bidi control)
    0xfeff, // BOM
    0xfff9, // INTERLINEAR ANNOTATION ANCHOR
    0xe0041, // TAG LATIN CAPITAL A (text-smuggling block)
    0x2028, // LINE SEPARATOR (Zl)
    0x2029, // PARAGRAPH SEPARATOR (Zp)
  ];

  it("retire tous les caracteres invisibles/format cites", () => {
    for (const c of hostile) {
      expect(sanitizeText(`a${cp(c)}b`)).toBe("ab");
    }
  });

  it("conserve \\t, \\n, accents, emoji et lettres astrales", () => {
    expect(sanitizeText("a\tb\nc")).toBe("a\tb\nc");
    // emoji (U+1F600) + math-bold A (U+1D400) doivent survivre intacts.
    expect(sanitizeText(`cafe ${cp(0x1f600)} ${cp(0x1d400)}`)).toBe(
      `cafe ${cp(0x1f600)} ${cp(0x1d400)}`,
    );
  });

  it("normalise CRLF/CR -> LF et borne les sauts multiples", () => {
    expect(sanitizeText("l1\r\nl2\r\n\r\n\r\nl3")).toBe("l1\nl2\n\nl3");
  });

  it("rogne les bords", () => {
    expect(sanitizeText("  x  ")).toBe("x");
  });
});

describe("sensitiveText - semantique PATCH 3-etats", () => {
  const s = sensitiveText(100);

  it("undefined -> undefined (champ absent : ne pas modifier)", () => {
    expect(s.parse(undefined)).toBeUndefined();
  });

  it("null -> null (effacement explicite)", () => {
    expect(s.parse(null)).toBeNull();
  });

  it("chaine devenant vide apres nettoyage -> null", () => {
    expect(s.parse(`   ${cp(0x200b)}  `)).toBeNull();
  });

  it("chaine -> nettoyee (TAG strippe)", () => {
    expect(s.parse(`hi${cp(0xe0041)}!`)).toBe("hi!");
  });

  it("rejette au-dela du garde-fou brut (max*4)", () => {
    expect(() => sensitiveText(5).parse("x".repeat(21))).toThrow();
  });

  it("rejette au-dela de la limite metier apres nettoyage", () => {
    expect(() => sensitiveText(5).parse("123456")).toThrow();
  });
});

describe("escapeHtml", () => {
  it("echappe les meta-caracteres HTML (hors React)", () => {
    expect(escapeHtml(`<b>"x"&'y'</b>`)).toBe(
      "&lt;b&gt;&quot;x&quot;&amp;&#39;y&#39;&lt;/b&gt;",
    );
  });
});
