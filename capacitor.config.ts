import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Enveloppe Capacitor (iOS + Android).
 * L'app native charge la PWA déployée (server.url) - l'app Next.js est
 * full-stack (SSR + API), elle ne peut pas être exportée en statique.
 * Voir README § "Binaires iOS / Android".
 */
const config: CapacitorConfig = {
  appId: "app.cheminalliance",
  appName: "Chemin d'Alliance",
  webDir: "public",
  server: {
    url: process.env.CAP_SERVER_URL ?? "https://chemin-alliance.vercel.app",
    cleartext: false,
  },
  backgroundColor: "#131D33",
  ios: { contentInset: "always" },
};

export default config;
