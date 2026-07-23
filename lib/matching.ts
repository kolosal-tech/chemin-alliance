import {
  Prisma,
  type MatchStatus,
  type User,
  type FaithProfile,
  type RelationshipProfile,
  type PrivacySettings,
} from "@prisma/client";
import { prisma } from "@/lib/db";
import { blockedUserIds } from "@/lib/blocks";
import { passedUserIds } from "@/lib/passes";
import { isProfileGateEnabled } from "@/lib/flags";
import {
  profileCompletion,
  matchingGateBlocked,
} from "@/lib/profile-completion";
import type { MaturityResult, MaturityAxis } from "@/lib/maturity";
import { openInsight } from "@/lib/agent-insight";
import { activeSensitiveDataConsentUserWhere } from "@/lib/sensitive-data-consent";

// Sous-ensemble structurel de User + relations strictement suffisant pour le
// pipeline de suggestions (scoring, filtre anti-malaise, JSX de la page
// Suggestions et de la route API /api/matches/suggestions). Remplace l'ancien
// `User & {...}` complet : évite de charger passwordHash, tokens et champs
// *Encrypted jamais consommés ici. Les champs *Encrypted conservés (ex.
// familyVisionEncrypted) ne servent qu'à un test d'existence (`!!`), jamais
// exposés en clair.
type Candidate = {
  id: string;
  displayName: string;
  age: number;
  isVerified: boolean;
  photoBlurhash: string | null;
  photoBlurredByDefault: boolean;
  kind: User["kind"];
  cityApprox: string | null;
  country: string | null;
  updatedAt: Date;
  faithProfile: Pick<
    FaithProfile,
    "vertical" | "denomination" | "engagementFrequency"
  > | null;
  relationshipProfile: Pick<
    RelationshipProfile,
    | "intentionStatement"
    | "maritalStatus"
    | "hasChildren"
    | "wantsChildren"
    | "acceptsChildren"
    | "familyVisionEncrypted"
    | "intentionVisibility"
  > | null;
  privacySettings: Pick<PrivacySettings, "antiMalaiseEnabled"> | null;
  // P6 : présence d'un Parrain/Marraine (signal de confiance). Optionnel pour
  // rester compatible avec Me (qui n'inclut pas le sponsor).
  sponsor?: { relation: string } | null;
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

type MatchRequestUser = {
  id: string;
  deletedAt: Date | null;
  season: User["season"];
  isVerified: boolean;
  gender: string | null;
  photoUrl: string | null;
  onboardingDoneAt: Date | null;
  cityApprox: string | null;
  faithProfile: {
    denomination: string | null;
    engagementFrequency: string | null;
  } | null;
  relationshipProfile: {
    intentionStatement: string | null;
    wantsChildren: boolean | null;
    interests: string | null;
    personality: string | null;
    aspirations: string | null;
  } | null;
  privacySettings: {
    antiMalaiseEnabled: boolean;
    invisibleMode: boolean;
  } | null;
};

export type MatchRequestRejection =
  | "ACTOR_NOT_ELIGIBLE"
  | "TARGET_NOT_ELIGIBLE";

/**
 * Décision pure et fail-closed pour une demande directe. La cible reçoit aussi
 * les règles d'entrée du vivier de suggestions ; blocages, signalements actifs
 * et filtre anti-malaise s'appliquent symétriquement à la paire.
 *
 * Le mode invisible ne bloque que l'exposition de la cible. Une personne qui
 * l'a activé peut toujours agir sur les suggestions déjà reçues : ce réglage
 * n'est pas un verrou de compte.
 */
export function matchRequestRejection(
  actor: MatchRequestUser | null,
  target: MatchRequestUser | null,
  pair: {
    hasBlock: boolean;
    hasActiveReport: boolean;
    actorPassedTarget?: boolean;
    actorProfileGateBlocked?: boolean;
  },
): MatchRequestRejection | null {
  if (
    !actor ||
    actor.deletedAt !== null ||
    actor.season !== "JOURNEY" ||
    !actor.isVerified ||
    missingMinimumProfile(actor).length > 0 ||
    pair.actorProfileGateBlocked === true
  ) {
    return "ACTOR_NOT_ELIGIBLE";
  }

  if (
    !target ||
    target.deletedAt !== null ||
    target.season !== "JOURNEY" ||
    !target.isVerified ||
    target.privacySettings?.invisibleMode === true ||
    missingMinimumProfile(target).length > 0 ||
    pair.hasBlock ||
    pair.hasActiveReport ||
    pair.actorPassedTarget === true
  ) {
    return "TARGET_NOT_ELIGIBLE";
  }

  const expectedTargetGender =
    actor.gender === "M" ? "F" : actor.gender === "F" ? "M" : null;
  if (expectedTargetGender && target.gender !== expectedTargetGender) {
    return "TARGET_NOT_ELIGIBLE";
  }

  const eitherAntiMalaise =
    actor.privacySettings?.antiMalaiseEnabled === true ||
    target.privacySettings?.antiMalaiseEnabled === true;
  if (
    eitherAntiMalaise &&
    actor.cityApprox &&
    actor.cityApprox === target.cityApprox &&
    actor.faithProfile?.denomination &&
    actor.faithProfile.denomination === target.faithProfile?.denomination
  ) {
    return "TARGET_NOT_ELIGIBLE";
  }

  return null;
}

/** Seul un Match accepté ouvre les champs AFTER_MATCH. */
export function activeMatchGrantsProfileVisibility(
  status: MatchStatus,
): boolean {
  return status === "ACTIVE";
}

const MATCH_REQUEST_USER_SELECT = {
  id: true,
  deletedAt: true,
  season: true,
  isVerified: true,
  gender: true,
  photoUrl: true,
  onboardingDoneAt: true,
  cityApprox: true,
  kind: true,
  locale: true,
  displayName: true,
  faithProfile: {
    select: { denomination: true, engagementFrequency: true },
  },
  relationshipProfile: {
    select: {
      intentionStatement: true,
      wantsChildren: true,
      interests: true,
      personality: true,
      aspirations: true,
    },
  },
  privacySettings: {
    select: { antiMalaiseEnabled: true, invisibleMode: true },
  },
} satisfies Prisma.UserSelect;

type MatchRequestDatabaseUser = Prisma.UserGetPayload<{
  select: typeof MATCH_REQUEST_USER_SELECT;
}>;

export type MatchRequestErrorCode =
  | MatchRequestRejection
  | "INVALID_TARGET"
  | "MATCH_EXISTS";

export class MatchRequestError extends Error {
  constructor(readonly code: MatchRequestErrorCode) {
    super(code);
    this.name = "MatchRequestError";
  }
}

export type CreatedMatchRequest = {
  matchId: string;
  status: MatchStatus;
  target: Pick<
    MatchRequestDatabaseUser,
    "id" | "kind" | "locale" | "displayName"
  >;
};

/**
 * Revalide auteur, cible et contraintes de paire dans la même transaction que
 * la création. SERIALIZABLE réduit la fenêtre TOCTOU ; P2034 est rejoué deux
 * fois, tandis que l'unicité canonique de Match tranche les demandes en course.
 */
export async function createEligibleMatchRequest(
  actorId: string,
  targetId: string,
): Promise<CreatedMatchRequest> {
  if (actorId === targetId) throw new MatchRequestError("INVALID_TARGET");

  const [userAId, userBId] = [actorId, targetId].sort();
  const maxAttempts = 3;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await prisma.$transaction(
        async (tx) => {
          const [actor, target, blockingPair, activeReport, passed, existing] =
            await Promise.all([
              tx.user.findFirst({
                where: { id: actorId, ...activeSensitiveDataConsentUserWhere },
                select: MATCH_REQUEST_USER_SELECT,
              }),
              tx.user.findFirst({
                where: { id: targetId, ...activeSensitiveDataConsentUserWhere },
                select: MATCH_REQUEST_USER_SELECT,
              }),
              tx.block.findFirst({
                where: {
                  OR: [
                    { blockerId: actorId, blockedId: targetId },
                    { blockerId: targetId, blockedId: actorId },
                  ],
                },
                select: { id: true },
              }),
              tx.report.findFirst({
                where: {
                  status: { in: ["OPEN", "REVIEWING"] },
                  OR: [
                    { reporterId: actorId, targetUserId: targetId },
                    { reporterId: targetId, targetUserId: actorId },
                  ],
                },
                select: { id: true },
              }),
              tx.pass.findUnique({
                where: {
                  passerId_passedId: {
                    passerId: actorId,
                    passedId: targetId,
                  },
                },
                select: { id: true },
              }),
              tx.match.findUnique({
                where: { userAId_userBId: { userAId, userBId } },
                select: { id: true },
              }),
            ]);

          const actorProfileGateBlocked = actor
            ? matchingGateBlocked({
                gateEnabled: isProfileGateEnabled(),
                completion: profileCompletion(actor),
                onboardingDone: actor.onboardingDoneAt !== null,
              })
            : true;
          const rejection = matchRequestRejection(actor, target, {
            hasBlock: blockingPair !== null,
            hasActiveReport: activeReport !== null,
            actorPassedTarget: passed !== null,
            actorProfileGateBlocked,
          });
          if (rejection) throw new MatchRequestError(rejection);
          if (existing) throw new MatchRequestError("MATCH_EXISTS");

          // Le garde ci-dessus rend target non-null ; cette vérification garde
          // néanmoins le narrowing TypeScript explicite et fail-closed.
          if (!target) throw new MatchRequestError("TARGET_NOT_ELIGIBLE");
          const status: MatchStatus =
            target.kind === "AI_COMPANION" ? "ACTIVE" : "PENDING";
          const match = await tx.match.create({
            data: {
              userAId,
              userBId,
              status,
              requestedById: actorId,
            },
            select: { id: true },
          });

          return {
            matchId: match.id,
            status,
            target: {
              id: target.id,
              kind: target.kind,
              locale: target.locale,
              displayName: target.displayName,
            },
          };
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      if (error instanceof MatchRequestError) throw error;
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new MatchRequestError("MATCH_EXISTS");
      }
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2034" &&
        attempt < maxAttempts
      ) {
        continue;
      }
      throw error;
    }
  }

  // Le flux ne peut atteindre ce point (la dernière tentative retourne ou
  // relance), mais ce throw protège contre une modification future de boucle.
  throw new Error("MATCH_REQUEST_TRANSACTION_EXHAUSTED");
}

