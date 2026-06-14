// Purge des données personnelles identifiables (PII) AVANT tout envoi à un
// modèle tiers (directive de confidentialité du document d'architecture LLM).
// On remplace par des marqueurs lisibles — la structure de la phrase est
// préservée pour ne pas fausser le sens du discernement.
//
// Périmètre VOLONTAIREMENT restreint aux coordonnées (email, téléphone, @handle,
// URL, longues séquences de chiffres = carte/identifiant) : on ne touche NI aux
// prénoms, NI au contenu spirituel/culturel (versets, paroisse, ethnies…), qui
// sont nécessaires à l'accompagnement et protégés par l'opt-out de collecte.

const PATTERNS: Array<{ re: RegExp; tag: string }> = [
  { re: /\b[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}\b/gi, tag: "[EMAIL]" },
  { re: /\bhttps?:\/\/[^\s]+/gi, tag: "[LIEN]" },
  // Téléphones internationaux / nationaux (séparateurs variés).
  { re: /(?:\+?\d[\d\s().-]{7,}\d)/g, tag: "[TEL]" },
  // Identifiants de paiement / longues suites de chiffres.
  { re: /\b\d[\d\s-]{10,}\d\b/g, tag: "[NUM]" },
  // Pseudos de réseaux sociaux.
  { re: /(^|\s)@[a-z0-9_.]{2,}/gi, tag: " [PSEUDO]" },
];

export function redactPII(input: string): { text: string; count: number } {
  if (!input) return { text: input, count: 0 };
  let text = input;
  let count = 0;
  for (const { re, tag } of PATTERNS) {
    text = text.replace(re, () => {
      count += 1;
      return tag;
    });
  }
  return { text, count };
}
