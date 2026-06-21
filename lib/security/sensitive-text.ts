import { z } from "zod";

/**
 * Durcissement des champs texte libres et sensibles avant chiffrement
 * (temoignage, vision familiale, intention, eglise locale, ministere...).
 *
 * Defense en profondeur cote ECRITURE : React echappe deja a l'affichage,
 * mais on neutralise la charge utile hostile a la source (avant
 * encryptField + persistance) afin de proteger aussi les consommateurs
 * hors-React : exports RGPD, vue match-profile cross-user, e-mails, CSV.
 * `escapeHtml` couvre les sorties HTML hors-React.
 */

// Strip de toute la classe des caracteres de controle (Cc) et de format (Cf),
// par propriete Unicode plutot que par plages enumerees (sinon on en oublie).
// Couvre en UNE regle : C0/C1 ; zero-width ZWSP/ZWNJ/ZWJ/WORD JOINER + invisibles
// math (U+2060-2064) ; bidi LRM/RLM/ALM (U+061C), overrides (U+202A-202E),
// isolates (U+2066-2069) ; BOM ; annotations interlineaires (U+FFF9-FFFB) ; et le
// bloc TAG (U+E0000-E007F, contrebande de texte invisible). On conserve \t et \n.
// \p{Zl}/\p{Zp} ajoutent les separateurs de ligne/paragraphe U+2028/U+2029.
const HOSTILE = /[\p{Cc}\p{Cf}\p{Zl}\p{Zp}]/gu;

/**
 * Nettoie une chaine libre :
 * - normalise en NFC (equivalence Unicode, anti-homoglyphe basique) ;
 * - uniformise d'abord les fins de ligne (CRLF/CR -> LF) ;
 * - retire toute la classe controle/format (cf. HOSTILE) en gardant \t et \n ;
 * - borne les sauts multiples et rogne les espaces de bord.
 */
export function sanitizeText(raw: string): string {
  return raw
    .normalize("NFC")
    .replace(/\r\n?/g, "\n")
    .replace(HOSTILE, (ch) => (ch === "\t" || ch === "\n" ? ch : ""))
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Echappement HTML pour tout rendu HORS React (e-mail, export HTML, CSV
 * ouvert dans un tableur navigateur). NE PAS utiliser dans du JSX : React
 * echappe deja, doubler produirait des entites visibles.
 */
export function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Garde-fou anti-DoS : on rejette au parse toute entree brute depassant
// largement la limite metier, AVANT de payer le cout du nettoyage O(n).
const hardCap = (max: number) =>
  z.string().max(max * 4, { message: `Champ trop long (max ${max}).` });

/**
 * Schema Zod reutilisable pour un champ libre sensible, optionnel + nullable.
 *
 * Semantique preservee pour un PATCH partiel :
 *  - `undefined` -> champ absent du body -> NE PAS modifier en base ;
 *  - `null`      -> effacement explicite ;
 *  - chaine      -> nettoyee ; si vide apres nettoyage -> `null`.
 *
 * La limite metier est verifiee APRES nettoyage (le nettoyage ne peut que
 * raccourcir), le garde-fou brut AVANT.
 */
export function sensitiveText(max: number) {
  return z
    .union([hardCap(max), z.null()])
    .optional()
    .transform((v) => {
      if (v === undefined) return undefined;
      if (v === null) return null;
      const clean = sanitizeText(v);
      return clean.length === 0 ? null : clean;
    })
    .refine((v) => v == null || v.length <= max, {
      message: `Champ trop long (max ${max} caracteres).`,
    });
}

export type SensitiveText = string | null | undefined;
