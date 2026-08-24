import { TRPCError } from "@trpc/server";
import type { Prisma } from "@/generated/prisma/client";
import { router, publicProcedure } from "@/server/trpc/init";
import {
  hubIdSchema,
  hubIdeaCreateSchema,
  hubIdeaUpdateSchema,
  hubLabelCreateSchema,
  hubLabelUpdateSchema,
  hubProjectCreateSchema,
  hubProjectUpdateSchema,
  hubSubtaskCreateSchema,
  hubSubtaskUpdateSchema,
  hubTaskCreateSchema,
  hubTaskUpdateSchema,
} from "@/server/trpc/schemas/hub.schema";
import { importHubStarterData } from "@/server/hub/starter-data";

const taskInclude = {
  project: true,
  sourceIdea: { select: { id: true, identifier: true, title: true } },
  labels: { include: { label: true } },
  subtasks: { orderBy: [{ position: "asc" }, { createdAt: "asc" }] },
} satisfies Prisma.HubTaskInclude;

const ideaInclude = {
  project: true,
  sourceTask: { select: { id: true, identifier: true, title: true } },
} satisfies Prisma.HubIdeaInclude;

function cleanOptional(value: string | null | undefined) {
  return value?.trim() || null;
}

type HubTaskRow = Prisma.HubTaskGetPayload<{ include: typeof taskInclude }>;
type HubIdeaRow = Prisma.HubIdeaGetPayload<{ include: typeof ideaInclude }>;

function serializeTask(task: HubTaskRow) {
  const { labels, ...rest } = task;
  return { ...rest, labels: labels.map((item) => item.label) };
}

function serializeIdea(idea: HubIdeaRow) {
  return { ...idea, score: Number(idea.score) };
}

async function nextIdentifier(
  database: Prisma.TransactionClient,
  kind: "task" | "idea",
) {
  const sequence = await database.hubSequence.upsert({
    where: { id: "default" },
    create: {
      id: "default",
      taskNumber: kind === "task" ? 1 : 0,
      ideaNumber: kind === "idea" ? 1 : 0,
    },
    update:
      kind === "task"
        ? { taskNumber: { increment: 1 } }
        : { ideaNumber: { increment: 1 } },
  });
  return kind === "task"
    ? `PER-${sequence.taskNumber}`
    : `IDEA-${sequence.ideaNumber}`;
}

