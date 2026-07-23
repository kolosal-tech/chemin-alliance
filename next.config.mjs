import createNextIntlPlugin from "next-intl/plugin";
import withPWAInit from "@ducanh2912/next-pwa";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const withPWA = withPWAInit({
  dest: "public",
  customWorkerSrc: "worker",
  disable: process.env.NODE_ENV === "development",
  // Les pages changent selon l'identité connectée. Elles ne doivent jamais être
  // conservées entre deux sessions sur un appareil partagé.
  cacheStartUrl: false,
  cacheOnFrontEndNav: false,
  aggressiveFrontEndNavCaching: false,
  reloadOnOnline: true,
  // Le nouveau service worker prend la main DES son installation, sans attendre
  // la fermeture de tous les onglets/PWA : un deploy se propage des la prochaine
  // ouverture (sinon l'ancien shell cache reste affiche, ex. un onglet retire).
  workboxOptions: {
    skipWaiting: true,
    clientsClaim: true,
    // Remplace entièrement les stratégies par défaut de next-pwa. Ses caches
    // `apis`, `pages` et `pages-rsc` conserveraient sinon pendant 24 h des
    // réponses authentifiées (messages, export RGPD, profils, administration).
    runtimeCaching: [
      {
        urlPattern: ({ sameOrigin, url }) =>
          sameOrigin && url.pathname.startsWith("/api/"),
        handler: "NetworkOnly",
        method: "GET",
      },
      {
        urlPattern: ({ request, sameOrigin }) =>
          sameOrigin &&
          (request.mode === "navigate" ||
            request.destination === "document" ||
            request.headers.get("RSC") === "1"),
        handler: "NetworkOnly",
      },
      {
        urlPattern: ({ sameOrigin, url }) =>
          sameOrigin && url.pathname.startsWith("/_next/static/"),
        handler: "CacheFirst",
        options: {
          cacheName: "static-next-assets-v1",
          expiration: {
            maxEntries: 160,
            maxAgeSeconds: 30 * 24 * 60 * 60,
          },
        },
      },
      {
        urlPattern: ({ sameOrigin, url }) =>
          sameOrigin &&
          (url.pathname.startsWith("/icons/") ||
            url.pathname === "/favicon.ico" ||
            url.pathname === "/manifest.webmanifest"),
        handler: "CacheFirst",
        options: {
          cacheName: "static-pwa-assets-v1",
          expiration: {
            maxEntries: 16,
            maxAgeSeconds: 30 * 24 * 60 * 60,
          },
        },
      },
    ],
  },
  fallbacks: {
    document: "/fr/offline",
  },
});

const isDevelopment = process.env.NODE_ENV === "development";

const securityHeaders = [
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      // Le runtime React Refresh de Next en développement repose sur eval.
      // Cette exception n'est jamais émise dans les réponses de production.
      `script-src 'self' 'unsafe-inline'${isDevelopment ? " 'unsafe-eval'" : ""}`,
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https://*.supabase.co",
      "font-src 'self' data:",
      `connect-src 'self'${isDevelopment ? " ws: wss:" : ""}`,
      "object-src 'none'",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; "),
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
];

// Ces URL contiennent un bearer dans le chemin. Elles ne doivent être ni
// mises en cache, ni indexées, ni transmises comme Referer.
const bearerPrivateHeaders = [
  {
    key: "Cache-Control",
    value: "private, no-store, max-age=0, must-revalidate",
  },
  { key: "Pragma", value: "no-cache" },
  { key: "Expires", value: "0" },
  { key: "Referrer-Policy", value: "no-referrer" },
  {
    key: "X-Robots-Tag",
    value: "noindex, nofollow, noarchive, nosnippet",
  },
];

// Les API transportent de l'état authentifié, des erreurs d'autorisation ou
// des décisions de rate-limit. Le header doit s'appliquer même lorsqu'un
// middleware/guard répond avant le handler métier.
const apiPrivateHeaders = [
  {
    key: "Cache-Control",
    value: "private, no-store, max-age=0, must-revalidate",
  },
  { key: "Pragma", value: "no-cache" },
  { key: "Expires", value: "0" },
  { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ["@node-rs/argon2", "@prisma/client", "web-push"],
  async headers() {
    const headers = [
      { source: "/(.*)", headers: securityHeaders },
      { source: "/api/:path*", headers: apiPrivateHeaders },
      {
        source: "/:locale/parrain/:token",
        headers: bearerPrivateHeaders,
      },
      {
        source: "/api/blessing/:token",
        headers: bearerPrivateHeaders,
      },
      // Le format sans segment couvre aussi l'ancien lien `?token=...`.
      {
        source: "/:locale/reset-password",
        headers: bearerPrivateHeaders,
      },
      {
        source: "/:locale/reset-password/:token",
        headers: bearerPrivateHeaders,
      },
      {
        source: "/api/auth/verify-email",
        headers: bearerPrivateHeaders,
      },
      {
        source: "/api/auth/verify-email/:token",
        headers: bearerPrivateHeaders,
      },
    ];
    if (process.env.VERCEL_ENV === "preview" || process.env.STAGING === "1") {
      headers.push({
        source: "/(.*)",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      });
    }
    return headers;
  },
};

export default withPWA(withNextIntl(nextConfig));
