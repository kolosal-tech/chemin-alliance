"use client";

type Props = {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  disabled?: boolean;
};

/**
 * Switch iOS « Liquid Glass » partagé.
 *
 * Piste translucide (léger blur + bordure fine), pastille blanche qui glisse.
 * Vert doux quand actif, neutre translucide quand inactif — on a retiré le
 * doré/orange flashy de l'ancienne version. Accessible : role="switch" +
 * aria-checked + aria-label, focus visible au clavier.
 *
 * Dimensions calées sur l'ancien Toggle (24x42, pastille 18) pour ne pas
 * casser la mise en page existante des réglages.
 */
export function Switch({ checked, onChange, label, disabled }: Props) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-[24px] w-[42px] flex-none items-center rounded-full border backdrop-blur-md transition-colors duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-gold/50 focus-visible:ring-offset-surface disabled:opacity-50 dark:focus-visible:ring-offset-anthracite-800 ${
        checked
          ? "border-[#4FA06C]/50 bg-[#4FA06C]/85 dark:border-[#4C9566]/50 dark:bg-[#4C9566]/80"
          : "border-[#7E7363]/30 bg-[#968C78]/30 dark:border-white/15 dark:bg-white/10"
      }`}
    >
      <span
        className={`inline-block h-[18px] w-[18px] rounded-full bg-white shadow-sm transition-transform duration-200 ease-out ${
          checked ? "translate-x-[21px]" : "translate-x-[3px]"
        }`}
      />
    </button>
  );
}
