import { openInsight, isLegacyInsightValue } from "@/lib/agent-insight";
import { openAllianceAnswer } from "@/lib/alliance-answer";
import { decryptField } from "@/lib/security/crypto";

export const EXPORT_COLLECTION_LIMIT = 2_000;
export const EXPORT_QUERY_TAKE = EXPORT_COLLECTION_LIMIT + 1;

type DateValue = Date | string;

type EncryptedValue = string | null;

type AccountSource = {
  id: string;
  email: string;
  displayName: string;
  age: number;
  gender: string | null;
  role: string;
  kind: string;
  locale: string;
  rulesetId: string;
  season: string;
  isVerified: boolean;
  photoUrl: string | null;
  photoBlurredByDefault: boolean;
  photoBlurhash: string | null;
  cityApprox: string | null;
  country: string | null;
  phone: string | null;
  phoneVerified: boolean;
  stripeCustomerId: string | null;
  subscriptionStatus: string | null;
  lastDevotionDate: DateValue | null;
  currentStreak: number;
  longestStreak: number;
  onboardingDoneAt: DateValue | null;
  deletedAt: DateValue | null;
  createdAt: DateValue;
  updatedAt: DateValue;
};

type FaithProfileSource = {
  vertical: string;
  denomination: string | null;
  ministry: string | null;
  engagementFrequency: string | null;
  localChurchEncrypted: EncryptedValue;
  localChurchVisibility: string;
  testimonyEncrypted: EncryptedValue;
  testimonyVisibility: string;
} | null;

type RelationshipProfileSource = {
  maritalStatus: string;
  hasChildren: boolean;
  childrenVisibility: string;
  wantsChildren: boolean | null;
  acceptsChildren: boolean | null;
  familyVisionEncrypted: EncryptedValue;
  familyVisionVisibility: string;
  intentionStatement: string | null;
  intentionVisibility: string;
  interests: string | null;
  personality: string | null;
  aspirations: string | null;
} | null;

type PrivacySettingsSource = {
  antiMalaiseEnabled: boolean;
  antiMalaiseRadiusKm: number;
  invisibleMode: boolean;
  fieldVisibility: unknown;
} | null;

type MatchSource = {
  id: string;
  userAId: string;
  userBId: string;
  userA: { id: string; displayName: string };
  userB: { id: string; displayName: string };
  stage: string;
  status: string;
  compatibilityJson: unknown;
  contactExchange: string;
  contactExchangeRequestedBy: string | null;
  advanceRequestedBy: string | null;
  requestedById: string | null;
  closedBy: string | null;
  closeMessage: string | null;
  createdAt: DateValue;
  updatedAt: DateValue;
  lastReadAtUserA: DateValue | null;
  lastReadAtUserB: DateValue | null;
};

type MatchMessageSource = {
  id: string;
  matchId: string;
  senderId: string;
  contentEncrypted: string;
  kind: string;
  moderationStatus: string;
  blockedReason: string | null;
  createdAt: DateValue;
};

type AllianceAnswerSource = {
  id: string;
  matchId: string;
  stage: string;
  questionId: string;
  answerEncrypted: string | null;
  answerLegacy: string;
  createdAt: DateValue;
};

type CoachMessageSource = {
  id: string;
  mode: string;
  role: string;
  contentEncrypted: string;
  guardrail: boolean;
  createdAt: DateValue;
};

type AgentInsightSource = {
  id: string;
  matchId: string | null;
  coupleSpaceId: string | null;
  agentId: string;
  kind: string;
  dataJson: unknown;
  visibility: string;
  createdAt: DateValue;
  revokedAt: DateValue | null;
};

type CoupleSpaceSource = {
  id: string;
  userAId: string;
  userBId: string | null;
  userA: { id: string; displayName: string };
  userB: { id: string; displayName: string } | null;
  status: string;
  origin: string;
  matchId: string | null;
  season: string;
  marriedAt: DateValue | null;
  createdAt: DateValue;
  updatedAt: DateValue;
} | null;

type CoupleMessageSource = {
  id: string;
  spaceId: string;
  senderId: string;
  contentEncrypted: string;
  createdAt: DateValue;
};

