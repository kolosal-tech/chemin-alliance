"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Icon } from "./icons";
import { AsyncButton } from "@/components/AsyncButton";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

/**
 * Bouton « Installer l'application » (PWA). Utilise beforeinstallprompt
 * (Chromium). Masque l'état si déjà installée. iOS Safari n'émet pas
 * l'événement : on garde le bouton, l'incitation détaillée vit dans
 * <InstallPrompt /> (bannière flottante existante).
 */
export function InstallButton() {
  const t = useTranslations("home.download");
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(
    null,
  );
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const standalone =
      window.matchMedia?.("(display-mode: standalone)").matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone ===
        true;
    if (standalone) setInstalled(true);

    const onBIP = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onBIP);
    const onInstalled = () => setInstalled(true);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBIP);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  async function install() {
    if (!deferred) return;
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    if (outcome === "accepted") setInstalled(true);
    setDeferred(null);
  }

  if (installed) {
    return (
      <span className="inline-flex items-center justify-center gap-2 rounded-btnlg border border-sage/40 bg-sage/10 px-6 py-4 text-[16px] font-semibold text-sage">
        <Icon name="check" className="h-[18px] w-[18px]" strokeWidth={2.2} />
        {t("installed")}
      </span>
    );
  }

  return (
    <AsyncButton
      onClick={install}
      disabled={!deferred}
      className="inline-flex items-center justify-center gap-2 rounded-btnlg bg-gold px-6 py-4 text-[16px] font-semibold text-night transition-colors hover:bg-gold-deep hover:text-cream disabled:cursor-default disabled:opacity-60 dark:bg-gold-light dark:hover:bg-gold"
    >
      <Icon name="download" className="h-[18px] w-[18px]" strokeWidth={1.9} />
      {deferred ? t("install") : t("comingSoon")}
    </AsyncButton>
  );
}
