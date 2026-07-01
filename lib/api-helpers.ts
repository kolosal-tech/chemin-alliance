import { NextResponse } from "next/server";
import { ZodError } from "zod";

export function jsonError(status: number, code: string, message?: string) {
  return NextResponse.json({ error: code, message }, { status });
}

/** Enveloppe un handler : erreurs Zod -> 400, UNAUTHORIZED -> 401, etc. */
export function withErrors<T extends unknown[]>(
  handler: (...args: T) => Promise<NextResponse | Response>,
) {
  return async (...args: T) => {
    try {
      return await handler(...args);
    } catch (err) {
      // Erreurs de contrôle interne Next (analyse statique) : relancer.
      if (
        typeof err === "object" &&
        err &&
        "digest" in err &&
        String((err as { digest: unknown }).digest).startsWith(
          "DYNAMIC_SERVER_USAGE",
        )
      ) {
        throw err;
      }
      if (err instanceof ZodError) {
        return jsonError(400, "VALIDATION_ERROR", err.issues[0]?.message);
      }
      const status =
        typeof err === "object" && err && "status" in err
          ? Number((err as { status: unknown }).status)
          : 500;
      if (status === 401) return jsonError(401, "UNAUTHORIZED");
      if (status === 403) return jsonError(403, "FORBIDDEN");
      if (status === 404) return jsonError(404, "NOT_FOUND");
      if (status === 413) return jsonError(413, "PAYLOAD_TOO_LARGE");
      if (status === 503) return jsonError(503, "SERVICE_UNAVAILABLE");
      console.error("[api]", err);
      return jsonError(500, "INTERNAL_ERROR");
    }
  };
}

/**
 * Extrait l'IP client pour les cles de rate-limit.
 *
 * On prefere "x-real-ip" quand il est present (identique a "x-forwarded-for"
 * sur Vercel, mais peut differer derriere d'autres proxys/CDN qui le posent
 * de facon fiable). En repli sur "x-forwarded-for", on prend le DERNIER
 * segment de la liste : c'est celui ajoute par le proxy de confiance le plus
 * proche de nous, jamais le premier segment qui peut etre injecte par le
 * client lui-meme (`X-Forwarded-For: 1.2.3.4` arbitraire dans la requete).
 * Sur Vercel, ce header est de toute facon reecrit a l'edge (IP externe non
 * transmise), donc ce choix est surtout une defense en profondeur si l'app
 * tourne un jour derriere un autre proxy/CDN qui, lui, concatene.
 */
export function clientIp(req: Request): string {
  const real = req.headers.get("x-real-ip");
  if (real) return real.trim();
  const xff = req.headers.get("x-forwarded-for");
  if (xff) {
    const parts = xff
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (parts.length > 0) return parts[parts.length - 1];
  }
  return "local";
}

/** Plafond par defaut des bodies JSON (64 Kio) - large devant tous les caps metier. */
export const MAX_JSON_BYTES = 64 * 1024;

/** Erreur taggee 413 - mappee en PAYLOAD_TOO_LARGE par withErrors. */
export class PayloadTooLargeError extends Error {
  readonly status = 413;
  constructor(maxBytes: number) {
    super(`Body too large (max ${maxBytes} bytes)`);
    this.name = "PayloadTooLargeError";
  }
}

/**
 * Lit et parse un body JSON en bornant la taille AVANT le parse.
 *
 * Defense en profondeur cote handler : complete la garde Content-Length du
 * middleware en couvrant le cas d'un Content-Length absent ou forge. Le flux
 * est lu par morceaux et INTERROMPU des que le cumul depasse `maxBytes`, donc
 * un body geant n'est jamais entierement bufferise. Rejette en 413 au-dela.
 *
 * Remplace `await req.json()` : `const body = schema.parse(await readJsonLimited(req));`
 */
export async function readJsonLimited<T = unknown>(
  req: Request,
  maxBytes: number = MAX_JSON_BYTES,
): Promise<T> {
  // Fast-path : Content-Length annonce > plafond -> rejet immediat.
  const declared = Number(req.headers.get("content-length") ?? "");
  if (Number.isFinite(declared) && declared > maxBytes) {
    throw new PayloadTooLargeError(maxBytes);
  }

  const reader = req.body?.getReader();
  if (!reader) {
    // Pas de corps (ex. body vide) : laisse JSON.parse lever comme req.json().
    return JSON.parse("") as T;
  }

  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel();
        throw new PayloadTooLargeError(maxBytes);
      }
      chunks.push(value);
    }
  }

  const text = Buffer.concat(chunks).toString("utf8");
  return JSON.parse(text) as T;
}
