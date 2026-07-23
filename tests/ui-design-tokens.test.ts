import { describe, expect, it } from "vitest";
import tailwindConfig from "../tailwind.config";

function luminance(hex: string) {
  const channels = hex
    .slice(1)
    .match(/../g)!
    .map((value) => parseInt(value, 16) / 255)
    .map((value) =>
      value <= 0.04045 ? value / 12.92 : Math.pow((value + 0.055) / 1.055, 2.4),
    );
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function contrast(foreground: string, background: string) {
  const a = luminance(foreground);
  const b = luminance(background);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

describe("design tokens - WCAG AA normal text", () => {
  const colors = tailwindConfig.theme!.extend!.colors as {
    canvas: string;
    surface: string;
    gold: { deep: string };
    sand: Record<500 | 600, string>;
    anthracite: Record<800 | 900, string>;
  };

  it.each([
    ["sand-500 on canvas", colors.sand[500], colors.canvas],
    ["sand-500 on surface", colors.sand[500], colors.surface],
    ["sand-600 on canvas", colors.sand[600], colors.canvas],
    ["gold-deep on canvas", colors.gold.deep, colors.canvas],
    ["dark secondary on card", "#9A958B", colors.anthracite[800]],
    ["dark muted on card", "#8F8A80", colors.anthracite[800]],
    ["dark secondary on canvas", "#9A958B", colors.anthracite[900]],
  ])("%s", (_name, foreground, background) => {
    expect(contrast(foreground, background)).toBeGreaterThanOrEqual(4.5);
  });
});
