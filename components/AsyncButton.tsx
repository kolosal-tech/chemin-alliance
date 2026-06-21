"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type MouseEvent,
  type ReactNode,
} from "react";
import { Spinner } from "./Spinner";

type Props = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onClick"> & {
  /** Handler éventuellement asynchrone. Le bouton reste « occupé » jusqu'à sa résolution. */
  onClick?: (e: MouseEvent<HTMLButtonElement>) => void | Promise<void>;
  /** Contenu affiché pendant l'action (défaut : la moulinette + les enfants). */
  pendingLabel?: ReactNode;
  children: ReactNode;
};

/**
 * Bouton à retour visuel systématique : pendant que l'action (souvent réseau)
 * est en cours, il se désactive, affiche une moulinette et bloque tout nouveau
 * clic (anti double-soumission). Remplace `<button onClick={asyncFn}>` partout
 * où l'utilisateur ne savait pas si son clic avait été pris en compte.
 */
export function AsyncButton({
  onClick,
  pendingLabel,
  children,
  disabled,
  className,
  type = "button",
  ...rest
}: Props) {
  const [pending, setPending] = useState(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const handle = useCallback(
    async (e: MouseEvent<HTMLButtonElement>) => {
      if (pending || disabled || !onClick) return;
      try {
        setPending(true);
        await onClick(e);
      } finally {
        // Le handler peut démonter le composant (navigation) : on ne touche
        // l'état que si on est encore monté.
        if (mounted.current) setPending(false);
      }
    },
    [pending, disabled, onClick],
  );

  return (
    <button
      {...rest}
      type={type}
      onClick={handle}
      disabled={disabled || pending}
      aria-busy={pending}
      className={className}
    >
      {pending ? (
        <span className="inline-flex items-center justify-center gap-2">
          <Spinner className="h-4 w-4" />
          <span>{pendingLabel ?? children}</span>
        </span>
      ) : (
        children
      )}
    </button>
  );
}
