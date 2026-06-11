import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

export default createMiddleware(routing);

export const config = {
  // Tout sauf API, fichiers Next et assets statiques
  matcher: "/((?!api|_next|_vercel|.*\\..*).*)",
};