// P1 : nudge de classement selon le bilan de maturité du viewer (JAMAIS un
// filtre, jamais bloquant). Si le viewer a un axe de croissance "vision" ou
// "stability", on remonte doucement les profils ancrés (vision familiale +
// intention renseignées = signal de sérieux complémentaire). Poids faible et
// déterministe ; sans bilan, effet nul (comportement historique inchangé).
function maturityNudge(maturity: MaturityResult | null, c: Candidate): number {
  if (!maturity) return 0;
  const growth = (maturity.growth ?? []) as MaturityAxis[];
  const seeksGrounding =
    growth.includes("vision") || growth.includes("stability");
  if (!seeksGrounding) return 0;
  const grounded =
    !!c.relationshipProfile?.familyVisionEncrypted &&
    !!c.relationshipProfile?.intentionStatement;
  return grounded ? 6 : 0;
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
      ...activeSensitiveDataConsentUserWhere,
      privacySettings: { isNot: { invisibleMode: true } },
      // Profil minimum requis pour être proposé (symétrie avec le gate sortant) :
      // ville approx + phrase d'intention. /profile/edit stocke les vides en null.
      cityApprox: { not: null },
      relationshipProfile: { is: { intentionStatement: { not: null } } },
      ...(oppositeGender ? { gender: oppositeGender } : {}),
    },
    // Select ciblé (au lieu d'un include complet) : évite de remonter
    // passwordHash, tokens et champs *Encrypted jamais consommés par le
    // scoring, le filtre anti-malaise ou l'affichage (cf. type Candidate).
    select: {
      id: true,
      displayName: true,
      age: true,
      isVerified: true,
      photoBlurhash: true,
      photoBlurredByDefault: true,
      kind: true,
      cityApprox: true,
      country: true,
      updatedAt: true,
      faithProfile: {
        select: {
          vertical: true,
          denomination: true,
          engagementFrequency: true,
        },
      },
      relationshipProfile: {
        select: {
          intentionStatement: true,
          maritalStatus: true,
          hasChildren: true,
          wantsChildren: true,
          acceptsChildren: true,
          familyVisionEncrypted: true,
          intentionVisibility: true,
        },
      },
      privacySettings: { select: { antiMalaiseEnabled: true } },
      // P6 : signal de confiance "accompagné·e" (a un Parrain/Marraine).
      sponsor: { select: { relation: true } },
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

  // P1 : bilan de maturité du viewer (s'il existe), pour nudger le classement.
  const maturityInsight = await prisma.agentInsight.findFirst({
    where: { userId: me.id, agentId: "maturity", revokedAt: null },
    orderBy: { createdAt: "desc" },
  });
  const maturity = maturityInsight
    ? openInsight<MaturityResult>(maturityInsight.dataJson)
    : null;

  // Classement par affinité de fond (jamais montré comme score). Un jitter
  // déterministe par jour casse l'ordre figé sans hasard non-reproductible :
  // deux cohortes ne voient plus exactement les mêmes 3 profils.
  const now = Date.now();
  const scored = filtered
    .map((c) => ({
      c,
      s:
        matchScore(me, c, now) +
        dailyJitter(me.id, c.id, now) * 4 +
        maturityNudge(maturity, c),
    }))
    .sort((a, b) => b.s - a.s);

  return scored.slice(0, 3).map((x) => x.c);
}

