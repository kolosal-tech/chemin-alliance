import type {
  User,
  FaithProfile,
  RelationshipProfile,
  PrivacySettings,
} from "@prisma/client";
import { prisma } from "@/lib/db";
import { blockedUserIds } from "@/lib/blocks";
import { passedUserIds } from "@/lib/passes";

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

/**
 * Suggestions filtrées par le Filtre Anti-Malaise Local et le mode invisible.
 * La raison d'exclusion n'est JAMAIS exposée.
 * Max 3 suggestions — la qualité avant la quantité.
 *
 * `me` est passé déjà chargé (zéro requête redondante) ; les requêtes
 * indépendantes (matchs, signalements) partent en parallèle.
 */
export async function getSuggestions(me: Me): Promise<Candidate[]> {
  // Une personne mariée ne voit ni n'apparaît dans les suggestions.
  // Court-circuit avant toute requête.
  if (me.season !== "JOURNEY") return [];

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

  // Tri sobre par affinité de fond (jamais montré comme score)
  const scored = filtered
    .map((c) => ({ c, s: affinity(me, c) }))
    .sort((a, b) => b.s - a.s);

  return scored.slice(0, 3).map((x) => x.c);
}

function affinity(a: Candidate, b: Candidate): number {
  let s = 0;
  if (a.faithProfile?.vertical === b.faithProfile?.vertical) s += 3;
  if (a.faithProfile?.denomination === b.faithProfile?.denomination) s += 1;
  if (
    a.relationshipProfile?.wantsChildren != null &&
    a.relationshipProfile.wantsChildren === b.relationshipProfile?.wantsChildren
  )
    s += 2;
  if (
    a.relationshipProfile?.hasChildren &&
    b.relationshipProfile?.acceptsChildren
  )
    s += 2;
  return s;
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
