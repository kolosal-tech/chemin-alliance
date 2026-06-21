/**
 * Listes de choix pour les champs de profil — alimentent les menus déroulants et
 * sélecteurs à puces du formulaire (au lieu de la saisie libre, plus longue et
 * source d'incohérences). Le matching compare ces valeurs par égalité de chaîne
 * (lib/matching.ts) : un vocabulaire fermé AMÉLIORE donc le scoring.
 *
 * Libellés en français : l'app est francophone d'abord (Afrique de l'Ouest) et
 * la valeur stockée est affichée telle quelle (carte de suggestion, profil
 * match). Les valeurs libres existantes restent supportées (préservées au
 * chargement, voir edit-profile-form).
 */

export const DENOMINATIONS = [
  "Catholique",
  "Évangélique",
  "Pentecôtiste",
  "Baptiste",
  "Assemblées de Dieu",
  "Méthodiste",
  "Presbytérienne / Réformée",
  "Adventiste",
  "Orthodoxe",
  "Autre",
] as const;

export const ENGAGEMENT_FREQUENCIES = [
  "Chaque semaine",
  "Plusieurs fois par mois",
  "Une fois par mois",
  "Occasionnellement",
  "Pas encore",
] as const;

export const INTERESTS = [
  "Lecture",
  "Musique",
  "Sport",
  "Cuisine",
  "Voyages",
  "Cinéma",
  "Nature",
  "Art",
  "Bénévolat",
  "Jeux",
  "Technologie",
  "Mode",
  "Danse",
  "Photographie",
] as const;

export const PERSONALITY_TRAITS = [
  "Calme",
  "Énergique",
  "Réfléchi·e",
  "Spontané·e",
  "Organisé·e",
  "Créatif·ve",
  "Sociable",
  "Réservé·e",
  "Optimiste",
  "Patient·e",
  "Ambitieux·se",
  "Bienveillant·e",
  "Drôle",
  "Aventureux·se",
] as const;

export const COUNTRIES = [
  "Burkina Faso",
  "Côte d'Ivoire",
  "Mali",
  "Niger",
  "Sénégal",
  "Togo",
  "Bénin",
  "Ghana",
  "Nigéria",
  "Cameroun",
  "Tchad",
  "Guinée",
  "Congo (RDC)",
  "Congo (Brazzaville)",
  "Gabon",
  "Centrafrique",
  "Madagascar",
  "Maroc",
  "Algérie",
  "Tunisie",
  "France",
  "Belgique",
  "Suisse",
  "Canada",
  "Autre",
] as const;
