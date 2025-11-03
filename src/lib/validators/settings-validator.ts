import { z } from "zod";

export const settingsSchema = z.object({
  analyzeTone: z.boolean().optional(),
  correlateSocial: z.boolean().optional(),
  shareWithTherapist: z.boolean().optional(),
});

export const exportSchema = z.object({
  format: z.enum(['json', 'csv']),
});

export type SettingsInput = z.infer<typeof settingsSchema>;
export type ExportInput = z.infer<typeof exportSchema>;

export function validateSettings(data: unknown) {
  return settingsSchema.parse(data);
}
