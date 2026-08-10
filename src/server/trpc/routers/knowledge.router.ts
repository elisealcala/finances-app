import { Prisma } from "@/generated/prisma/client";
import { obsidianCanvasSchema } from "@/server/knowledge/canvas";
import { syncKnowledgeVault } from "@/server/knowledge/vault";
import { publicProcedure, router } from "@/server/trpc/init";
import {
  getKnowledgeDocumentSchema,
  listKnowledgeDocumentsSchema,
} from "@/server/trpc/schemas/knowledge.schema";
import { TRPCError } from "@trpc/server";

export const knowledgeRouter = router({
  status: publicProcedure.query(async ({ ctx }) => {
    const [documentCount, canvasCount, latest] = await Promise.all([
      ctx.db.knowledgeDocument.count({ where: { deletedAt: null } }),
      ctx.db.knowledgeDocument.count({
        where: { deletedAt: null, canvasHash: { not: null } },
      }),
      ctx.db.knowledgeDocument.findFirst({
        where: { deletedAt: null },
        orderBy: { indexedAt: "desc" },
        select: { indexedAt: true },
      }),
    ]);
    return {
      documentCount,
      canvasCount,
      lastIndexedAt: latest?.indexedAt ?? null,
    };
  }),

  list: publicProcedure
    .input(listKnowledgeDocumentsSchema)
    .query(async ({ ctx, input }) => {
      const where: Prisma.KnowledgeDocumentWhereInput = {
        deletedAt: null,
        ...(input.pillar ? { pillar: input.pillar } : {}),
        ...(input.tag ? { tags: { some: { tag: input.tag } } } : {}),
        ...(input.search
          ? {
              OR: [
                { title: { contains: input.search, mode: "insensitive" } },
                { excerpt: { contains: input.search, mode: "insensitive" } },
                {
                  relativePath: {
                    contains: input.search,
                    mode: "insensitive",
                  },
                },
                {
                  tags: {
                    some: {
                      tag: { contains: input.search, mode: "insensitive" },
                    },
                  },
                },
              ],
            }
          : {}),
      };

      const documents = await ctx.db.knowledgeDocument.findMany({
        where,
        take: input.limit,
        orderBy: [{ date: "desc" }, { title: "asc" }],
        select: {
          id: true,
          relativePath: true,
          title: true,
          excerpt: true,
          pillar: true,
          date: true,
          modifiedAt: true,
          indexedAt: true,
          canvasHash: true,
          tags: { select: { tag: true }, orderBy: { tag: "asc" } },
        },
      });

      return documents.map(({ tags, canvasHash, ...document }) => ({
        ...document,
        hasCanvas: Boolean(canvasHash),
        tags: tags.map(({ tag }) => tag),
      }));
    }),

  get: publicProcedure
    .input(getKnowledgeDocumentSchema)
    .query(async ({ ctx, input }) => {
      const document = await ctx.db.knowledgeDocument.findFirst({
        where: { id: input.id, deletedAt: null },
        include: {
          tags: { select: { tag: true }, orderBy: { tag: "asc" } },
        },
      });
      if (!document) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Knowledge note not found" });
      }
      const { tags, canvas, ...rest } = document;
      return {
        ...rest,
        canvas: canvas ? obsidianCanvasSchema.parse(canvas) : null,
        tags: tags.map(({ tag }) => tag),
      };
    }),

  sync: publicProcedure.mutation(async ({ ctx }) => syncKnowledgeVault(ctx.db)),
});
