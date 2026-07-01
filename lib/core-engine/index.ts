import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parse } from "yaml";
import {
  rulesetSchema,
  type ActionContext,
  type Locale,
  type Question,
  type Ruleset,
  type ValidateActionInput,
  type ValidateActionResult,
} from "./types";

export * from "./types";

const RULESETS_DIR = join(process.cwd(), "rulesets");
const cache = new Map<string, Ruleset>();

export function loadRuleset(id: string): Ruleset {
  const cached = cache.get(id);
  if (cached) return cached;
  if (!/^[a-z0-9_]+$/.test(id)) {
    throw new Error(`Identifiant de ruleset invalide: ${id}`);
  }
  let raw: string;
  try {
    raw = readFileSync(join(RULESETS_DIR, `${id}.yaml`), "utf8");
  } catch {
    throw new Error(`Ruleset introuvable: ${id}`);
  }
  const parsed = rulesetSchema.safeParse(parse(raw));
  if (!parsed.success) {
    throw new Error(
      `Ruleset ${id} invalide: ${parsed.error.issues
        .map((i) => `${i.path.join(".")}: ${i.message}`)
        .join("; ")}`,
    );
  }
  cache.set(id, parsed.data.ruleset);
  return parsed.data.ruleset;
}

/** DISCOVERY -> discovery ; MARRIAGE_PREPARATION -> marriage_preparation */
function normalizeStage(stage: string): string {
  return stage.toLowerCase();
}

function message(
  ruleset: Ruleset,
  code: string,
  locale: Locale = "fr",
): string {
  const entry = ruleset.messages[code];
  return entry?.[locale] ?? entry?.fr ?? code;
}

export function getAllowedActions(stage: string, rulesetId: string): string[] {
  const ruleset = loadRuleset(rulesetId);
  return ruleset.stages[normalizeStage(stage)]?.allowed_actions ?? [];
}

export function getClergyRoles(rulesetId: string): string[] {
  return loadRuleset(rulesetId).clergy_roles;
}

export function getStageQuestions(
  rulesetId: string,
  stage: string,
): Question[] {
  const ruleset = loadRuleset(rulesetId);
  return ruleset.stages[normalizeStage(stage)]?.questions ?? [];
}

export function getNextStage(rulesetId: string, stage: string): string | null {
  const ruleset = loadRuleset(rulesetId);
  return ruleset.stages[normalizeStage(stage)]?.next ?? null;
}

/** Évalue une condition nommée à partir du contexte factuel fourni. */
function evaluateCheck(
  check: string,
  ruleset: Ruleset,
  ctx: ActionContext,
): boolean {
  switch (check) {
    case "no_active_report":
      return ctx.hasActiveReport !== true;
    case "mutual_consent":
      return ctx.mutualConsent === true;
    case "minimum_dialogue_completed": {
      const min = Number(ruleset.principles.minimum_dialogue_questions ?? 4);
      return (ctx.dialogueAnswersCount ?? 0) >= min;
    }
    case "stage_questions_completed": {
      const total = ctx.stageQuestionsTotal ?? 0;
      return total === 0 || (ctx.stageAnswersCount ?? 0) >= total;
    }
    case "contact_exchange_accepted":
      return ctx.contactExchangeStatus === "ACCEPTED";
    default:
      // Zero Trust : une condition inconnue échoue.
      return false;
  }
}

/**
 * Point d'entrée unique : la messagerie, l'échange de coordonnées et les
 * transitions d'étape DOIVENT passer par cette fonction. La doctrine vit
 * dans les YAML, jamais dans le code appelant.
 */
export function validateAction(
  input: ValidateActionInput,
): ValidateActionResult {
  const ruleset = loadRuleset(input.rulesetId);
  const locale = input.context?.locale ?? "fr";
  const ctx = input.context ?? {};
  const stageKey = normalizeStage(input.stage);

  if (stageKey === "closed") {
    return {
      allowed: false,
      reasonCode: "MATCH_CLOSED",
      userMessage: message(ruleset, "MATCH_CLOSED", locale),
      requiredNextSteps: [],
    };
  }

  const stage = ruleset.stages[stageKey];
  if (!stage) {
    return {
      allowed: false,
      reasonCode: "UNKNOWN_STAGE",
      userMessage: message(ruleset, "ACTION_FORBIDDEN_AT_STAGE", locale),
      requiredNextSteps: [],
    };
  }

  const actionRules = ruleset.actions[input.action];

  // 1. Action explicitement interdite à cette étape.
  if (stage.forbidden_actions.includes(input.action)) {
    const code = actionRules?.blocked_reason ?? "ACTION_FORBIDDEN_AT_STAGE";
    return {
      allowed: false,
      reasonCode: code,
      userMessage: message(ruleset, code, locale),
      requiredNextSteps: actionRules?.requires ?? [],
    };
  }

  // 2. Action non listée comme autorisée -> refus par défaut (Zero Trust).
  if (!stage.allowed_actions.includes(input.action)) {
    const code = actionRules?.blocked_reason ?? "ACTION_FORBIDDEN_AT_STAGE";
    return {
      allowed: false,
      reasonCode: code,
      userMessage: message(ruleset, code, locale),
      requiredNextSteps: actionRules?.requires ?? [],
    };
  }

  // 3. Conditions propres à l'action (ex: contact_exchange_accepted).
  const requires = [
    ...(actionRules?.requires ?? []),
    ...(input.action === "advance_stage" ? stage.required_checks : []),
  ];
  const failing = requires.filter((c) => !evaluateCheck(c, ruleset, ctx));
  if (failing.length > 0) {
    const code =
      actionRules?.blocked_reason ??
      (failing.includes("contact_exchange_accepted")
        ? "CONTACT_EXCHANGE_NOT_ACCEPTED"
        : "CHECKS_NOT_MET");
    return {
      allowed: false,
      reasonCode: code,
      userMessage: message(ruleset, code, locale),
      requiredNextSteps: failing,
    };
  }

  return {
    allowed: true,
    reasonCode: "OK",
    userMessage: "",
    requiredNextSteps: [],
  };
}
