import { z } from "zod";
import { aiProvider, env } from "@/lib/env";

/**
 * Appel LLM mutualisé pour tous les agents.
 * Règle de la maison : chaque agent DOIT fournir un fallback déterministe —
 * l'application complète fonctionne sans clé API et sans réseau.
 */
export async function completeText(
  system: string,
  user: string,
  maxTokens = 700,
): Promise<string | null> {
  try {
    if (aiProvider === "anthropic") {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": env.ANTHROPIC_API_KEY!,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001",
          max_tokens: maxTokens,
          system,
          messages: [{ role: "user", content: user }],
        }),
      });
      if (!res.ok) return null;
      const data = (await res.json()) as {
        content: Array<{ type: string; text?: string }>;
      };
      return data.content.find((c) => c.type === "text")?.text?.trim() || null;
    }
    if (aiProvider === "openrouter" || aiProvider === "openai") {
      const base =
        aiProvider === "openrouter"
          ? "https://openrouter.ai/api/v1"
          : "https://api.openai.com/v1";
      const key =
        aiProvider === "openrouter"
          ? env.OPENROUTER_API_KEY!
          : env.OPENAI_API_KEY!;
      const model =
        aiProvider === "openrouter" ? env.OPENROUTER_MODEL : "gpt-4o-mini";
      const res = await fetch(`${base}/chat/completions`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${key}`,
          "HTTP-Referer": env.APP_URL,
          "X-Title": "Chemin d'Alliance",
        },
        body: JSON.stringify({
          model,
          max_tokens: maxTokens,
          messages: [
            { role: "system", content: system },
            { role: "user", content: user },
          ],
        }),
      });
      if (!res.ok) return null;
      const data = (await res.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      return data.choices?.[0]?.message?.content?.trim() || null;
    }
  } catch {
    // panne réseau/LLM -> null, l'appelant bascule sur son fallback
  }
  return null;
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
