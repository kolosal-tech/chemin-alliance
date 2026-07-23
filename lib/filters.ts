import { z } from "zod";

/**
 * Filtres de suggestions - schéma Zod + logique pure (testable, sans I/O).
 *
 * Les filtres transitent par l'URL (searchParams, GET) : aucune Server Action
 * ni endpoint mutant n'est créé, donc pas de surface de rate-limit nouvelle.
 * La validation Zod reste exigée (cf. contrainte sécurité du brief) : toute
 * valeur hors-bornes ou mal typée est silencieusement ignorée (filtre absent),
 * jamais propagée. On ne filtre QUE sur des champs publics avant match (âge et
 * vérification de l'email). Un filtre familial permettrait d'inférer une donnée
 * masquée par simple comparaison des résultats.
 */
export const filtersSchema = z.object({
  ageMin: z.coerce.number().int().min(18).max(99).optional().catch(undefined),
  ageMax: z.coerce.number().int().min(18).max(99).optional().catch(undefined),
  /** présence de "1" ⇒ adresses email vérifiées uniquement */
  verified: z.literal("1").optional().catch(undefined),
});

export type Filters = z.infer<typeof filtersSchema>;

/** Forme minimale qu'un profil doit exposer pour être filtré. */
export type FilterableProfile = {
  age: number;
  isVerified: boolean;
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
  return true;
}

export function applyFilters<T extends FilterableProfile>(
  list: T[],
  f: Filters,
): T[] {
  return list.filter((p) => matchesFilters(p, f));
}

/** Nombre de filtres actifs - alimente le badge du tiroir. */
export function activeFilterCount(f: Filters): number {
  let n = 0;
  if (f.ageMin != null) n++;
  if (f.ageMax != null) n++;
  if (f.verified === "1") n++;
  return n;
}
