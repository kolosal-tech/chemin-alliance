import { z } from "zod";

export const LOCALES = ["fr", "en", "es", "pt"] as const;
export type Locale = (typeof LOCALES)[number];

const localizedText = z.record(z.enum(LOCALES), z.string());

export const questionSchema = z.object({
  id: z.string(),
  theme: z.string(),
  text: localizedText,
});

export const stageSchema = z.object({
  next: z.string().nullable().optional(),
  allowed_actions: z.array(z.string()).default([]),
  forbidden_actions: z.array(z.string()).default([]),
  required_checks: z.array(z.string()).default([]),
  questions: z.array(questionSchema).default([]),
});

export const rulesetSchema = z.object({
  ruleset: z.object({
    id: z.string(),
    name: z.string(),
    version: z.string(),
    description: z.string().optional(),
    principles: z.record(z.string(), z.union([z.boolean(), z.number()])),
    clergy_roles: z.array(z.string()),
    vocabulary: z.record(z.string(), localizedText).default({}),
    messages: z.record(z.string(), localizedText),
    actions: z
      .record(
        z.string(),
        z.object({
          requires: z.array(z.string()).default([]),
          blocked_reason: z.string().optional(),
        }),
      )
      .default({}),
    stages: z.record(z.string(), stageSchema),
  }),
});

export type Ruleset = z.infer<typeof rulesetSchema>["ruleset"];
export type Question = z.infer<typeof questionSchema>;
export type StageRules = z.infer<typeof stageSchema>;

/** Contexte factuel fourni par l'appelant — le moteur ne lit jamais la DB. */
export type ActionContext = {
  locale?: Locale;
  hasActiveReport?: boolean;
  mutualConsent?: boolean;
  dialogueAnswersCount?: number;
  stageAnswersCount?: number;
  stageQuestionsTotal?: number;
  contactExchangeStatus?:
    | "NOT_ALLOWED"
    | "AVAILABLE"
    | "REQUESTED"
    | "ACCEPTED"
    | "DECLINED"
    | "REVOKED";
};

export type ValidateActionInput = {
  rulesetId: string;
  stage: string; // AllianceStage en minuscules ou majuscules
  action: string;
  context?: ActionContext;
};

export type ValidateActionResult = {
  allowed: boolean;
  reasonCode: string;
  userMessage: string;
  requiredNextSteps: string[];
};
