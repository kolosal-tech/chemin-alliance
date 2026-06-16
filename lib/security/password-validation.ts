import { z } from "zod";

// Règle MDP unique, partagée par l'inscription, la réinitialisation et le
// changement de mot de passe : 12+ caractères, au moins une minuscule, une
// majuscule et un chiffre. Rejette les MDP faibles type "123456789012".
export const PASSWORD_MIN = 12;
export const PASSWORD_MAX = 128;
export const PASSWORD_COMPLEXITY = /(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/;

/** Champ zod réutilisable pour un mot de passe conforme. */
export const passwordField = z
  .string()
  .min(PASSWORD_MIN)
  .max(PASSWORD_MAX)
  .regex(PASSWORD_COMPLEXITY);

/** Vérifie qu'un mot de passe respecte la règle (sans zod). */
export function isStrongPassword(pw: string): boolean {
  return (
    pw.length >= PASSWORD_MIN &&
    pw.length <= PASSWORD_MAX &&
    PASSWORD_COMPLEXITY.test(pw)
  );
}
