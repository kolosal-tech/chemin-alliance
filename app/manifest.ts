import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Chemin d'Alliance",
    short_name: "Alliance",
    description: "Se rencontrer avec foi, discernement et confidentialité.",
    id: "/fr",
    start_url: "/fr",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    theme_color: "#131D33",
    background_color: "#131D33",
    lang: "fr",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icons/maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
