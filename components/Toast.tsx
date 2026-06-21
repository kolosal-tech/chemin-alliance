"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useTranslations } from "next-intl";

type ToastType = "success" | "error" | "info";
type ToastItem = { id: string; type: ToastType; message: string };

type ToastApi = {
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
};

const ToastContext = createContext<ToastApi | null>(null);

/**
 * Retourne l'API de toasts. Hors `ToastProvider` (tests, SSR d'un composant
 * client isolé) on renvoie un no-op : appeler `toast.success()` ne casse rien.
 */
export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  return (
    ctx ?? {
      success: () => {},
      error: () => {},
      info: () => {},
    }
  );
}

// Les erreurs restent plus longtemps (l'utilisateur doit pouvoir lire + agir).
const DURATION: Record<ToastType, number> = {
  success: 4500,
  info: 4500,
  error: 6500,
};

/**
 * Notifications éphémères, accessibles : chaque toast porte `role="alert"`
 * (erreur, annonce assertive) ou `role="status"` (succès/info, annonce polie),
 * se ferme tout seul et au clavier via un bouton de fermeture focusable.
 * Monté une seule fois (layout) au-dessus des modales (z-100 > z-50).
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const dismiss = useCallback((id: string) => {
    setToasts((list) => list.filter((x) => x.id !== id));
    const tm = timers.current[id];
    if (tm) {
      clearTimeout(tm);
      delete timers.current[id];
    }
  }, []);

  const push = useCallback(
    (type: ToastType, message: string) => {
      const id = crypto.randomUUID();
      setToasts((list) => [...list, { id, type, message }]);
      timers.current[id] = setTimeout(() => dismiss(id), DURATION[type]);
    },
    [dismiss],
  );

  const api = useMemo<ToastApi>(
    () => ({
      success: (m) => push("success", m),
      error: (m) => push("error", m),
      info: (m) => push("info", m),
    }),
    [push],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

const STYLES: Record<ToastType, string> = {
  success:
    "border-[#CFE0D4] bg-[#EAF0EB] text-[#2E5440] dark:border-[#2E4A38] dark:bg-[#16241B] dark:text-[#9FC7AC]",
  error:
    "border-[#E7C3BD] bg-[#FBEEEC] text-danger dark:border-[#5A2A22] dark:bg-[#2A1714] dark:text-[#E59B91]",
  info: "border-[#D4DAE4] bg-[#EAEDF2] text-[#2A3550] dark:border-[#2A3A56] dark:bg-[#1A2233] dark:text-[#B9C6E0]",
};

function ToastIcon({ type }: { type: ToastType }) {
  if (type === "success") {
    return (
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        className="mt-px flex-none"
        aria-hidden
      >
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" />
        <path
          d="M8.5 12.5l2.2 2.2 4.8-5"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  if (type === "error") {
    return (
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        className="mt-px flex-none"
        aria-hidden
      >
        <path
          d="M12 3l9 16H3L12 3Z"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
        <path
          d="M12 10v4M12 16.5h.01"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
        />
      </svg>
    );
  }
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      className="mt-px flex-none"
      aria-hidden
    >
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M12 11v5M12 8h.01"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ToastViewport({
  toasts,
  onDismiss,
}: {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}) {
  const t = useTranslations("common");
  // Conteneur rendu en permanence (même vide) : la région « live » doit
  // préexister dans le DOM, sinon le tout premier toast - injecté en même temps
  // que sa région - n'est pas annoncé de façon fiable par les lecteurs d'écran.
  return (
    <div className="pointer-events-none fixed inset-x-0 top-[max(env(safe-area-inset-top),12px)] z-[100] mx-auto flex w-[calc(100%-2rem)] max-w-sm flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role={toast.type === "error" ? "alert" : "status"}
          className={`pointer-events-auto flex items-start gap-2.5 rounded-[13px] border px-3.5 py-3 shadow-cardfeat ${STYLES[toast.type]}`}
        >
          <ToastIcon type={toast.type} />
          <p className="flex-1 text-[13px] leading-snug">{toast.message}</p>
          <button
            type="button"
            onClick={() => onDismiss(toast.id)}
            aria-label={t("close")}
            className="-mr-1 -mt-0.5 flex-none rounded p-1 opacity-70 transition-opacity hover:opacity-100 focus-visible:opacity-100"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden
            >
              <path
                d="M6 6l12 12M18 6L6 18"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
      ))}
    </div>
  );
}
