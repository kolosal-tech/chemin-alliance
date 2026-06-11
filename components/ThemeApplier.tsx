"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * Ré-applique la classe `dark` après chaque navigation.
 * Le changement de locale re-rend le layout racine et React peut
 * réinitialiser la className de <html> — ce composant la restaure.
 */
export function ThemeApplier() {
  const pathname = usePathname();
  useEffect(() => {
    try {
      const stored = localStorage.getItem("ca-theme");
      const dark =
        stored === "dark" ||
        (!stored && window.matchMedia("(prefers-color-scheme: dark)").matches);
      document.documentElement.classList.toggle("dark", dark);
    } catch {}
  }, [pathname]);
  return null;
}
