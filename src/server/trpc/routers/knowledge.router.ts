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

  navigation: publicProcedure.query(async ({ ctx }) => {
    const [documents, rootIndexes] = await Promise.all([
      ctx.db.knowledgeDocument.findMany({
        where: { deletedAt: null },
        orderBy: { relativePath: "asc" },
        select: {
          id: true,
          relativePath: true,
          title: true,
          pillar: true,
        },
      }),
      ctx.db.knowledgeDocument.findMany({
        where: {
          deletedAt: null,
          relativePath: { in: ["_roadmap.md", "_index.md"] },
        },
        select: { id: true, relativePath: true, content: true },
      }),
    ]);

    const rootIndex =
      rootIndexes.find((document) => document.relativePath === "_roadmap.md") ??
      rootIndexes.find((document) => document.relativePath === "_index.md") ??
      null;
    const categoryOrder = new Map<string, number>();

    for (const match of rootIndex?.content.matchAll(/\[\[([^\]\\|]+)(?:\\?\|[^\]]+)?\]\]/g) ?? []) {
      const target = match[1]?.replace(/\.md$/i, "");
      const category = target?.match(/^([^/]+)\/_index$/i)?.[1];
      if (category && !categoryOrder.has(category)) {
        categoryOrder.set(category, categoryOrder.size);
      }
    }

    const categories = new Map<
      string,
      {
        name: string;
        title: string;
        indexDocumentId: string | null;
        documentCount: number;
      }
    >();

    for (const document of documents) {
      if (!document.pillar) continue;
      const category = categories.get(document.pillar) ?? {
        name: document.pillar,
        title: document.pillar
          .split("-")
          .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
          .join(" "),
        indexDocumentId: null,
        documentCount: 0,
      };
      if (document.relativePath === `${document.pillar}/_index.md`) {
        category.title = document.title;
        category.indexDocumentId = document.id;
      } else {
        category.documentCount += 1;
      }
      categories.set(document.pillar, category);
    }

    return {
      indexDocumentId: rootIndex?.id ?? null,
      categories: [...categories.values()].sort((left, right) => {
        const leftOrder = categoryOrder.get(left.name) ?? Number.MAX_SAFE_INTEGER;
        const rightOrder = categoryOrder.get(right.name) ?? Number.MAX_SAFE_INTEGER;
        return leftOrder - rightOrder || left.title.localeCompare(right.title);
      }),
      documents,
    };
  }),

  index: publicProcedure.query(async ({ ctx }) => {
    const document = await ctx.db.knowledgeDocument.findFirst({
      where: {
        deletedAt: null,
        relativePath: { in: ["_roadmap.md", "_index.md"] },
      },
      include: {
        tags: { select: { tag: true }, orderBy: { tag: "asc" } },
      },
      orderBy: { relativePath: "desc" },
    });
    if (!document) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Knowledge index not found. Sync the Obsidian vault to add it.",
      });
    }
    const { tags, canvas, ...rest } = document;
    return {
      ...rest,
      canvas: canvas ? obsidianCanvasSchema.parse(canvas) : null,
      tags: tags.map(({ tag }) => tag),
    };
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
