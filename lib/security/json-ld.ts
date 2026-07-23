const HTML_UNSAFE_JSON = /[<>&\u2028\u2029]/g;
const JSON_ESCAPE: Record<string, string> = {
  "<": "\\u003c",
  ">": "\\u003e",
  "&": "\\u0026",
  "\u2028": "\\u2028",
  "\u2029": "\\u2029",
};

/**
 * Sérialise une valeur JSON-LD sans permettre de fermer sa balise `<script>`.
 *
 * `type="application/ld+json"` ne neutralise pas l'analyseur HTML : une chaîne
 * `</script>` brute terminerait tout de même l'élément. L'échappement conserve
 * exactement la valeur JSON après parsing tout en supprimant ces délimiteurs.
 */
export function serializeJsonLd(value: unknown): string {
  const json = JSON.stringify(value);
  if (json === undefined) {
    throw new TypeError("JSON_LD_VALUE_NOT_SERIALIZABLE");
  }
  return json.replace(
    HTML_UNSAFE_JSON,
    (character) => JSON_ESCAPE[character] ?? character,
  );
}
