/**
 * Jeu d'icônes line-art de la couche marketing — cohérent avec le SVG
 * existant du projet (stroke arrondi, currentColor). Server-safe.
 *
 * NB : pas de logos de marque réels (App Store / Play). Les badges de store
 * utilisent un glyph générique `device` + texte localisé (placeholders).
 */
import type { JSX } from "react";

export type MarketingIcon =
  | "shield"
  | "compass"
  | "door"
  | "people"
  | "charity"
  | "respect"
  | "purity"
  | "truth"
  | "chat"
  | "scale"
  | "hands"
  | "ring"
  | "home"
  | "star"
  | "sparkle"
  | "check"
  | "lock"
  | "arrowRight"
  | "device"
  | "play"
  | "download";

const PATHS: Record<MarketingIcon, JSX.Element> = {
  shield: (
    <path d="M12 3l7 3v5c0 4.5-3 7.6-7 9-4-1.4-7-4.5-7-9V6l7-3Zm-2.5 8.5l1.8 1.8 3.4-3.6" />
  ),
  compass: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M15.5 8.5l-2 5-5 2 2-5 5-2Z" />
    </>
  ),
  door: (
    <>
      <path d="M14 4H6v16h8" />
      <path d="M11 12h9m0 0l-3-3m3 3l-3 3" />
    </>
  ),
  people: (
    <>
      <circle cx="9" cy="8" r="3" />
      <path d="M3.5 19a5.5 5.5 0 0 1 11 0" />
      <path d="M16 5.5a3 3 0 0 1 0 5.4M16.5 19a5.5 5.5 0 0 0-2-4.3" />
    </>
  ),
  charity: (
    <path d="M12 20s-7-4.3-7-9.2A4.2 4.2 0 0 1 12 7a4.2 4.2 0 0 1 7 3.8C19 15.7 12 20 12 20Z" />
  ),
  respect: (
    <>
      <path d="M3 12l3-1 4 3 3-2" />
      <path d="M21 12l-3-1-4 3-2-1.5" />
      <path d="M10 14l2 2 2-2" />
    </>
  ),
  purity: (
    <>
      <path d="M12 3c2.5 2 2.5 5 0 7-2.5-2-2.5-5 0-7Z" />
      <path d="M12 10v11M8 21h8M7 14c2 0 3.5 1.5 5 3-2.5 1-4.5-.5-5-3Zm10 0c-2 0-3.5 1.5-5 3 2.5 1 4.5-.5 5-3Z" />
    </>
  ),
  truth: (
    <>
      <path d="M12 3l2.2 1.6 2.7-.2 1 2.5 2.3 1.4-.6 2.7.6 2.7-2.3 1.4-1 2.5-2.7-.2L12 21l-2.2-1.6-2.7.2-1-2.5L3.8 15.8l.6-2.7-.6-2.7 2.3-1.4 1-2.5 2.7.2L12 3Z" />
      <path d="M9 12l2 2 4-4" />
    </>
  ),
  chat: <path d="M5 5h14v10H9l-4 4V5Z" />,
  scale: (
    <path d="M12 4v16M7 20h10M5 8h14M5 8l-2.5 5a2.5 2.5 0 0 0 5 0L5 8Zm14 0l-2.5 5a2.5 2.5 0 0 0 5 0L19 8Z" />
  ),
  hands: (
    <>
      <path d="M3 13l4-3 5 3 5-3 4 3" />
      <path d="M3 13v3l9 4 9-4v-3" />
    </>
  ),
  ring: (
    <>
      <circle cx="12" cy="14" r="5.5" />
      <path d="M9.5 8.5L12 4l2.5 4.5" />
    </>
  ),
  home: <path d="M4 11l8-7 8 7M6 9.5V20h12V9.5M10 20v-5h4v5" />,
  star: (
    <path d="M12 3.5l2.6 5.6 6 .7-4.4 4.1 1.2 6L12 17l-5.4 3 1.2-6L3.4 9.8l6-.7L12 3.5Z" />
  ),
  sparkle: (
    <path d="M12 3l1.8 4.7L18.5 9l-4.7 1.8L12 15l-1.8-4.2L5.5 9l4.7-1.3L12 3Z" />
  ),
  check: <path d="M5 12.5l4.5 4.5L19 7" />,
  lock: (
    <>
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </>
  ),
  arrowRight: <path d="M5 12h14m0 0l-6-6m6 6l-6 6" />,
  device: (
    <>
      <rect x="7" y="3" width="10" height="18" rx="2.5" />
      <path d="M10.5 18h3" />
    </>
  ),
  play: <path d="M6 4l13 8-13 8V4Z" fill="currentColor" stroke="none" />,
  download: <path d="M12 4v11m0 0l-4-4m4 4l4-4M5 19h14" />,
};

export function Icon({
  name,
  className = "h-6 w-6",
  strokeWidth = 1.6,
}: {
  name: MarketingIcon;
  className?: string;
  strokeWidth?: number;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      {PATHS[name]}
    </svg>
  );
}
