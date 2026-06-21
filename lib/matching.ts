import type {
  User,
  FaithProfile,
  RelationshipProfile,
  PrivacySettings,
} from "@prisma/client";
import { prisma } from "@/lib/db";
import { blockedUserIds } from "@/lib/blocks";
import { passedUserIds } from "@/lib/passes";
import { isProfileGateEnabled } from "@/lib/flags";
import {
  profileCompletion,
  matchingGateBlocked,
} from "@/lib/profile-completion";

type Candidate = User & {
  faithProfile: FaithProfile | null;
  relationshipProfile: RelationshipProfile | null;
};

// L'utilisateur courant, déjà chargé par la session (requireUser /
// requirePageUser). On le réutilise au lieu de le recharger.
type Me = User & {
  faithProfile: FaithProfile | null;
  relationshipProfile: RelationshipProfile | null;
  privacySettings: PrivacySettings | null;
};

// Profil minimum exigé pour entrer dans le matching (saison JOURNEY) : une ville
// approximative + une phrase d'intention. Tant qu'il manque l'un des deux, la
// personne n'est NI servie (early-return sortant dans getSuggestions) NI proposée
// aux autres (filtre entrant). Symétrie volontaire : pas de profils fantômes.
// Les champs vides sont stockés `null` par /profile/edit, mais on .trim() par
// sécurité. Pur et testable.
export type MinimumProfileField = "city" | "intention";

export function missingMinimumProfile(user: {
  cityApprox: string | null;
  relationshipProfile: { intentionStatement: string | null } | null;
}): MinimumProfileField[] {
  const missing: MinimumProfileField[] = [];
  if (!user.cityApprox?.trim()) missing.push("city");
  if (!user.relationshipProfile?.intentionStatement?.trim())
    missing.push("intention");
  return missing;
}

/**
 * Suggestions filtrées par le Filtre Anti-Malaise Local et le mode invisible.
 * La raison d'exclusion n'est JAMAIS exposée.
 * Max 3 suggestions - la qualité avant la quantité.
 *
 * `me` est passé déjà chargé (zéro requête redondante) ; les requêtes
 * indépendantes (matchs, signalements) partent en parallèle.
 */
export async function getSuggestions(me: Me): Promise<Candidate[]> {
  // Une personne mariée ne voit ni n'apparaît dans les suggestions.
  // Court-circuit avant toute requête.
  if (me.season !== "JOURNEY") return [];
  // Email non vérifié : pas d'engagement tant que l'email n'est pas confirmé
  // (le VerifyBanner invite à vérifier). On n'apparaît déjà pas aux autres.
  if (!me.isVerified) return [];
  // Profil minimum (ville + intention) : tant qu'il manque, on ne sert aucune
  // suggestion. La page Suggestions affiche un appel à compléter le profil.
  // Symétrique du filtre entrant ci-dessous (on n'apparaît pas non plus).
  if (missingMinimumProfile(me).length > 0) return [];
  // Phase 2 (derrière flag, OFF par défaut) : gate FORT - profil 100 % complet
  // ET onboarding fait (flag persistant). Flag absent ⇒ inerte, inchangé.
  if (
    matchingGateBlocked({
      gateEnabled: isProfileGateEnabled(),
      completion: profileCompletion(me),
      onboardingDone: me.onboardingDoneAt != null,
    })
  )
    return [];

  const userId = me.id;

  const [existing, reported, blocked, passed] = await Promise.all([
    prisma.match.findMany({
      where: { OR: [{ userAId: userId }, { userBId: userId }] },
      select: { userAId: true, userBId: true },
    }),
    prisma.report.findMany({
      where: {
        status: { in: ["OPEN", "REVIEWING"] },
        OR: [{ reporterId: userId }, { targetUserId: userId }],
      },
      select: { reporterId: true, targetUserId: true },
    }),
    // Blocages (gratuit à vie) : exclusion mutuelle, jamais montré.
    blockedUserIds(userId),
    // Passer (unilatéral, gratuit à vie) : je ne revois plus ces profils.
    passedUserIds(userId),
  ]);

  const excludedIds = new Set<string>([userId]);
  for (const m of existing) {
    excludedIds.add(m.userAId);
    excludedIds.add(m.userBId);
  }
  for (const r of reported) {
    excludedIds.add(r.reporterId);
    excludedIds.add(r.targetUserId);
  }
  for (const id of blocked) excludedIds.add(id);
  for (const id of passed) excludedIds.add(id);

  // Plateforme de mariage chrétien : suggestions de genre opposé uniquement.
  // Si le genre n'est pas renseigné, on ne restreint pas (pas d'exclusion injuste).
  const oppositeGender =
    me.gender === "M" ? "F" : me.gender === "F" ? "M" : null;

  const candidates = await prisma.user.findMany({
    where: {
      id: { notIn: [...excludedIds] },
      season: "JOURNEY",
      isVerified: true,
      deletedAt: null,
      privacySettings: { isNot: { invisibleMode: true } },
      // Profil minimum requis pour être proposé (symétrie avec le gate sortant) :
      // ville approx + phrase d'intention. /profile/edit stocke les vides en null.
      cityApprox: { not: null },
      relationshipProfile: { is: { intentionStatement: { not: null } } },
      ...(oppositeGender ? { gender: oppositeGender } : {}),
    },
    include: {
      faithProfile: true,
      relationshipProfile: true,
      privacySettings: true,
    },
    take: 24,
  });

  const filtered = candidates.filter((c) => {
    // Anti-malaise : ne jamais montrer quelqu'un de la même ville approx.
    // si l'un des deux a activé le filtre (proxy raisonnable sans géoloc fine).
    const eitherAnti =
      me.privacySettings?.antiMalaiseEnabled ||
      c.privacySettings?.antiMalaiseEnabled;
    if (
      eitherAnti &&
      me.cityApprox &&
      c.cityApprox &&
      me.cityApprox === c.cityApprox &&
      me.faithProfile?.denomination &&
      me.faithProfile.denomination === c.faithProfile?.denomination
    ) {
      return false;
    }
    return true;
  });

  // Classement par affinité de fond (jamais montré comme score). Un jitter
  // déterministe par jour casse l'ordre figé sans hasard non-reproductible :
  // deux cohortes ne voient plus exactement les mêmes 3 profils.
  const now = Date.now();
  const scored = filtered
    .map((c) => ({
      c,
      s: matchScore(me, c, now) + dailyJitter(me.id, c.id, now) * 4,
    }))
    .sort((a, b) => b.s - a.s);

  return scored.slice(0, 3).map((x) => x.c);
}

