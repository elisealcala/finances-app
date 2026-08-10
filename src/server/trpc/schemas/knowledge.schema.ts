import { z } from "zod";

export const listKnowledgeDocumentsSchema = z
  .object({
    search: z.string().trim().max(200).optional(),
    tag: z.string().trim().max(100).optional(),
    pillar: z.string().trim().max(100).optional(),
    limit: z.number().int().min(1).max(200).default(100),
  })
  .default({ limit: 100 });

export const getKnowledgeDocumentSchema = z.object({
  id: z.string().min(1),
});
