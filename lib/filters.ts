import { z } from "zod";

/**
 * Filtres de suggestions — schéma Zod + logique pure (testable, sans I/O).
 *
 * Les filtres transitent par l'URL (searchParams, GET) : aucune Server Action
 * ni endpoint mutant n'est créé, donc pas de surface de rate-limit nouvelle.
 * La validation Zod reste exigée (cf. contrainte sécurité du brief) : toute
 * valeur hors-bornes ou mal typée est silencieusement ignorée (filtre absent),
 * jamais propagée. On ne filtre QUE sur des champs robustes et toujours
 * présents (âge, vérifié, enfants) pour ne pas coupler à un enum incertain.
 */
export const filtersSchema = z.object({
  ageMin: z.coerce.number().int().min(18).max(99).optional().catch(undefined),
  ageMax: z.coerce.number().int().min(18).max(99).optional().catch(undefined),
  /** présence de "1" ⇒ profils vérifiés uniquement */
  verified: z.literal("1").optional().catch(undefined),
  /** tri-état via présence : "yes" | "no" | absent */
  children: z.enum(["yes", "no"]).optional().catch(undefined),
});

export type Filters = z.infer<typeof filtersSchema>;

/** Forme minimale qu'un profil doit exposer pour être filtré. */
export type FilterableProfile = {
  age: number;
  isVerified: boolean;
  hasChildren: boolean;
};

/** Parse défensif des searchParams ⇒ filtres validés (ou vides). */
export function parseFilters(
  searchParams: Record<string, string | string[] | undefined> | undefined,
): Filters {
  const result = filtersSchema.safeParse(searchParams ?? {});
  return result.success ? result.data : {};
}

/** Prédicat : un profil passe-t-il les filtres ? */
export function matchesFilters(p: FilterableProfile, f: Filters): boolean {
  if (f.ageMin != null && p.age < f.ageMin) return false;
  if (f.ageMax != null && p.age > f.ageMax) return false;
  if (f.verified === "1" && !p.isVerified) return false;
  if (f.children === "yes" && !p.hasChildren) return false;
  if (f.children === "no" && p.hasChildren) return false;
  return true;
}

export function applyFilters<T extends FilterableProfile>(
  list: T[],
  f: Filters,
): T[] {
  return list.filter((p) => matchesFilters(p, f));
}

/** Nombre de filtres actifs — alimente le badge du tiroir. */
export function activeFilterCount(f: Filters): number {
  let n = 0;
  if (f.ageMin != null) n++;
  if (f.ageMax != null) n++;
  if (f.verified === "1") n++;
  if (f.children) n++;
  return n;
}
