import { describe, it, expect } from "vitest";
import fr from "@/messages/fr.json";
import en from "@/messages/en.json";
import es from "@/messages/es.json";
import pt from "@/messages/pt.json";
import {
  stats,
  journeySteps,
  values,
  whyUs,
  testimonials,
  footerNav,
} from "@/content/home";
import { guideTopics } from "@/content/guides";
import { posts, getPost, localizedContent } from "@/content/blog";

/** Collecte récursive des chemins de clés (feuilles) d'un objet. */
function keyPaths(obj: unknown, prefix = ""): string[] {
  if (obj === null || typeof obj !== "object") return [prefix];
  return Object.entries(obj as Record<string, unknown>).flatMap(([k, v]) =>
    keyPaths(v, prefix ? `${prefix}.${k}` : k),
  );
}

describe("content/home - intégrité de la config", () => {
  it("stats : 4 entrées, ids uniques", () => {
    expect(stats).toHaveLength(4);
    expect(new Set(stats.map((s) => s.id)).size).toBe(4);
  });

  it("journeySteps : 6 étapes numérotées 1→6", () => {
    expect(journeySteps).toHaveLength(6);
    expect(journeySteps.map((s) => s.n)).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it("values & whyUs : 4 cartes chacun", () => {
    expect(values).toHaveLength(4);
    expect(whyUs).toHaveLength(4);
  });

  it("testimonials : ids uniques, mois positifs", () => {
    expect(new Set(testimonials.map((t) => t.id)).size).toBe(
      testimonials.length,
    );
    expect(testimonials.every((t) => t.months > 0)).toBe(true);
  });

  it("footerNav : sections product / resources / legal", () => {
    expect(footerNav.map((c) => c.section)).toEqual([
      "product",
      "resources",
      "legal",
    ]);
  });
});

describe("i18n - parité des clés sur les 4 langues", () => {
  const refHome = keyPaths(fr.home).sort();
  const refPages = keyPaths(fr.pages).sort();

  it.each([
    ["en", en],
    ["es", es],
    ["pt", pt],
  ])("namespace home identique en %s", (_l, msgs) => {
    expect(keyPaths((msgs as typeof fr).home).sort()).toEqual(refHome);
  });

  it.each([
    ["en", en],
    ["es", es],
    ["pt", pt],
  ])("namespace pages identique en %s", (_l, msgs) => {
    expect(keyPaths((msgs as typeof fr).pages).sort()).toEqual(refPages);
  });
});

describe("i18n - chaque id de config a sa traduction FR", () => {
  it("journeySteps → home.journey.steps.<id>", () => {
    for (const s of journeySteps) {
      expect(
        (fr.home.journey.steps as Record<string, unknown>)[s.id],
      ).toBeTruthy();
    }
  });
  it("values → home.values.<id>", () => {
    for (const v of values) {
      expect((fr.home.values as Record<string, unknown>)[v.id]).toBeTruthy();
    }
  });
  it("whyUs → home.whyUs.items.<id>", () => {
    for (const w of whyUs) {
      expect(
        (fr.home.whyUs.items as Record<string, unknown>)[w.id],
      ).toBeTruthy();
    }
  });
  it("guideTopics → pages.guides.topics.<id>", () => {
    for (const g of guideTopics) {
      expect(
        (fr.pages.guides.topics as Record<string, unknown>)[g.id],
      ).toBeTruthy();
    }
  });
});

describe("content/blog - lookup & repli i18n", () => {
  it("getPost trouve un slug connu, undefined sinon", () => {
    expect(getPost(posts[0].slug)).toBeDefined();
    expect(getPost("slug-inexistant")).toBeUndefined();
  });

  it("localizedContent retombe sur le FR si la locale manque", () => {
    const post = posts.find((p) => !p.content.es);
    expect(post).toBeDefined();
    if (post) {
      expect(localizedContent(post, "es")).toBe(post.content.fr);
    }
  });

  it("localizedContent rend la traduction quand elle existe", () => {
    const post = posts.find((p) => p.content.en);
    if (post) {
      expect(localizedContent(post, "en")).toBe(post.content.en);
    }
  });
});
