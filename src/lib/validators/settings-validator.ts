import { z } from "zod";

export const settingsSchema = z.object({
  analyzeTone: z.boolean().optional(),
  correlateSocial: z.boolean().optional(),
  shareWithTherapist: z.boolean().optional(),
});

export function validateSettings(data: unknown) {
  return settingsSchema.parse(data);
}
