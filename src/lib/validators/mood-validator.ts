import { z } from "zod";

export const moodEntrySchema = z.object({
  mood: z.number().int().min(1).max(5),
  note: z.string().max(500).optional(),
});

export const createMoodSchema = z.object({
  mood: z.enum(["amazing", "good", "okay", "bad", "awful"]),
  note: z.string().max(500).optional(),
});

export const updateMoodSchema = z.object({
  mood: z.enum(["amazing", "good", "okay", "bad", "awful"]).optional(),
  note: z.string().max(500).optional(),
});

export const moodQuerySchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

export const dateRangeSchema = z.object({
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
});

export function validateCreateMood(data: unknown) {
  return createMoodSchema.parse(data);
}

export function validateUpdateMood(data: unknown) {
  return updateMoodSchema.parse(data);
}

export function validateDateRange(data: unknown) {
  return dateRangeSchema.parse(data);
}
