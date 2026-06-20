import { jsonError, withErrors } from "@/lib/api-helpers";
import { requireUser } from "@/lib/security/session";
import { signedPhotoUrl } from "@/lib/storage";

// Proxy MÊME-ORIGINE de la photo du compte courant : sert les octets de l'image
// depuis notre domaine. Sans ça, le service worker PWA casse les <img> Supabase
// cross-origin (net::ERR_FAILED) et la photo n'apparaît jamais. Bonus : l'URL
// signée Supabase ne quitte pas le serveur. Runtime Node (fetch + clés).
export const runtime = "nodejs";

export const GET = withErrors(async () => {
  const user = await requireUser();
  const signed = await signedPhotoUrl(user.photoUrl);
  if (!signed) return jsonError(404, "NO_PHOTO");

  const upstream = await fetch(signed, { cache: "no-store" });
  if (!upstream.ok) return jsonError(502, "PHOTO_FETCH_FAILED");

  const bytes = await upstream.arrayBuffer();
  return new Response(bytes, {
    status: 200,
    headers: {
      "content-type": upstream.headers.get("content-type") ?? "image/jpeg",
      // Privé (photo par utilisateur). Le `?v=` côté appelant invalide à chaque
      // changement de photo, donc on peut garder un cache long.
      "cache-control": "private, max-age=3600",
    },
  });
});