// ---- Score d'affinité pondéré (0..100) ------------------------------------
// Remplace l'ancien score entier 0..8 qui n'exploitait que vertical +
// denomination + enfants. On pondère désormais foi, vision de mariage,
// pratique, enfants, géographie, dénomination et activité récente.
// La somme des maxima vaut exactement 100. Fonction PURE et testable :
// `now` est injecté pour rester déterministe en test.

const WEIGHTS = {
  faith: 30,
  vision: 18,
  practice: 12,
  children: 12,
  geo: 10,
  denomination: 8,
  activity: 10,
} as const;

/** Alignement de tradition (vertical). Info manquante = neutre. */
function faithScore(a: Candidate, b: Candidate): number {
  const va = a.faithProfile?.vertical;
  const vb = b.faithProfile?.vertical;
  if (!va || !vb) return WEIGHTS.faith * 0.4;
  if (va === vb) return WEIGHTS.faith;
  // OTHER reste souple ; deux traditions chrétiennes distinctes = écart net.
  if (va === "OTHER" || vb === "OTHER") return WEIGHTS.faith * 0.4;
  return WEIGHTS.faith * 0.15;
}

/**
 * Vision du mariage. Le contenu (intention, vision familiale) est
 * souvent chiffré/non comparable : on récompense l'engagement partagé
 * (avoir posé une intention + une vision) comme signal de sérieux.
 */
function visionScore(a: Candidate, b: Candidate): number {
  const ia = !!a.relationshipProfile?.intentionStatement;
  const ib = !!b.relationshipProfile?.intentionStatement;
  const fa = !!a.relationshipProfile?.familyVisionEncrypted;
  const fb = !!b.relationshipProfile?.familyVisionEncrypted;
  const intent = ia && ib ? 12 : ia || ib ? 6 : 0;
  const family = fa && fb ? 6 : fa || fb ? 3 : 0;
  return intent + family;
}

/** Fréquence de pratique (champ libre) : égalité = fort, sinon partiel. */
function practiceScore(a: Candidate, b: Candidate): number {
  const pa = a.faithProfile?.engagementFrequency?.trim().toLowerCase();
  const pb = b.faithProfile?.engagementFrequency?.trim().toLowerCase();
  if (!pa || !pb) return WEIGHTS.practice * 0.5;
  return pa === pb ? WEIGHTS.practice : WEIGHTS.practice * 0.35;
}

