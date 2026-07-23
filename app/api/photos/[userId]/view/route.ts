import { jsonError, withErrors } from "@/lib/api-helpers";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/security/session";
import { canSeeField } from "@/lib/visibility";
import { blurredVariantPath, signedPhotoUrl } from "@/lib/storage";
import { unblockedMatchWhere } from "@/lib/blocks";
import {
  activeSensitiveDataConsentPairWhere,
  activeSensitiveDataConsentUserWhere,
} from "@/lib/sensitive-data-consent";

/**
 * Proxy AUTORISÉ de la photo d'un AUTRE membre - cœur du pipeline sécurisé.
 *
 * La photo d'autrui ne transite JAMAIS en clair vers un viewer non autorisé :
 * - pas de match actif → 403 (le client n'affiche que la silhouette BlurHash) ;
 * - match actif, stade < DISCERNMENT → variante MOYENNEMENT floutée (octets
 *   réels mais visage non reconstituable) ;
 * - match actif, stade ≥ DISCERNMENT → photo pleine.
 *
 * La décision réutilise `canSeeField()` (même moteur que les champs profil), sur
 * le `Match.stage`. L'URL signée Supabase ne quitte pas le serveur. La réponse
 * est `private` et à TTL court pour que la révélation (changement de stade) se
 * propage vite. Runtime Node (fetch + service key via signedPhotoUrl).
 */
export const runtime = "nodejs";

export const GET = withErrors(
  async (
    _req: Request,
    { params }: { params: Promise<{ userId: string }> },
  ) => {
    const viewer = await requireUser();
    const targetId = (await params).userId;
    const isSelf = targetId === viewer.id;

    // Pour autrui, l'autorisation ACTIVE + non bloquée est résolue avant de
    // lire le chemin de stockage de la photo.
    const match = isSelf
      ? null
      : await prisma.match.findFirst({
          where: {
            AND: [
              unblockedMatchWhere(viewer.id),
              activeSensitiveDataConsentPairWhere,
              {
                status: "ACTIVE",
                OR: [
                  { userAId: viewer.id, userBId: targetId },
                  { userAId: targetId, userBId: viewer.id },
                ],
              },
            ],
          },
          select: { stage: true },
        });
    if (!isSelf && !match) return jsonError(403, "FORBIDDEN");

    const target = await prisma.user.findFirst({
      where: { id: targetId, ...activeSensitiveDataConsentUserWhere },
      select: { photoUrl: true },
    });

    const ctx = { matched: Boolean(match), stage: match?.stage ?? null };
    const showFull = isSelf || canSeeField("AFTER_DISCERNMENT", ctx);
    const showBlurred = !showFull && !isSelf && canSeeField("AFTER_MATCH", ctx);

    // Ni plein ni flouté autorisé → on ne révèle rien (même pas l'existence de
    // la photo) : le client garde la silhouette BlurHash.
    if (!showFull && !showBlurred) return jsonError(403, "FORBIDDEN");

    if (!target?.photoUrl) return jsonError(404, "NO_PHOTO");

    let signed: string | null;
    if (showFull) {
      signed = await signedPhotoUrl(target.photoUrl);
    } else {
      const vpath = blurredVariantPath(target.photoUrl);
      signed = vpath ? await signedPhotoUrl(vpath) : null;
    }
    if (!signed) return jsonError(404, "NO_PHOTO");

    const upstream = await fetch(signed, { cache: "no-store" });
    if (!upstream.ok) return jsonError(502, "PHOTO_FETCH_FAILED");

    const bytes = await upstream.arrayBuffer();
    return new Response(bytes, {
      status: 200,
      headers: {
        "content-type": upstream.headers.get("content-type") ?? "image/jpeg",
        "cache-control": "private, max-age=60",
      },
    });
  },
);