type GameRoundSource = {
  id: string;
  matchId: string | null;
  coupleSpaceId: string | null;
  mode: string;
  questionKey: string | null;
  questionText: string | null;
  initiatorId: string;
  status: string;
  createdAt: DateValue;
  revealedAt: DateValue | null;
  answers: Array<{
    id: string;
    answerEncrypted: string | null;
    guessEncrypted: string | null;
    createdAt: DateValue;
  }>;
};

type SponsorSource = {
  name: string;
  email: string;
  relation: string;
  createdAt: DateValue;
  blessings: Array<{
    id: string;
    matchId: string;
    status: string;
    noteEncrypted: string | null;
    createdAt: DateValue;
    respondedAt: DateValue | null;
  }>;
} | null;

type OtherMemberAction = {
  id: string;
  createdAt: DateValue;
  other: { id: string; displayName: string };
};

type BookingSource = {
  id: string;
  slotStart: DateValue;
  status: string;
  createdAt: DateValue;
  coach: {
    id: string;
    displayName: string;
    affiliation: string;
    specialties: string[];
    pricePerSessionEUR: number;
  };
};

type ReportMadeSource = {
  id: string;
  reason: string;
  status: string;
  createdAt: DateValue;
  resolvedAt: DateValue | null;
  target: { id: string; displayName: string };
};

type ReportReceivedSource = {
  id: string;
  status: string;
  createdAt: DateValue;
  resolvedAt: DateValue | null;
};

type ConsentSource = {
  id: string;
  type: string;
  version: string | null;
  purpose: string | null;
  recipient: string | null;
  grantedAt: DateValue;
  revokedAt: DateValue | null;
};

type UsageSource = {
  day: DateValue;
  count: number;
};

type PhoneVerificationSource = {
  id: string;
  expiresAt: DateValue;
  attempts: number;
  createdAt: DateValue;
};

export type AccountExportSource = {
  account: AccountSource;
  faithProfile: FaithProfileSource;
  relationshipProfile: RelationshipProfileSource;
  privacySettings: PrivacySettingsSource;
  consents: ConsentSource[];
  matches: MatchSource[];
  matchMessages: MatchMessageSource[];
  allianceAnswers: AllianceAnswerSource[];
  coachMessages: CoachMessageSource[];
  agentInsights: AgentInsightSource[];
  coupleSpace: CoupleSpaceSource;
  coupleMessages: CoupleMessageSource[];
  gameRounds: GameRoundSource[];
  sponsor: SponsorSource;
  blocksMade: OtherMemberAction[];
  passesMade: OtherMemberAction[];
  bookings: BookingSource[];
  reportsMade: ReportMadeSource[];
  reportsReceived: ReportReceivedSource[];
  aiCoachUsages: UsageSource[];
  phoneVerifications: PhoneVerificationSource[];
  restrictedThirdPartyCounts: {
    blocksReceived: number;
    passesReceived: number;
  };
  registeredPushDevices: number;
};

type CollectionMeta = {
  exported: number;
  truncated: boolean;
  limit: number;
};

function bounded<T>(
  rows: readonly T[],
  collections: Record<string, CollectionMeta>,
  key: string,
): T[] {
  const truncated = rows.length > EXPORT_COLLECTION_LIMIT;
  const records = rows.slice(0, EXPORT_COLLECTION_LIMIT);
  collections[key] = {
    exported: records.length,
    truncated,
    limit: EXPORT_COLLECTION_LIMIT,
  };
  return records;
}

function relationToMe(value: string | null, userId: string) {
  if (value === null) return null;
  return value === userId ? "me" : "other_member";
}

function decodeEncrypted(
  stored: string | null,
  path: string,
  integrityIssues: string[],
): string | null {
  if (stored === null) return null;
  try {
    return decryptField(stored);
  } catch {
    integrityIssues.push(path);
    return null;
  }
}

function decodeAlliance(row: AllianceAnswerSource, integrityIssues: string[]) {
  try {
    return openAllianceAnswer(row);
  } catch {
    integrityIssues.push(`allianceAnswers.${row.id}.answer`);
    return null;
  }
}

/**
 * Construit l'export lisible à partir de sélections DB déjà restreintes.
 * Toutes les propriétés sont recopiées explicitement : aucun hash, jeton,
 * ciphertext ou secret ajouté ultérieurement au modèle ne peut fuiter par un
 * spread accidentel.
 */
