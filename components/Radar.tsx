import { useTranslations } from "next-intl";

type Axes = {
  faith: number;
  children: number;
  finances: number;
  location: number;
  vision: number;
};

/**
 * Radar SOBRE - "sujets à approfondir", jamais un score chiffré.
 * Pentagone, remplissage doré translucide.
 */
export function Radar({ axes }: { axes: Axes }) {
  const t = useTranslations("alliance.radar");
  const keys = ["faith", "children", "finances", "location", "vision"] as const;
  const cx = 90;
  const cy = 95;
  const R = 66;

  const point = (i: number, r: number): [number, number] => {
    const angle = -Math.PI / 2 + (i * 2 * Math.PI) / 5;
    return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)];
  };
  const ring = (f: number) =>
    keys.map((_, i) => point(i, R * f).join(",")).join(" ");
  const shape = keys
    .map((k, i) => point(i, R * Math.max(0.18, axes[k])).join(","))
    .join(" ");
  const labelPos: Array<[number, number, "start" | "middle" | "end"]> = [
    [90, 20, "middle"],
    [172, 76, "end"],
    [132, 168, "middle"],
    [48, 168, "middle"],
    [8, 76, "start"],
  ];

  return (
    <svg
      width="178"
      height="180"
      viewBox="0 0 180 184"
      className="flex-none"
      role="img"
      aria-label={keys.map((k) => t(k)).join(", ")}
    >
      {[1, 0.66, 0.33].map((f) => (
        <polygon
          key={f}
          points={ring(f)}
          fill="none"
          className="stroke-sand-300 dark:stroke-anthracite-600"
          strokeWidth="1"
        />
      ))}
      {keys.map((_, i) => {
        const [x, y] = point(i, R);
        return (
          <line
            key={i}
            x1={cx}
            y1={cy}
            x2={x}
            y2={y}
            className="stroke-sand-200 dark:stroke-anthracite-700"
            strokeWidth="1"
          />
        );
      })}
      <polygon
        points={shape}
        className="fill-gold/20 stroke-gold dark:fill-gold-light/20 dark:stroke-gold-light"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      {keys.map((k, i) => {
        const [x, y] = point(i, R * Math.max(0.18, axes[k]));
        return (
          <circle
            key={k}
            cx={x}
            cy={y}
            r="2.6"
            className="fill-navy dark:fill-info-darkInk"
          />
        );
      })}
      <g className="fill-warmgray font-mono dark:fill-warmgray" fontSize="8">
        {keys.map((k, i) => (
          <text
            key={k}
            x={labelPos[i][0]}
            y={labelPos[i][1]}
            textAnchor={labelPos[i][2]}
          >
            {t(k).toUpperCase()}
          </text>
        ))}
      </g>
    </svg>
  );
}