// P3 : aperçu de découverte PRE-VERIFICATION. Quelques silhouettes anonymisées
// (ni nom, ni intention, ni id, AUCUNE action) pour montrer qu'un vivier
// existe et inciter à vérifier l'email. N'ouvre aucune mise en relation : le
// matching réel reste fermé tant que !isVerified (cf. getSuggestions).
export type DiscoveryTeaser = {
  age: number | null;
  vertical: string | null;
  photoBlurhash: string | null;
};

export async function getDiscoveryPreview(
  me: Me,
  limit = 3,
): Promise<DiscoveryTeaser[]> {
  const oppositeGender =
    me.gender === "M" ? "F" : me.gender === "F" ? "M" : null;
  const rows = await prisma.user.findMany({
    where: {
      id: { not: me.id },
      season: "JOURNEY",
      isVerified: true,
      deletedAt: null,
      ...activeSensitiveDataConsentUserWhere,
      privacySettings: { isNot: { invisibleMode: true } },
      cityApprox: { not: null },
      relationshipProfile: { is: { intentionStatement: { not: null } } },
      ...(oppositeGender ? { gender: oppositeGender } : {}),
    },
    select: {
      age: true,
      photoBlurhash: true,
      faithProfile: { select: { vertical: true } },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  return rows.map((r) => ({
    age: r.age,
    vertical: r.faithProfile?.vertical ?? null,
    photoBlurhash: r.photoBlurhash,
  }));
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

// Sous-ensemble structurel de Candidate strictement suffisant pour
// compatibilityTopics (et childAxis) : permet d'appeler ces fonctions depuis
// des requêtes Prisma en `select` ciblé (sans les champs *Encrypted), tout en
// restant compatible avec les appelants qui passent un Candidate/Me complet.
export type CompatibilityInput = {
  cityApprox: string | null;
  faithProfile: { vertical: FaithProfile["vertical"] } | null;
  relationshipProfile: {
    intentionStatement: string | null;
    wantsChildren: boolean | null;
    hasChildren: boolean;
    acceptsChildren: boolean | null;
  } | null;
};

/**
 * Carte de compatibilité = "sujets à approfondir", jamais un score affiché.
 * Axes 0..1 utilisés par le radar (sobre).
 */
export function compatibilityTopics(
  a: CompatibilityInput,
  b: CompatibilityInput,
  disclosure: {
    revealFamily?: boolean;
    revealLocation?: boolean;
    revealVision?: boolean;
  } = {},
) {
  const axes = {
    faith: a.faithProfile?.vertical === b.faithProfile?.vertical ? 0.95 : 0.55,
    children: disclosure.revealFamily
      ? childAxis(a.relationshipProfile, b.relationshipProfile)
      : 0.5,
    finances: 0.5, // à approfondir tant que non discuté en Dialogue
    location:
      disclosure.revealLocation &&
      a.cityApprox &&
      b.cityApprox &&
      a.cityApprox === b.cityApprox
        ? 0.85
        : disclosure.revealLocation
          ? 0.45
          : 0.5,
    vision:
      disclosure.revealVision &&
      a.relationshipProfile?.intentionStatement &&
      b.relationshipProfile?.intentionStatement
        ? 0.8
        : disclosure.revealVision
          ? 0.6
          : 0.5,
  };
  const topics = Object.entries(axes).map(([key, value]) => ({
    key,
    status:
      value >= 0.8 ? "aligned" : value >= 0.6 ? "ok" : ("deepen" as string),
  }));
  return { axes, topics };
}

function childAxis(
  a: CompatibilityInput["relationshipProfile"],
  b: CompatibilityInput["relationshipProfile"],
): number {
  if (!a || !b) return 0.5;
  if (a.wantsChildren != null && a.wantsChildren === b.wantsChildren)
    return 0.9;
  if (a.hasChildren && b.acceptsChildren) return 0.8;
  if (a.hasChildren && b.acceptsChildren === false) return 0.3;
  return 0.55;
}
