import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parse } from "yaml";
import { z } from "zod";
import type { Locale } from "@/lib/core-engine";

// Dévotionnel quotidien - verset + méditation + question + prière, chargé depuis
// rulesets/daily-devotionals.yaml (tronc commun, doctrine-agnostique). Le
// dévotionnel du jour est déterministe (jour de l'année). Le streak (jours
// consécutifs) est porté par User (lastDevotionDate / currentStreak / longest).

// ───────────────────────── Streak (logique pure, testée) ─────────────────────

function utcDayNumber(d: Date): number {
  return Math.floor(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) / 86_400_000,
  );
}

export interface StreakResult {
  lastDevotionDate: Date;
  currentStreak: number;
  longestStreak: number;
  alreadyDoneToday: boolean;
  isNewRecord: boolean;
}

/**
 * Calcule le nouvel état de streak quand l'utilisateur marque le dévotionnel
 * du jour comme fait. Granularité : jour UTC. Idempotent si déjà fait
 * aujourd'hui ; +1 si fait hier ; reset à 1 si un jour a été manqué.
 */
export function advanceStreak(
  last: Date | null,
  today: Date,
  currentStreak: number,
  longestStreak: number,
): StreakResult {
  const todayDay = utcDayNumber(today);
  const todayMidnight = new Date(todayDay * 86_400_000);

  if (last) {
    const lastDay = utcDayNumber(last);
    if (lastDay === todayDay) {
      return {
        lastDevotionDate: last,
        currentStreak,
        longestStreak,
        alreadyDoneToday: true,
        isNewRecord: false,
      };
    }
    const newCurrent = lastDay === todayDay - 1 ? currentStreak + 1 : 1;
    return {
      lastDevotionDate: todayMidnight,
      currentStreak: newCurrent,
      longestStreak: Math.max(longestStreak, newCurrent),
      alreadyDoneToday: false,
      isNewRecord: newCurrent > longestStreak,
    };
  }
  return {
    lastDevotionDate: todayMidnight,
    currentStreak: 1,
    longestStreak: Math.max(longestStreak, 1),
    alreadyDoneToday: false,
    isNewRecord: longestStreak < 1,
  };
}

/** Vrai si la date correspond au jour UTC courant (dévotionnel déjà fait). */
export function isSameUtcDay(a: Date | null, b: Date): boolean {
  return a != null && utcDayNumber(a) === utcDayNumber(b);
}

// ───────────────────────── Contenu (YAML, lazy) ──────────────────────────────

const localized = z.object({
  fr: z.string().min(1),
  en: z.string().min(1),
  es: z.string().min(1),
  pt: z.string().min(1),
});

const devotionSchema = z.object({
  id: z.string(),
  reference: z.string(),
  verse: localized,
  meditation: localized,
  reflection: localized,
  prayer: localized,
});

const fileSchema = z.object({
  devotionals: z
    .array(devotionSchema)
    .min(1)
    .refine(
      (arr) => new Set(arr.map((d) => d.id)).size === arr.length,
      "Identifiants de dévotionnels dupliqués",
    ),
});

type RawDevotion = z.infer<typeof devotionSchema>;
let cache: RawDevotion[] | null = null;

function load(): RawDevotion[] {
  if (cache) return cache;
  const raw = readFileSync(
    join(process.cwd(), "rulesets", "daily-devotionals.yaml"),
    "utf8",
  );
  const parsed = fileSchema.safeParse(parse(raw));
  if (!parsed.success) {
    throw new Error(
      `Dévotionnels invalides: ${parsed.error.issues
        .map((i) => `${i.path.join(".")}: ${i.message}`)
        .join("; ")}`,
    );
  }
  cache = parsed.data.devotionals;
  return cache;
}

function dayOfYear(d: Date): number {
  const start = Date.UTC(d.getUTCFullYear(), 0, 1);
  const now = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  return Math.floor((now - start) / 86_400_000);
}

export interface DailyDevotion {
  id: string;
  reference: string;
  verse: string;
  meditation: string;
  reflection: string;
  prayer: string;
}

function pick(v: z.infer<typeof localized>, locale: Locale): string {
  return v[locale] ?? v.fr;
}

/** Dévotionnel du jour, localisé. Déterministe par jour de l'année. */
export function getDailyDevotion(
  locale: Locale = "fr",
  date: Date,
): DailyDevotion {
  const all = load();
  const d = all[dayOfYear(date) % all.length];
  return {
    id: d.id,
    reference: d.reference,
    verse: pick(d.verse, locale),
    meditation: pick(d.meditation, locale),
    reflection: pick(d.reflection, locale),
    prayer: pick(d.prayer, locale),
  };
}
