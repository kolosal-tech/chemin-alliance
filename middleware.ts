import createMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";
import { routing } from "./i18n/routing";

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
    // L'upload de photo est multipart (jusqu'a 5 Mio) et applique sa propre
    // borne de taille + allow-list dans le handler (lib/storage). Le plafond
    // JSON de 256 Kio rejetterait toute photo de telephone en 413 avant meme
    // d'atteindre la route : on l'exclut explicitement.
    if (req.nextUrl.pathname === "/api/me/photo") {
      return NextResponse.next();
    }
    if (MUTATING.has(req.method)) {
      const declared = Number(req.headers.get("content-length") ?? "");
      if (Number.isFinite(declared) && declared > MAX_API_BODY_BYTES) {
        return NextResponse.json(
          { error: "PAYLOAD_TOO_LARGE", message: "Request body too large" },
          { status: 413 },
        );
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
