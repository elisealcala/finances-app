import { z } from "zod";

export const listNotesSchema = z
  .object({
    year: z.number().int().optional(),
    month: z.number().int().min(1).max(12).optional(),
  })
  .optional();

export const getNoteByIdSchema = z.object({
  id: z.string(),
});

export const createNoteSchema = z.object({
  date: z.date(),
  title: z.string().optional().nullable(),
  content: z.unknown(),
});

export const updateNoteSchema = z.object({
  id: z.string(),
  date: z.date().optional(),
  title: z.string().optional().nullable(),
  content: z.unknown().optional(),
});

export const deleteNoteSchema = z.object({
  id: z.string(),
});