/** Enfants : désir aligné + enfants existants acceptés des deux côtés. */
function childrenScore(a: Candidate, b: Candidate): number {
  const ra = a.relationshipProfile;
  const rb = b.relationshipProfile;
  if (!ra || !rb) return WEIGHTS.children * 0.5;
  let s = 0;
  if (ra.wantsChildren != null && rb.wantsChildren != null) {
    s += ra.wantsChildren === rb.wantsChildren ? 8 : 0;
  } else {
    s += 4; // inconnu : neutre
  }
  if (ra.hasChildren || rb.hasChildren) {
    // Si l'un a des enfants, l'autre ne doit pas les refuser explicitement.
    const aAcceptsB = !rb.hasChildren || ra.acceptsChildren !== false;
    const bAcceptsA = !ra.hasChildren || rb.acceptsChildren !== false;
    s += aAcceptsB && bAcceptsA ? 4 : 0;
  } else {
    s += 4; // aucun enfant : pas de friction
  }
  return Math.min(WEIGHTS.children, s);
}

/** Proximité : même ville approx > même pays > ailleurs. */
function geoScore(a: Candidate, b: Candidate): number {
  if (a.cityApprox && b.cityApprox && a.cityApprox === b.cityApprox)
    return WEIGHTS.geo;
  if (a.country && b.country && a.country === b.country)
    return WEIGHTS.geo * 0.5;
  return WEIGHTS.geo * 0.2;
}

/** Dénomination : bonus fin d'alignement précis. */
function denominationScore(a: Candidate, b: Candidate): number {
  const da = a.faithProfile?.denomination;
  const db = b.faithProfile?.denomination;
  if (!da || !db) return WEIGHTS.denomination * 0.5;
  return da === db ? WEIGHTS.denomination : WEIGHTS.denomination * 0.25;
}

/** Activité récente du candidat - favorise les profils vivants. */
function activityScore(c: Candidate, now: number): number {
  const t =
    c.updatedAt instanceof Date
      ? c.updatedAt.getTime()
      : new Date(c.updatedAt).getTime();
  if (Number.isNaN(t)) return WEIGHTS.activity * 0.3;
  const days = (now - t) / 86_400_000;
  if (days <= 14) return WEIGHTS.activity;
  if (days <= 60) return WEIGHTS.activity * 0.6;
  return WEIGHTS.activity * 0.3;
}

/**
 * Score d'affinité 0..100 entre `a` (l'utilisateur) et `b` (le candidat).
 * Pur et déterministe - jamais affiché : sert uniquement au classement.
 */
export function matchScore(
  a: Candidate,
  b: Candidate,
  now: number = Date.now(),
): number {
  const s =
    faithScore(a, b) +
    visionScore(a, b) +
    practiceScore(a, b) +
    childrenScore(a, b) +
    geoScore(a, b) +
    denominationScore(a, b) +
    activityScore(b, now);
  return Math.round(Math.max(0, Math.min(100, s)));
}

/**
 * Jitter déterministe [0,1) par (utilisateur, candidat, jour). Hash FNV-1a :
 * stable sur la journée, tourne chaque jour. Amplitude faible côté appelant
 * (≈4 pts) - les très bons matchs restent en tête, les quasi-ex æquo permutent.
 */
function dailyJitter(meId: string, candId: string, now: number): number {
  const day = Math.floor(now / 86_400_000);
  const seed = `${meId}:${candId}:${day}`;
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 1000) / 1000;
}

/**
 * Carte de compatibilité = "sujets à approfondir", jamais un score affiché.
 * Axes 0..1 utilisés par le radar (sobre).
 */
export function compatibilityTopics(a: Candidate, b: Candidate) {
  const axes = {
    faith: a.faithProfile?.vertical === b.faithProfile?.vertical ? 0.95 : 0.55,
    children: childAxis(a.relationshipProfile, b.relationshipProfile),
    finances: 0.5, // à approfondir tant que non discuté en Dialogue
    location:
      a.cityApprox && b.cityApprox && a.cityApprox === b.cityApprox
        ? 0.85
        : 0.45,
    vision:
      a.relationshipProfile?.intentionStatement &&
      b.relationshipProfile?.intentionStatement
        ? 0.8
        : 0.6,
  };
  const topics = Object.entries(axes).map(([key, value]) => ({
    key,
    status:
      value >= 0.8 ? "aligned" : value >= 0.6 ? "ok" : ("deepen" as string),
  }));
  return { axes, topics };
}

function childAxis(
  a: RelationshipProfile | null,
  b: RelationshipProfile | null,
): number {
  if (!a || !b) return 0.5;
  if (a.wantsChildren != null && a.wantsChildren === b.wantsChildren)
    return 0.9;
  if (a.hasChildren && b.acceptsChildren) return 0.8;
  if (a.hasChildren && b.acceptsChildren === false) return 0.3;
  return 0.55;
}
