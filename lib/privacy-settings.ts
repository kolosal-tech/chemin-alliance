import { z } from "zod";

/**
 * Seuls les contrôles réellement appliqués par le moteur sont acceptés ici.
 * Les niveaux fins passent par les actions de coffre-fort dédiées.
 */
export const privacySettingsPatchSchema = z
  .object({
    antiMalaiseEnabled: z.boolean().optional(),
    invisibleMode: z.boolean().optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: "EMPTY_PATCH",
  });
