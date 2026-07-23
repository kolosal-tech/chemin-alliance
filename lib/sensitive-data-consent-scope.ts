/**
 * Périmètre canonique recueilli pour tout NOUVEAU consentement général.
 *
 * Les anciennes lignes sans dimensions restent reconnues pour éviter une
 * révocation rétroactive implicite. En revanche, inscription et réactivation
 * doivent toujours écrire ce contrat complet, exclusivement défini serveur.
 */
export const SENSITIVE_DATA_CONSENT = {
  type: "SENSITIVE_DATA_PROCESSING",
  version: "sensitive-data-processing:v1",
  purpose: "CORE_RELATIONSHIP_AND_FAITH_SERVICE",
  recipient: "CHEMIN_ALLIANCE_CORE_SERVICE",
} as const;
