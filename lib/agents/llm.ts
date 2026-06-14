import { z } from "zod";
import { callLLM } from "@/lib/llm/gateway";

/**
 * Appel LLM mutualisé pour tous les agents — délègue à la passerelle unique
 * (matrice de modèles, purge PII, opt-out collecte, fallback en chaîne).
 * Règle de la maison : chaque agent DOIT fournir un fallback déterministe —
 * l'application complète fonctionne sans clé API et sans réseau.
 * Les agents relèvent de l'étape "accompagnement" (synthèse, vigilance).
 */
export async function completeText(
  system: string,
  user: string,
  maxTokens = 700,
): Promise<string | null> {
  return callLLM({ system, user, step: "accompaniment", maxTokens });
}

/**
 * Sortie structurée : demande du JSON au LLM, extrait, valide avec Zod.
 * null si le LLM est absent, en panne ou hors schéma -> fallback appelant.
 */
export async function completeJson<T>(
  system: string,
  user: string,
  schema: z.ZodType<T>,
  maxTokens = 900,
): Promise<T | null> {
  const raw = await completeText(
    `${system}\nRéponds UNIQUEMENT avec un objet JSON valide, sans texte autour, sans balises markdown.`,
    user,
    maxTokens,
  );
  if (!raw) return null;
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    const parsed = schema.safeParse(JSON.parse(match[0]));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}
