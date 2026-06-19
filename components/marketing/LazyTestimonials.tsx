"use client";

import dynamic from "next/dynamic";

/**
 * Chargement différé du carrousel (perf) : code-split + ssr:false, avec
 * squelette pendant le chargement. Wrapper client car `ssr:false` n'est
 * pas autorisé dans un Server Component.
 */
const TestimonialsCarousel = dynamic(
  () => import("./TestimonialsCarousel").then((m) => m.TestimonialsCarousel),
  {
    ssr: false,
    loading: () => (
      <div className="mx-auto mt-10 max-w-3xl">
        <div className="h-56 animate-pulse rounded-cardlg border border-sand-300 bg-surface dark:border-anthracite-600 dark:bg-anthracite-800" />
      </div>
    ),
  },
);

export function LazyTestimonials() {
  return <TestimonialsCarousel />;
}
