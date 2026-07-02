"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/security/session";

// Les 3 champs "verrouillables" au coffre-fort : chacun vit sur un modèle
// différent (FaithProfile ou RelationshipProfile), voir DEFAULT_LEVEL ci-dessous.
const vaultFieldSchema = z.enum(["church", "testimony", "children"]);
export type VaultField = z.infer<typeof vaultFieldSchema>;

const setVaultLockSchema = z.object({
  field: vaultFieldSchema,
  locked: z.boolean(),
});

/**
 * Niveau de visibilité progressif par défaut de chaque champ (celui appliqué
 * au déverrouillage). Doit rester synchronisé avec les valeurs @default du
 * schéma Prisma (FaithProfile.localChurchVisibility / testimonyVisibility,
 * RelationshipProfile.childrenVisibility).
 */
const DEFAULT_LEVEL = {
  church: "AFTER_DISCERNMENT",
  testimony: "AFTER_MATCH",
  children: "AFTER_MATCH",
} as const;

type VaultActionResult = { ok: true } | { ok: false; error: string };

/**
 * Verrouille (PRIVATE) ou déverrouille (niveau progressif par défaut) un champ
 * sensible du profil. Verrouiller = le champ n'est plus jamais exposé, quel
 * que soit l'avancement du cheminement avec un match.
 */
export async function setVaultLock(
  field: VaultField,
  locked: boolean,
): Promise<VaultActionResult> {
  const parsed = setVaultLockSchema.safeParse({ field, locked });
  if (!parsed.success) {
    return { ok: false, error: "VALIDATION_ERROR" };
  }

  let user;
  try {
    user = await requireUser();
  } catch {
    return { ok: false, error: "UNAUTHORIZED" };
  }

  const level = parsed.data.locked
    ? "PRIVATE"
    : DEFAULT_LEVEL[parsed.data.field];

  try {
    switch (parsed.data.field) {
      case "church":
        await prisma.faithProfile.update({
          where: { userId: user.id },
          data: { localChurchVisibility: level },
        });
        break;
      case "testimony":
        await prisma.faithProfile.update({
          where: { userId: user.id },
          data: { testimonyVisibility: level },
        });
        break;
      case "children":
        await prisma.relationshipProfile.update({
          where: { userId: user.id },
          data: { childrenVisibility: level },
        });
        break;
    }
  } catch (err) {
    // P2025 = enregistrement introuvable (profil pas encore créé) : erreur
    // métier propre plutôt qu'un upsert (les autres colonnes obligatoires de
    // ces modèles - ex. RelationshipProfile.maritalStatus - ne sont pas
    // connues ici, un upsert silencieux serait incorrect).
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2025"
    ) {
      return { ok: false, error: "PROFILE_NOT_FOUND" };
    }
    console.error("[vault] setVaultLock", err);
    return { ok: false, error: "INTERNAL_ERROR" };
  }

  revalidatePath("/[locale]/settings/privacy", "page");
  return { ok: true };
}
