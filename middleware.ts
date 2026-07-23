import createMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";
import { routing } from "./i18n/routing";
import {
  isUntrustedMutationRequest,
  requestTargetOrigin,
} from "./lib/security/request-origin";

const intlMiddleware = createMiddleware(routing);

// Borne app-wide de la taille des bodies, AVANT que le handler ne parse.
// 256 Kio : large devant tous les caps metier (le plus gros champ libre fait
// 4000 caracteres), mais coupe net les POST de plusieurs Mo. Defense en
// profondeur ; les handlers sensibles resserrent encore via readJsonLimited.
const MAX_API_BODY_BYTES = 256 * 1024;
const MUTATING = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export default function middleware(req: NextRequest) {
  // Les routes /api ne passent pas par l'i18n : on n'applique QUE la garde de
  // taille, puis on laisse le handler s'executer (NextResponse.next()).
  if (req.nextUrl.pathname.startsWith("/api/")) {
    if (MUTATING.has(req.method)) {
      // La garde CSRF s'applique à TOUTES les mutations, y compris l'upload
      // multipart. Ne pas coupler cette décision à celle du plafond JSON.
      if (
        isUntrustedMutationRequest({
          method: req.method,
          requestOrigin: requestTargetOrigin({
            nextUrlOrigin: req.nextUrl.origin,
            hostHeader: req.headers.get("host"),
            forwardedHostHeader: req.headers.get("x-forwarded-host"),
            forwardedProtoHeader: req.headers.get("x-forwarded-proto"),
          }),
          originHeader: req.headers.get("origin"),
          secFetchSite: req.headers.get("sec-fetch-site"),
        })
      ) {
        return NextResponse.json(
          { error: "CROSS_SITE_REQUEST_REJECTED" },
          { status: 403 },
        );
      }

      // L'upload de photo est multipart (jusqu'à 5 Mio) et applique sa propre
      // borne dans le handler. Il reste protégé ci-dessus contre les requêtes
      // intersites, mais n'est pas soumis au plafond réservé aux petits bodies.
      if (req.nextUrl.pathname !== "/api/me/photo") {
        const declared = Number(req.headers.get("content-length") ?? "");
        if (Number.isFinite(declared) && declared > MAX_API_BODY_BYTES) {
          return NextResponse.json(
            { error: "PAYLOAD_TOO_LARGE", message: "Request body too large" },
            { status: 413 },
          );
        }
      }
    }
    return NextResponse.next();
  }
  // Pages : routage i18n next-intl inchange.
  return intlMiddleware(req);
}

export const config = {
  // Pages (hors api/assets) pour l'i18n + toutes les routes /api pour la garde.
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)", "/api/:path*"],
};