export const hubRouter = router({
  workspace: publicProcedure.query(async ({ ctx }) => {
    const [tasks, ideas, projects, labels] = await Promise.all([
      ctx.db.hubTask.findMany({
        include: taskInclude,
        orderBy: [{ position: "asc" }, { createdAt: "desc" }],
      }),
      ctx.db.hubIdea.findMany({
        include: ideaInclude,
        orderBy: [{ score: "desc" }, { createdAt: "desc" }],
      }),
      ctx.db.hubProject.findMany({ orderBy: { name: "asc" } }),
      ctx.db.hubLabel.findMany({ orderBy: { name: "asc" } }),
    ]);

    return {
      tasks: tasks.map(serializeTask),
      ideas: ideas.map(serializeIdea),
      projects,
      labels,
    };
  }),

  task: router({
    create: publicProcedure
      .input(hubTaskCreateSchema)
      .mutation(async ({ ctx, input }) => {
        return ctx.db.$transaction(async (database) => {
          const identifier = await nextIdentifier(database, "task");
          const task = await database.hubTask.create({
            data: {
              identifier,
              title: input.title,
              description: cleanOptional(input.description),
              status: input.status,
              priority: input.priority,
              dueDate: input.dueDate ?? null,
              estimatePoints: input.estimatePoints ?? null,
              projectId: input.projectId ?? null,
              sourceIdeaId: input.sourceIdeaId ?? null,
              completedAt: input.status === "DONE" ? new Date() : null,
              labels: {
                create: input.labelIds.map((labelId) => ({ labelId })),
              },
            },
            include: taskInclude,
          });
          return serializeTask(task);
        });
      }),

    update: publicProcedure
      .input(hubTaskUpdateSchema)
      .mutation(async ({ ctx, input }) => {
        const { id, labelIds, ...updates } = input;
        return ctx.db.$transaction(async (database) => {
          const existing = await database.hubTask.findUnique({ where: { id } });
          if (!existing) {
            throw new TRPCError({ code: "NOT_FOUND", message: "Task not found" });
          }
          if (labelIds) {
            await database.hubTaskLabel.deleteMany({ where: { taskId: id } });
          }
          const task = await database.hubTask.update({
            where: { id },
            data: {
              ...updates,
              description:
                updates.description === undefined
                  ? undefined
                  : cleanOptional(updates.description),
              projectId:
                updates.projectId === undefined ? undefined : updates.projectId,
              dueDate: updates.dueDate === undefined ? undefined : updates.dueDate,
              estimatePoints:
                updates.estimatePoints === undefined
                  ? undefined
                  : updates.estimatePoints,
              completedAt:
                updates.status === undefined
                  ? undefined
                  : updates.status === "DONE"
                    ? existing.completedAt ?? new Date()
                    : null,
              labels: labelIds
                ? { create: labelIds.map((labelId) => ({ labelId })) }
                : undefined,
            },
            include: taskInclude,
          });
          return serializeTask(task);
        });
      }),

    delete: publicProcedure.input(hubIdSchema).mutation(({ ctx, input }) =>
      ctx.db.hubTask.delete({ where: { id: input.id } }),
    ),
  }),

  subtask: router({
    create: publicProcedure
      .input(hubSubtaskCreateSchema)
      .mutation(async ({ ctx, input }) => {
        const count = await ctx.db.hubSubtask.count({
          where: { taskId: input.taskId },
        });
        return ctx.db.hubSubtask.create({
          data: { ...input, position: count },
        });
      }),
    update: publicProcedure
      .input(hubSubtaskUpdateSchema)
      .mutation(({ ctx, input }) => {
        const { id, ...data } = input;
        return ctx.db.hubSubtask.update({ where: { id }, data });
      }),
    delete: publicProcedure.input(hubIdSchema).mutation(({ ctx, input }) =>
      ctx.db.hubSubtask.delete({ where: { id: input.id } }),
    ),
  }),

  idea: router({
    create: publicProcedure
      .input(hubIdeaCreateSchema)
      .mutation(async ({ ctx, input }) => {
        return ctx.db.$transaction(async (database) => {
          const identifier = await nextIdentifier(database, "idea");
          const score = (input.impact * input.confidence) / input.effort;
          const idea = await database.hubIdea.create({
            data: {
              ...input,
              identifier,
              projectId: input.projectId ?? null,
              targetQuarter: cleanOptional(input.targetQuarter),
              notes: cleanOptional(input.notes),
              score,
            },
            include: ideaInclude,
          });
          return serializeIdea(idea);
        });
      }),

    update: publicProcedure
      .input(hubIdeaUpdateSchema)
      .mutation(async ({ ctx, input }) => {
        const { id, ...updates } = input;
        const existing = await ctx.db.hubIdea.findUnique({ where: { id } });
        if (!existing) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Idea not found" });
        }
        const impact = updates.impact ?? existing.impact;
        const effort = updates.effort ?? existing.effort;
        const confidence = updates.confidence ?? existing.confidence;
        const idea = await ctx.db.hubIdea.update({
          where: { id },
          data: {
            ...updates,
            projectId:
              updates.projectId === undefined ? undefined : updates.projectId,
            targetQuarter:
              updates.targetQuarter === undefined
                ? undefined
                : cleanOptional(updates.targetQuarter),
            notes:
              updates.notes === undefined ? undefined : cleanOptional(updates.notes),
            score: (impact * confidence) / effort,
          },
          include: ideaInclude,
        });
        return serializeIdea(idea);
      }),

    delete: publicProcedure.input(hubIdSchema).mutation(({ ctx, input }) =>
      ctx.db.hubIdea.delete({ where: { id: input.id } }),
    ),

    convert: publicProcedure
      .input(hubIdSchema)
      .mutation(async ({ ctx, input }) => {
        return ctx.db.$transaction(async (database) => {
          const idea = await database.hubIdea.findUnique({
            where: { id: input.id },
            include: { sourceTask: true },
          });
          if (!idea) {
            throw new TRPCError({ code: "NOT_FOUND", message: "Idea not found" });
          }
          if (idea.sourceTask) return idea.sourceTask;

          const identifier = await nextIdentifier(database, "task");
          const task = await database.hubTask.create({
            data: {
              identifier,
              title: idea.title,
              description: [
                idea.description,
                `Converted from ${idea.identifier} · ${idea.category} · score ${Number(idea.score)}`,
              ]
                .filter(Boolean)
                .join("\n\n"),
              status: "TODO",
              priority: idea.impact >= 4 ? "HIGH" : "MEDIUM",
              dueDate: new Date(),
              estimatePoints: Math.max(1, idea.effort),
              projectId: idea.projectId,
              sourceIdeaId: idea.id,
            },
          });
          await database.hubIdea.update({
            where: { id: idea.id },
            data: { stage: "IN_ACTION" },
          });
          return task;
        });
      }),
  }),

  project: router({
    create: publicProcedure
      .input(hubProjectCreateSchema)
      .mutation(({ ctx, input }) =>
        ctx.db.hubProject.create({
          data: {
            ...input,
            icon: cleanOptional(input.icon),
            description: cleanOptional(input.description),
          },
        }),
      ),
    update: publicProcedure
      .input(hubProjectUpdateSchema)
      .mutation(({ ctx, input }) => {
        const { id, ...data } = input;
        return ctx.db.hubProject.update({
          where: { id },
          data: {
            ...data,
            icon: data.icon === undefined ? undefined : cleanOptional(data.icon),
            description:
              data.description === undefined
                ? undefined
                : cleanOptional(data.description),
          },
        });
      }),
    delete: publicProcedure.input(hubIdSchema).mutation(({ ctx, input }) =>
      ctx.db.hubProject.delete({ where: { id: input.id } }),
    ),
  }),

  label: router({
    create: publicProcedure
      .input(hubLabelCreateSchema)
      .mutation(({ ctx, input }) => ctx.db.hubLabel.create({ data: input })),
    update: publicProcedure
      .input(hubLabelUpdateSchema)
      .mutation(({ ctx, input }) => {
        const { id, ...data } = input;
        return ctx.db.hubLabel.update({ where: { id }, data });
      }),
    delete: publicProcedure.input(hubIdSchema).mutation(({ ctx, input }) =>
      ctx.db.hubLabel.delete({ where: { id: input.id } }),
    ),
  }),

  importStarterData: publicProcedure.mutation(async ({ ctx }) =>
    importHubStarterData(ctx.db),
  ),
});
