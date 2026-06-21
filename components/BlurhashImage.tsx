"use client";

import { useEffect, useRef } from "react";
import { decode } from "blurhash";

/**
 * Rend un BlurHash en silhouette floue : canvas 32×40 décodé puis étiré en CSS
 * (lissage natif du navigateur → flou doux). AUCUN octet de la vraie photo —
 * seulement l'empreinte DCT. Si le hash est invalide/absent, le canvas reste
 * transparent et le fond du parent (dégradé de marque) prend le relais.
 */
export function BlurhashImage({
  hash,
  className,
  punch = 1,
}: {
  hash: string;
  className?: string;
  punch?: number;
}) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    try {
      const w = 32;
      const h = 40;
      const pixels = decode(hash, w, h, punch);
      const imageData = ctx.createImageData(w, h);
      imageData.data.set(pixels);
      ctx.putImageData(imageData, 0, 0);
    } catch {
      // Hash invalide → canvas laissé transparent ; le fallback parent gère.
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }, [hash, punch]);

  return (
    <canvas
      ref={ref}
      width={32}
      height={40}
      aria-hidden
      className={className}
    />
  );
}
