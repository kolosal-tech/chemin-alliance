import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parse } from "yaml";
import { z } from "zod";
import type { Locale } from "@/lib/core-engine";

// Curriculum de préparation au mariage - modules guidés par étape du parcours.
// Chargé depuis rulesets/marriage-prep-curriculum.yaml. Cadre biblique, tronc
// commun doctrine-agnostique + notes par verticale (jamais en dur ici).

const localized = z.object({
  fr: z.string(),
  en: z.string(),
  es: z.string(),
  pt: z.string(),
});

const moduleSchema = z.object({
  id: z.string(),
  stage: z.string(),
  icon: z.string(),
  title: localized,
  summary: localized,
  scripture: z.array(z.string()),
  themes: z.array(localized),
  reflection: z.array(localized),
  practice: localized,
});

const noteSchema = z.object({ module: z.string(), note: localized });

const fileSchema = z.object({
  curriculum: z.object({
    version: z.number(),
    modules: z.array(moduleSchema),
    vertical_notes: z.record(z.string(), z.array(noteSchema)).default({}),
  }),
});

type RawCurriculum = z.infer<typeof fileSchema>["curriculum"];

let cache: RawCurriculum | null = null;
function load(): RawCurriculum {
  if (cache) return cache;
  const raw = readFileSync(
    join(process.cwd(), "rulesets", "marriage-prep-curriculum.yaml"),
    "utf8",
  );
  const parsed = fileSchema.safeParse(parse(raw));
  if (!parsed.success) {
    throw new Error(
      `Curriculum invalide: ${parsed.error.issues
        .map((i) => `${i.path.join(".")}: ${i.message}`)
        .join("; ")}`,
    );
  }
  cache = parsed.data.curriculum;
  return cache;
}

function pick(value: z.infer<typeof localized>, locale: Locale): string {
  return value[locale] ?? value.fr;
}

/** Module localisé, prêt à l'affichage. */
export interface CurriculumModule {
  id: string;
  stage: string;
  icon: string;
  title: string;
  summary: string;
  scripture: string[];
  themes: string[];
  reflection: string[];
  practice: string;
  /** Note doctrinale propre à la verticale, si fournie et applicable. */
  verticalNote: string | null;
}

/**
 * Curriculum localisé. Si `vertical` est fourni (CHRISTIAN_EVANGELICAL /
 * CHRISTIAN_CATHOLIC), attache à chaque module la note doctrinale éventuelle.
 * Les modules sont renvoyés dans l'ordre du parcours (ordre du fichier).
 */
export function getCurriculum(
  locale: Locale = "fr",
  vertical?: string | null,
): CurriculumModule[] {
  const data = load();
  const notes = vertical ? (data.vertical_notes[vertical] ?? []) : [];
  return data.modules.map((m) => {
    const note = notes.find((n) => n.module === m.id);
    return {
      id: m.id,
      stage: m.stage,
      icon: m.icon,
      title: pick(m.title, locale),
      summary: pick(m.summary, locale),
      scripture: m.scripture,
      themes: m.themes.map((t) => pick(t, locale)),
      reflection: m.reflection.map((r) => pick(r, locale)),
      practice: pick(m.practice, locale),
      verticalNote: note ? pick(note.note, locale) : null,
    };
  });
}

/** Un module par identifiant, localisé. */
export function getModule(
  id: string,
  locale: Locale = "fr",
  vertical?: string | null,
): CurriculumModule | null {
  return getCurriculum(locale, vertical).find((m) => m.id === id) ?? null;
}
