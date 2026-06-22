"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { AsyncButton } from "@/components/AsyncButton";

/**
 * Bouton « Se déconnecter ».
 *
 * Invalide le cookie de session (POST /api/auth/logout) puis renvoie vers la
 * page de connexion. S'appuie sur AsyncButton : moulinette de chargement +
 * blocage du double-clic pendant la requête. Accessible au clavier (bouton
 * natif), aria-busy géré par AsyncButton.
 */
export function LogoutButton() {
  const t = useTranslations("common");
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    router.push("/login");
    router.refresh();
  }

  return (
    <AsyncButton
      onClick={logout}
      className="btn-glass btn-glass-neutral flex w-full items-center justify-center gap-2 rounded-btnsm py-3.5 text-[13.5px] font-semibold"
    >
      {t("logout")}
    </AsyncButton>
  );
}
