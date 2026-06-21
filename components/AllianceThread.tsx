import { useTranslations } from "next-intl";

const STAGES = [
  "DISCOVERY",
  "DIALOGUE",
  "DISCERNMENT",
  "ACCOMPANIMENT",
  "COMMITMENT",
  "MARRIAGE_PREPARATION",
] as const;

type Props = {
  current: number; // 1..6
  orientation?: "horizontal" | "vertical";
  showLabels?: boolean;
  className?: string;
};

/**
 * <AllianceThread> - la signature visuelle "fil continu".
 * Un fil doré relie les 6 étapes et s'épaissit avec la progression.
 */
export function AllianceThread({
  current,
  orientation = "horizontal",
  showLabels = true,
  className,
}: Props) {
  const t = useTranslations("stages");
  const idx = Math.min(Math.max(current, 1), 6) - 1;

  if (orientation === "vertical") {
    const H = 520;
    const ys = STAGES.map((_, i) => 14 + (i * (H - 28)) / 5);
    return (
      <div className={`flex gap-[18px] ${className ?? ""}`}>
        <svg
          width="22"
          height={H}
          viewBox={`0 0 22 ${H}`}
          className="flex-none"
          aria-hidden
        >
          <line
            x1="11"
            y1={ys[0]}
            x2="11"
            y2={ys[5]}
            className="stroke-sand-300 dark:stroke-anthracite-600"
            strokeWidth="2.5"
          />
          <line
            x1="11"
            y1={ys[0]}
            x2="11"
            y2={ys[idx]}
            className="stroke-gold dark:stroke-gold-light"
            strokeWidth="3.5"
            strokeLinecap="round"
          />
          {ys.map((y, i) => (
            <circle
              key={i}
              cx="11"
              cy={y}
              r={i === idx ? 9 : i < idx ? 8 : 6}
              className={
                i < idx
                  ? "fill-gold dark:fill-gold-light"
                  : i === idx
                    ? "fill-gold dark:fill-gold-light stroke-cream dark:stroke-anthracite-900"
                    : "fill-cream dark:fill-anthracite-900 stroke-sand-400 dark:stroke-anthracite-600"
              }
              strokeWidth={i === idx ? 3 : 2.5}
            />
          ))}
        </svg>
        {showLabels && (
          <div className="flex h-[520px] flex-1 flex-col justify-between py-0.5">
            {STAGES.map((s, i) => (
              <div key={s}>
                <div
                  className={`font-display text-[19px] ${
                    i === idx
                      ? "font-medium text-gold-deep dark:text-gold-light"
                      : i < idx
                        ? "text-night dark:text-[#ECE7DD]"
                        : "text-sand-500 dark:text-[#65625B]"
                  }`}
                >
                  {t(s)}
                </div>
                <div className="mt-px text-[13px] text-sand-600 dark:text-[#7E7A72]">
                  {t(`desc${s}`)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  const xs = STAGES.map((_, i) => 14 + (i * 308) / 5);
  return (
    <div className={className}>
      <svg
        width="100%"
        height="40"
        viewBox="0 0 336 40"
        preserveAspectRatio="none"
        aria-hidden
      >
        <line
          x1={xs[0]}
          y1="20"
          x2={xs[5]}
          y2="20"
          className="stroke-sand-300 dark:stroke-anthracite-600"
          strokeWidth="2.5"
        />
        <line
          x1={xs[0]}
          y1="20"
          x2={xs[idx]}
          y2="20"
          className="stroke-gold dark:stroke-gold-light"
          strokeWidth="3.5"
          strokeLinecap="round"
        />
        {xs.map((x, i) => (
          <circle
            key={i}
            cx={x}
            cy="20"
            r={i === idx ? 8 : i < idx ? 6 : 5}
            className={
              i < idx
                ? "fill-gold dark:fill-gold-light"
                : i === idx
                  ? "fill-gold dark:fill-gold-light stroke-cream dark:stroke-anthracite-900"
                  : "fill-cream dark:fill-anthracite-900 stroke-sand-400 dark:stroke-anthracite-600"
            }
            strokeWidth={i === idx ? 3 : 2}
          />
        ))}
      </svg>
      {showLabels && (
        <div className="lbl -mt-1 grid grid-cols-6 gap-0.5 text-[8px] text-sand-500 dark:text-[#65625B]">
          {STAGES.map((s, i) => (
            <span
              key={s}
              title={t(s)}
              className={`truncate text-center ${
                i === idx
                  ? "font-medium text-night dark:text-[#ECE7DD]"
                  : i < idx
                    ? "text-gold-deep dark:text-gold-light"
                    : ""
              }`}
            >
              {t(s)}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
