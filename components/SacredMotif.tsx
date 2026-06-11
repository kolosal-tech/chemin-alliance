/**
 * Motifs sacrés discrets — SVG line-art en dégradé doré→bleu,
 * opacité .05–.10, arrière-plan (z négatif), flottement léger
 * (désactivé via prefers-reduced-motion en CSS).
 */
type Variant = "dove" | "olive" | "tree" | "flame";

const PATHS: Record<Variant, JSX.Element> = {
  dove: (
    <g fill="none" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M60 180c40-30 90-40 150-30-20-35-10-70 20-90-5 35 10 55 45 60 40 6 70 30 80 70-60-15-110-5-150 25-45 35-95 40-145-35Z" />
      <path d="M210 150c25-20 60-25 95-15" />
      <path d="M330 120l40-18-26 36" />
    </g>
  ),
  olive: (
    <g fill="none" strokeWidth="2.5" strokeLinecap="round">
      <path d="M40 320C140 240 260 160 380 80" />
      <path d="M120 256c-30-8-44-28-40-58 28 8 42 28 40 58Zm0 0c8-30 28-44 58-42-8 30-28 44-58 42ZM210 188c-30-8-44-28-40-58 28 8 42 28 40 58Zm0 0c8-30 28-44 58-42-8 30-28 44-58 42ZM300 122c-30-8-44-28-40-58 28 8 42 28 40 58Zm0 0c8-30 28-44 58-42-8 30-28 44-58 42Z" />
    </g>
  ),
  tree: (
    <g fill="none" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M200 360V200m0 0c-60 0-100-40-100-100 60 0 100 40 100 100Zm0 0c60 0 100-40 100-100-60 0-100 40-100 100Zm0-60c0-50 30-80 80-90m-160 90c0-50-30-80-80-90" />
      <path d="M140 360h120" />
    </g>
  ),
  flame: (
    <g fill="none" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M200 60c40 60 80 100 80 160a80 80 0 0 1-160 0c0-60 40-100 80-160Z" />
      <path d="M200 160c18 28 36 48 36 76a36 36 0 0 1-72 0c0-28 18-48 36-76Z" />
    </g>
  ),
};

export function SacredMotif({
  variant = "dove",
  className = "",
}: {
  variant?: Variant;
  className?: string;
}) {
  const id = `motif-grad-${variant}`;
  return (
    <div
      aria-hidden
      className={`motif-float pointer-events-none absolute -z-10 ${className}`}
    >
      <svg width="420" height="400" viewBox="0 0 420 400" className="opacity-[.07] dark:opacity-[.09]">
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#C9A84C" />
            <stop offset="100%" stopColor="#1A2744" />
          </linearGradient>
        </defs>
        <g stroke={`url(#${id})`}>{PATHS[variant]}</g>
      </svg>
    </div>
  );
}