export function buildAccountExport(
  source: AccountExportSource,
  exportedAt = new Date(),
) {
  const userId = source.account.id;
  const integrityIssues: string[] = [];
  const collections: Record<string, CollectionMeta> = {};

  const consents = bounded(source.consents, collections, "consents");
  const matches = bounded(source.matches, collections, "matches");
  const matchMessages = bounded(
    source.matchMessages,
    collections,
    "matchMessages",
  );
  const allianceAnswers = bounded(
    source.allianceAnswers,
    collections,
    "allianceAnswers",
  );
  const coachMessages = bounded(
    source.coachMessages,
    collections,
    "coachMessages",
  );
  const agentInsights = bounded(
    source.agentInsights,
    collections,
    "agentInsights",
  );
  const coupleMessages = bounded(
    source.coupleMessages,
    collections,
    "coupleMessages",
  );
  const gameRounds = bounded(source.gameRounds, collections, "gameRounds");
  const blessings = bounded(
    source.sponsor?.blessings ?? [],
    collections,
    "blessings",
  );
  const blocksMade = bounded(source.blocksMade, collections, "blocksMade");
  const passesMade = bounded(source.passesMade, collections, "passesMade");
  const bookings = bounded(source.bookings, collections, "bookings");
  const reportsMade = bounded(source.reportsMade, collections, "reportsMade");
  const reportsReceived = bounded(
    source.reportsReceived,
    collections,
    "reportsReceived",
  );
  const aiCoachUsages = bounded(
    source.aiCoachUsages,
    collections,
    "aiCoachUsages",
  );
  const phoneVerifications = bounded(
    source.phoneVerifications,
    collections,
    "phoneVerifications",
  );

  const output = {
    export: {
      generatedAt: exportedAt.toISOString(),
      formatVersion: 2,
      complete: true,
      collectionLimit: EXPORT_COLLECTION_LIMIT,
      collections,
      integrityIssues,
      excludedForSecurity: [
        "passwordHash",
        "emailVerifyToken",
        "passwordResetToken",
        "sessionVersion",
        "phoneVerification.codeHash",
        "pushSubscription.endpoint",
        "pushSubscription.p256dh",
        "pushSubscription.auth",
        "coupleSpace.inviteCode",
        "coupleSpace.inviteCodeHash",
        "coupleSpace.inviteEmailHash",
        "blessing.tokenHash",
        "aiCompanionMeta.systemPrompt",
        "reportsReceived.reporterIdentityAndReason",
        "blocksReceived.identities",
        "passesReceived.identities",
      ],
    },
    account: {
      id: source.account.id,
      email: source.account.email,
      displayName: source.account.displayName,
      age: source.account.age,
      gender: source.account.gender,
      role: source.account.role,
      kind: source.account.kind,
      locale: source.account.locale,
      rulesetId: source.account.rulesetId,
      season: source.account.season,
      isVerified: source.account.isVerified,
      photoUrl: source.account.photoUrl,
      photoBlurredByDefault: source.account.photoBlurredByDefault,
      photoBlurhash: source.account.photoBlurhash,
      cityApprox: source.account.cityApprox,
      country: source.account.country,
      phone: source.account.phone,
      phoneVerified: source.account.phoneVerified,
      stripeCustomerId: source.account.stripeCustomerId,
      subscriptionStatus: source.account.subscriptionStatus,
      devotionalActivity: {
        lastDevotionDate: source.account.lastDevotionDate,
        currentStreak: source.account.currentStreak,
        longestStreak: source.account.longestStreak,
      },
      onboardingDoneAt: source.account.onboardingDoneAt,
      deletedAt: source.account.deletedAt,
      createdAt: source.account.createdAt,
      updatedAt: source.account.updatedAt,
    },
    faithProfile:
      source.faithProfile === null
        ? null
        : {
            vertical: source.faithProfile.vertical,
            denomination: source.faithProfile.denomination,
            ministry: source.faithProfile.ministry,
            engagementFrequency: source.faithProfile.engagementFrequency,
            localChurch: decodeEncrypted(
              source.faithProfile.localChurchEncrypted,
              "faithProfile.localChurch",
              integrityIssues,
            ),
            localChurchVisibility: source.faithProfile.localChurchVisibility,
            testimony: decodeEncrypted(
              source.faithProfile.testimonyEncrypted,
              "faithProfile.testimony",
              integrityIssues,
            ),
            testimonyVisibility: source.faithProfile.testimonyVisibility,
          },
    relationshipProfile:
      source.relationshipProfile === null
        ? null
        : {
            maritalStatus: source.relationshipProfile.maritalStatus,
            hasChildren: source.relationshipProfile.hasChildren,
            childrenVisibility: source.relationshipProfile.childrenVisibility,
            wantsChildren: source.relationshipProfile.wantsChildren,
            acceptsChildren: source.relationshipProfile.acceptsChildren,
            familyVision: decodeEncrypted(
              source.relationshipProfile.familyVisionEncrypted,
              "relationshipProfile.familyVision",
              integrityIssues,
            ),
            familyVisionVisibility:
              source.relationshipProfile.familyVisionVisibility,
            intentionStatement: source.relationshipProfile.intentionStatement,
            intentionVisibility: source.relationshipProfile.intentionVisibility,
            interests: source.relationshipProfile.interests,
            personality: source.relationshipProfile.personality,
            aspirations: source.relationshipProfile.aspirations,
          },
    privacySettings:
      source.privacySettings === null
        ? null
        : {
            antiMalaiseEnabled: source.privacySettings.antiMalaiseEnabled,
            antiMalaiseRadiusKm: source.privacySettings.antiMalaiseRadiusKm,
            invisibleMode: source.privacySettings.invisibleMode,
            fieldVisibility: source.privacySettings.fieldVisibility,
          },
    consents: consents.map((row) => ({
      id: row.id,
      type: row.type,
      version: row.version,
      purpose: row.purpose,
      recipient: row.recipient,
      grantedAt: row.grantedAt,
      revokedAt: row.revokedAt,
    })),
    matches: matches.map((row) => {
      const mineA = row.userAId === userId;
      const other = mineA ? row.userB : row.userA;
      return {
        id: row.id,
        otherMember: { id: other.id, displayName: other.displayName },
        stage: row.stage,
        status: row.status,
        compatibility: row.compatibilityJson,
        contactExchange: row.contactExchange,
        contactExchangeRequestedBy: relationToMe(
          row.contactExchangeRequestedBy,
          userId,
        ),
        advanceRequestedBy: relationToMe(row.advanceRequestedBy, userId),
        requestedBy: relationToMe(row.requestedById, userId),
        closedBy: relationToMe(row.closedBy, userId),
        closeMessage: row.closeMessage,
        lastReadAt: mineA ? row.lastReadAtUserA : row.lastReadAtUserB,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      };
    }),
    matchMessages: matchMessages.map((row) => {
      const mine = row.senderId === userId;
      return {
        id: row.id,
        matchId: row.matchId,
        direction: mine
          ? "sent"
          : row.kind === "SYSTEM"
            ? "system"
            : "received",
        kind: row.kind,
        content: decodeEncrypted(
          row.contentEncrypted,
          `matchMessages.${row.id}.content`,
          integrityIssues,
        ),
        moderationStatus: row.moderationStatus,
        blockedReason: mine ? row.blockedReason : null,
        createdAt: row.createdAt,
      };
    }),
    allianceAnswers: allianceAnswers.map((row) => ({
      id: row.id,
      matchId: row.matchId,
      stage: row.stage,
      questionId: row.questionId,
      answer: decodeAlliance(row, integrityIssues),
      createdAt: row.createdAt,
    })),
    coachAi: {
      messages: coachMessages.map((row) => ({
        id: row.id,
        mode: row.mode,
        role: row.role,
        content: decodeEncrypted(
          row.contentEncrypted,
          `coachAi.messages.${row.id}.content`,
          integrityIssues,
        ),
        guardrail: row.guardrail,
        createdAt: row.createdAt,
      })),
      dailyUsages: aiCoachUsages.map((row) => ({
        day: row.day,
        count: row.count,
      })),
    },
    agentInsights: agentInsights.map((row) => {
      const legacy = isLegacyInsightValue(row.dataJson);
      const data = openInsight(row.dataJson);
      if (data === null && typeof row.dataJson === "string") {
        integrityIssues.push(`agentInsights.${row.id}.data`);
      }
      return {
        id: row.id,
        matchId: row.matchId,
        coupleSpaceId: row.coupleSpaceId,
        agentId: row.agentId,
        kind: row.kind,
        data,
        storageFormat: legacy ? "legacy" : "encrypted",
        visibility: row.visibility,
        createdAt: row.createdAt,
        revokedAt: row.revokedAt,
      };
    }),
    couple:
      source.coupleSpace === null
        ? null
        : {
            space: {
              id: source.coupleSpace.id,
              status: source.coupleSpace.status,
              origin: source.coupleSpace.origin,
              matchId: source.coupleSpace.matchId,
              season: source.coupleSpace.season,
              marriedAt: source.coupleSpace.marriedAt,
              role:
                source.coupleSpace.userAId === userId ? "creator" : "partner",
              partner:
                source.coupleSpace.userAId === userId
                  ? source.coupleSpace.userB
                  : source.coupleSpace.userA,
              createdAt: source.coupleSpace.createdAt,
              updatedAt: source.coupleSpace.updatedAt,
            },
            messages: coupleMessages.map((row) => ({
              id: row.id,
              direction: row.senderId === userId ? "sent" : "received",
              content: decodeEncrypted(
                row.contentEncrypted,
                `couple.messages.${row.id}.content`,
                integrityIssues,
              ),
              createdAt: row.createdAt,
            })),
          },
    games: gameRounds.map((row) => {
      const submission = row.answers[0] ?? null;
      return {
        id: row.id,
        surface:
          row.matchId !== null
            ? { type: "match", id: row.matchId }
            : { type: "couple", id: row.coupleSpaceId },
        mode: row.mode,
        questionKey: row.questionKey,
        questionText: row.questionText,
        initiatedByMe: row.initiatorId === userId,
        status: row.status,
        mySubmission:
          submission === null
            ? null
            : {
                id: submission.id,
                answer: decodeEncrypted(
                  submission.answerEncrypted,
                  `games.${row.id}.answer`,
                  integrityIssues,
                ),
                guess: decodeEncrypted(
                  submission.guessEncrypted,
                  `games.${row.id}.guess`,
                  integrityIssues,
                ),
                createdAt: submission.createdAt,
              },
        createdAt: row.createdAt,
        revealedAt: row.revealedAt,
      };
    }),
    sponsor:
      source.sponsor === null
        ? null
        : {
            name: source.sponsor.name,
            email: source.sponsor.email,
            relation: source.sponsor.relation,
            createdAt: source.sponsor.createdAt,
            blessings: blessings.map((row) => ({
              id: row.id,
              matchId: row.matchId,
              status: row.status,
              note: decodeEncrypted(
                row.noteEncrypted,
                `sponsor.blessings.${row.id}.note`,
                integrityIssues,
              ),
              createdAt: row.createdAt,
              respondedAt: row.respondedAt,
            })),
          },
    safetyAndDiscoveryActions: {
      blocksMade: blocksMade.map((row) => ({
        id: row.id,
        blockedMember: row.other,
        createdAt: row.createdAt,
      })),
      passesMade: passesMade.map((row) => ({
        id: row.id,
        passedMember: row.other,
        createdAt: row.createdAt,
      })),
      restrictedThirdPartyCounts: source.restrictedThirdPartyCounts,
    },
    bookings: bookings.map((row) => ({
      id: row.id,
      slotStart: row.slotStart,
      status: row.status,
      createdAt: row.createdAt,
      coach: row.coach,
    })),
    reports: {
      made: reportsMade.map((row) => ({
        id: row.id,
        target: row.target,
        reason: row.reason,
        status: row.status,
        createdAt: row.createdAt,
        resolvedAt: row.resolvedAt,
      })),
      received: reportsReceived.map((row) => ({
        id: row.id,
        status: row.status,
        createdAt: row.createdAt,
        resolvedAt: row.resolvedAt,
        detailsWithheldToProtectThirdParties: true,
      })),
    },
    securityActivity: {
      phoneVerifications: phoneVerifications.map((row) => ({
        id: row.id,
        expiresAt: row.expiresAt,
        attempts: row.attempts,
        createdAt: row.createdAt,
      })),
      registeredPushDevices: source.registeredPushDevices,
    },
  };

  output.export.complete =
    integrityIssues.length === 0 &&
    Object.values(collections).every((meta) => !meta.truncated);

  return output;
}
