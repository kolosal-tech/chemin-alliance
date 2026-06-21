"use client";

import { useState } from "react";
import { BlurhashImage } from "@/components/BlurhashImage";

/**
 * Avatar d'un AUTRE membre - révélation progressive pilotée par le SERVEUR.
 *
 * Trois couches empilées, du fond vers l'avant :
 *  1. dégradé de marque (toujours, repli ultime) ;
 *  2. silhouette BlurHash (si empreinte connue) - aucun octet de la vraie photo ;
 *  3. photo servie par le proxy autorisé `/api/photos/{userId}/view`.
 *
 * Le proxy décide SEUL ce qu'il renvoie selon `Match.stage` (403 pré-match →
 * silhouette ; variante floutée < DISCERNMENT ; photo pleine ≥ DISCERNMENT). Le
 * client n'a donc AUCUNE logique de stade : il tente la photo et, si le serveur
 * refuse (403/404/502), `onError` la masque et la silhouette/dégradé reste. La
 * photo n'apparaît qu'après `onLoad` (pas d'icône image cassée qui clignote).
 */
const GRADIENTS = [
  "radial-gradient(110% 90% at 35% 25%, #6E7790 0%, #41506E 50%, #222F4C 100%)",
  "radial-gradient(110% 90% at 40% 30%, #8A7A6A 0%, #5C4D44 60%, #352A28 100%)",
  "radial-gradient(110% 90% at 30% 25%, #6F8478 0%, #43564B 50%, #26342C 100%)",
];

function gradientFor(userId: string): string {
  let sum = 0;
  for (let i = 0; i < userId.length; i++) sum += userId.charCodeAt(i);
  return GRADIENTS[sum % GRADIENTS.length];
}

export function MemberAvatar({
  userId,
  photoBlurhash,
  className = "",
  alt = "",
}: {
  userId: string;
  photoBlurhash?: string | null;
  className?: string;
  alt?: string;
}) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  return (
    <span
      className={`relative block overflow-hidden ${className}`}
      style={{ background: gradientFor(userId) }}
      aria-hidden={alt ? undefined : true}
    >
      {photoBlurhash && (
        <BlurhashImage
          hash={photoBlurhash}
          className="absolute inset-0 h-full w-full object-cover"
        />
      )}
      {!failed && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`/api/photos/${userId}/view`}
          alt={alt}
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-500 ${
            loaded ? "opacity-100" : "opacity-0"
          }`}
        />
      )}
    </span>
  );
}
