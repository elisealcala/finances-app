import { TRPCError } from "@trpc/server";
import { Prisma } from "@/generated/prisma/client";
import { router, publicProcedure } from "@/server/trpc/init";
import {
  careerCycleGetSchema,
  careerCycleListSchema,
  careerCycleTransitionSchema,
  careerDeleteSchema,
  careerEducationCreateSchema,
  careerEducationUpdateSchema,
  careerEvaluationAcceptSchema,
  careerExperienceCreateSchema,
  careerExperienceUpdateSchema,
  careerGithubRepositoryCreateSchema,
  careerOpportunityCreateSchema,
  careerOpportunityUpdateSchema,
  careerOutputSubmissionSchema,
  careerProfileSchema,
  careerProjectCreateSchema,
  careerProjectUpdateSchema,
  careerResumeGenerateSchema,
  careerResumeGetSchema,
  careerResumeSaveSchema,
  careerRubricCriterionSchema,
  careerSubmissionGradeSchema,
} from "@/server/trpc/schemas/career.schema";
import {
  careerCycleInclude,
  recordCareerProgressSnapshot,
  serializeCareerCycle,
} from "@/server/career/dashboard";
import {
  collectGitHubEvidence,
  createGitHubRepository,
} from "@/server/career/github";
import {
  CAREER_GRADING_PROMPT_VERSION,
  gradeCareerSubmission,
} from "@/server/career/grader";
import {
  generateOpportunityResume,
  RESUME_PROMPT_VERSION,
} from "@/server/career/resume-generator";
import { OPENAI_MODEL } from "@/server/openai/client";

const defaultRubric = [
  {
    criterion: "Completeness",
    description: "The submission satisfies the requested scope and deliverables.",
    weight: 40,
  },
  {
    criterion: "Quality",
    description: "The work is clear, thoughtful, maintainable, and fit for purpose.",
    weight: 40,
  },
  {
    criterion: "Evidence",
    description: "Claims are supported by concrete, verifiable evidence.",
    weight: 20,
  },
];

function notFound(label: string): never {
  throw new TRPCError({ code: "NOT_FOUND", message: `${label} not found` });
}

function cleanOptional(value: string | null | undefined) {
  return value?.trim() || null;
}

export const careerRouter = router({
  overview: publicProcedure.query(async ({ ctx }) => {
    const [cycleRows, recentEvaluations, profile, opportunityCount] =
      await Promise.all([
        ctx.db.performanceCycle.findMany({
          where: { status: { not: "ARCHIVED" } },
          orderBy: [{ startDate: "desc" }, { createdAt: "desc" }],
          include: careerCycleInclude,
        }),
        ctx.db.careerEvaluation.findMany({
          take: 6,
          orderBy: { createdAt: "desc" },
          include: {
            submission: {
              include: {
                keyResult: {
                  include: { outcome: { select: { title: true } } },
                },
              },
            },
          },
        }),
        ctx.db.careerProfile.findUnique({ where: { id: "career-profile" } }),
        ctx.db.careerOpportunity.count({
          where: { status: { in: ["DRAFT", "APPLIED", "INTERVIEW"] } },
        }),
      ]);
    const cycles = cycleRows.map((cycle) => serializeCareerCycle(cycle));
    return {
      activeCycle: cycles.find((cycle) => cycle.status === "ACTIVE") ?? null,
      upcomingCycles: cycles.filter((cycle) =>
        ["DRAFT", "UPCOMING"].includes(cycle.status),
      ),
      recentCycles: cycles
        .filter((cycle) => cycle.status === "COMPLETED")
        .slice(0, 4),
      recentEvaluations: recentEvaluations.map((evaluation) => ({
        ...evaluation,
        score: Number(evaluation.score),
      })),
      resumeReadiness: profile
        ? [
            profile.fullName,
            profile.email,
            profile.summary,
            profile.skills.length ? "skills" : "",
          ].filter(Boolean).length / 4
        : 0,
      opportunityCount,
    };
  }),

  cycle: router({
    list: publicProcedure
      .input(careerCycleListSchema)
      .query(async ({ ctx, input }) => {
        const rows = await ctx.db.performanceCycle.findMany({
          where: {
            ...(input.status ? { status: input.status } : {}),
            ...(!input.includeArchived && !input.status
              ? { status: { not: "ARCHIVED" as const } }
              : {}),
          },
          orderBy: [{ startDate: "desc" }, { createdAt: "desc" }],
          include: careerCycleInclude,
        });
        return rows.map((cycle) => serializeCareerCycle(cycle));
      }),

    get: publicProcedure
      .input(careerCycleGetSchema)
      .query(async ({ ctx, input }) => {
        const cycle = await ctx.db.performanceCycle.findUnique({
          where: { id: input.id },
          include: careerCycleInclude,
        });
        if (!cycle) notFound("Career cycle");
        return serializeCareerCycle(cycle);
      }),

    transition: publicProcedure
      .input(careerCycleTransitionSchema)
      .mutation(async ({ ctx, input }) => {
        const cycle = await ctx.db.performanceCycle.findUnique({
          where: { id: input.id },
        });
        if (!cycle) notFound("Career cycle");
        if (input.status === "ACTIVE") {
          const otherActive = await ctx.db.performanceCycle.findFirst({
            where: { status: "ACTIVE", id: { not: input.id } },
            select: { id: true },
          });
          if (otherActive) {
            throw new TRPCError({
              code: "CONFLICT",
              message: "Complete the current active cycle before activating another",
            });
          }
        }
        const updated = await ctx.db.performanceCycle.update({
          where: { id: input.id },
          data: { status: input.status },
        });
        await recordCareerProgressSnapshot(
          ctx.db,
          input.id,
          `cycle:${input.status.toLowerCase()}`,
        );
        return updated;
      }),
  }),

  github: router({
    createRepository: publicProcedure
      .input(careerGithubRepositoryCreateSchema)
      .mutation(async ({ input }) => createGitHubRepository(input)),
  }),

  output: router({
    submit: publicProcedure
      .input(careerOutputSubmissionSchema)
      .mutation(async ({ ctx, input }) => {
        const output = await ctx.db.performanceKeyResult.findUnique({
          where: { id: input.keyResultId },
          include: { outcome: { include: { cycle: true } } },
        });
        if (!output) notFound("Career output");
        if (output.outcome.cycle.status !== "ACTIVE") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Evidence can only be submitted to an active cycle",
          });
        }
        const githubSnapshot =
          input.url &&
          ["GITHUB_REPOSITORY", "GITHUB_PULL_REQUEST"].includes(input.kind)
            ? await collectGitHubEvidence(input.url).catch((error) => ({
                evidence: {
                  collectionError:
                    error instanceof Error ? error.message : "GitHub collection failed",
                },
                snapshotHash: null,
              }))
            : null;
        return ctx.db.careerOutputSubmission.create({
          data: {
            keyResultId: input.keyResultId,
            kind: input.kind,
            label: cleanOptional(input.label),
            url: cleanOptional(input.url),
            notes: cleanOptional(input.notes),
            snapshotHash: githubSnapshot?.snapshotHash ?? null,
            data: {
              ...input.data,
              ...(githubSnapshot ? { github: githubSnapshot.evidence } : {}),
            } as Prisma.InputJsonValue,
          },
          include: { evaluations: true },
        });
      }),

    grade: publicProcedure
      .input(careerSubmissionGradeSchema)
      .mutation(async ({ ctx, input }) => {
        const submission = await ctx.db.careerOutputSubmission.findUnique({
          where: { id: input.id },
          include: {
            keyResult: { include: { outcome: true } },
          },
        });
        if (!submission) notFound("Output submission");
        const rubricResult = careerRubricCriterionSchema
          .array()
          .safeParse(submission.keyResult.rubric);
        const rubric = rubricResult.success ? rubricResult.data : defaultRubric;
        const result = await gradeCareerSubmission({
          outputTitle: submission.keyResult.title,
          outcomeTitle: submission.keyResult.outcome.title,
          outcomeResult: submission.keyResult.outcome.result,
          rubric,
          submission: {
            kind: submission.kind,
            label: submission.label,
            url: submission.url,
            notes: submission.notes,
            data: submission.data,
          },
          githubEvidence:
            typeof submission.data === "object" && submission.data
              ? (submission.data as { github?: unknown }).github
              : null,
          instructions: input.instructions,
        });
        return ctx.db.careerEvaluation.create({
          data: {
            submissionId: submission.id,
            status: "DRAFT",
            score: new Prisma.Decimal(result.score),
            grade: result.grade,
            summary: result.summary,
            strengths: result.strengths,
            improvements: result.improvements,
            criterionScores: result.criterionScores,
            citations: result.citations,
            model: OPENAI_MODEL,
            promptVersion: CAREER_GRADING_PROMPT_VERSION,
          },
        });
      }),
  }),

  evaluation: router({
    accept: publicProcedure
      .input(careerEvaluationAcceptSchema)
      .mutation(async ({ ctx, input }) => {
        const evaluation = await ctx.db.careerEvaluation.findUnique({
          where: { id: input.id },
          include: {
            submission: {
              include: {
                keyResult: { include: { outcome: true } },
              },
            },
          },
        });
        if (!evaluation) notFound("Evaluation");
        if (evaluation.status !== "DRAFT") {
          throw new TRPCError({
            code: "CONFLICT",
            message: "This evaluation has already been reviewed",
          });
        }
        const score = input.overrideScore ?? Number(evaluation.score);
        return ctx.db.$transaction(async (database) => {
          const progress = await database.performanceProgressUpdate.create({
            data: {
              keyResultId: evaluation.submission.keyResultId,
              progressPercent: new Prisma.Decimal(score),
              confidence: "HIGH",
              summary: input.overrideNote
                ? `${evaluation.summary}\n\nReviewer override: ${input.overrideNote}`
                : evaluation.summary,
              evidenceLabel:
                evaluation.submission.label ||
                `AI evaluation · ${evaluation.grade || `${Math.round(score)}%`}`,
              evidenceUrl: evaluation.submission.url,
            },
          });
          const accepted = await database.careerEvaluation.update({
            where: { id: evaluation.id },
            data: {
              status: input.overrideScore == null ? "ACCEPTED" : "OVERRIDDEN",
              score: new Prisma.Decimal(score),
              acceptedAt: new Date(),
              acceptedProgressUpdateId: progress.id,
            },
          });
          await recordCareerProgressSnapshot(
            database,
            evaluation.submission.keyResult.outcome.cycleId,
            "evaluation:accepted",
          );
          return accepted;
        });
      }),
  }),

  profile: router({
    get: publicProcedure.query(async ({ ctx }) =>
      ctx.db.careerProfile.findUnique({ where: { id: "career-profile" } })),
    update: publicProcedure
      .input(careerProfileSchema)
      .mutation(async ({ ctx, input }) =>
        ctx.db.careerProfile.upsert({
          where: { id: "career-profile" },
          create: {
            id: "career-profile",
            ...input,
            website: cleanOptional(input.website),
            githubUrl: cleanOptional(input.githubUrl),
            linkedInUrl: cleanOptional(input.linkedInUrl),
          },
          update: {
            ...input,
            website: cleanOptional(input.website),
            githubUrl: cleanOptional(input.githubUrl),
            linkedInUrl: cleanOptional(input.linkedInUrl),
          },
        }),
      ),
  }),

  experience: router({
    list: publicProcedure.query(({ ctx }) =>
      ctx.db.careerExperience.findMany({
        orderBy: [{ position: "asc" }, { startDate: "desc" }],
      }),
    ),
    create: publicProcedure
      .input(careerExperienceCreateSchema)
      .mutation(async ({ ctx, input }) => {
        const position = await ctx.db.careerExperience.count();
        return ctx.db.careerExperience.create({
          data: {
            ...input,
            location: cleanOptional(input.location),
            employmentType: cleanOptional(input.employmentType),
            summary: cleanOptional(input.summary),
            endDate: input.current ? null : input.endDate,
            position,
          },
        });
      }),
    update: publicProcedure
      .input(careerExperienceUpdateSchema)
      .mutation(async ({ ctx, input }) => {
        const { id, ...data } = input;
        return ctx.db.careerExperience.update({
          where: { id },
          data: {
            ...data,
            location: cleanOptional(data.location),
            employmentType: cleanOptional(data.employmentType),
            summary: cleanOptional(data.summary),
            endDate: data.current ? null : data.endDate,
          },
        });
      }),
    delete: publicProcedure
      .input(careerDeleteSchema)
      .mutation(({ ctx, input }) =>
        ctx.db.careerExperience.delete({ where: { id: input.id } }),
      ),
  }),

  education: router({
    list: publicProcedure.query(({ ctx }) =>
      ctx.db.careerEducation.findMany({ orderBy: { position: "asc" } }),
    ),
    create: publicProcedure
      .input(careerEducationCreateSchema)
      .mutation(async ({ ctx, input }) => {
        const position = await ctx.db.careerEducation.count();
        return ctx.db.careerEducation.create({ data: { ...input, position } });
      }),
    update: publicProcedure
      .input(careerEducationUpdateSchema)
      .mutation(({ ctx, input }) => {
        const { id, ...data } = input;
        return ctx.db.careerEducation.update({ where: { id }, data });
      }),
    delete: publicProcedure
      .input(careerDeleteSchema)
      .mutation(({ ctx, input }) =>
        ctx.db.careerEducation.delete({ where: { id: input.id } }),
      ),
  }),

  project: router({
    list: publicProcedure.query(({ ctx }) =>
      ctx.db.careerProject.findMany({ orderBy: { position: "asc" } }),
    ),
    create: publicProcedure
      .input(careerProjectCreateSchema)
      .mutation(async ({ ctx, input }) => {
        const position = await ctx.db.careerProject.count();
        return ctx.db.careerProject.create({
          data: {
            ...input,
            url: cleanOptional(input.url),
            githubUrl: cleanOptional(input.githubUrl),
            position,
          },
        });
      }),
    update: publicProcedure
      .input(careerProjectUpdateSchema)
      .mutation(({ ctx, input }) => {
        const { id, ...data } = input;
        return ctx.db.careerProject.update({
          where: { id },
          data: {
            ...data,
            url: cleanOptional(data.url),
            githubUrl: cleanOptional(data.githubUrl),
          },
        });
      }),
    delete: publicProcedure
      .input(careerDeleteSchema)
      .mutation(({ ctx, input }) =>
        ctx.db.careerProject.delete({ where: { id: input.id } }),
      ),
  }),

  opportunity: router({
    list: publicProcedure.query(({ ctx }) =>
      ctx.db.careerOpportunity.findMany({ orderBy: { updatedAt: "desc" } }),
    ),
    create: publicProcedure
      .input(careerOpportunityCreateSchema)
      .mutation(({ ctx, input }) =>
        ctx.db.careerOpportunity.create({
          data: { ...input, url: cleanOptional(input.url) },
        }),
      ),
    update: publicProcedure
      .input(careerOpportunityUpdateSchema)
      .mutation(({ ctx, input }) => {
        const { id, ...data } = input;
        return ctx.db.careerOpportunity.update({
          where: { id },
          data: { ...data, url: cleanOptional(data.url) },
        });
      }),
    delete: publicProcedure
      .input(careerDeleteSchema)
      .mutation(({ ctx, input }) =>
        ctx.db.careerOpportunity.delete({ where: { id: input.id } }),
      ),
  }),

  resume: router({
    list: publicProcedure.query(({ ctx }) =>
      ctx.db.careerResume.findMany({
        orderBy: { updatedAt: "desc" },
        include: {
          opportunity: true,
          versions: { take: 1, orderBy: { version: "desc" } },
        },
      }),
    ),
    get: publicProcedure
      .input(careerResumeGetSchema)
      .query(async ({ ctx, input }) => {
        const resume = await ctx.db.careerResume.findUnique({
          where: { id: input.id },
          include: {
            opportunity: true,
            versions: { orderBy: { version: "desc" } },
          },
        });
        if (!resume) notFound("Resume");
        return resume;
      }),
    generate: publicProcedure
      .input(careerResumeGenerateSchema)
      .mutation(async ({ ctx, input }) => {
        const [opportunity, profile, experiences, education, projects, outcomes] =
          await Promise.all([
            ctx.db.careerOpportunity.findUnique({
              where: { id: input.opportunityId },
            }),
            ctx.db.careerProfile.findUnique({ where: { id: "career-profile" } }),
            ctx.db.careerExperience.findMany({ orderBy: { position: "asc" } }),
            ctx.db.careerEducation.findMany({ orderBy: { position: "asc" } }),
            ctx.db.careerProject.findMany({ orderBy: { position: "asc" } }),
            ctx.db.performanceOutcome.findMany({
              where: { cycle: { status: "COMPLETED" } },
              select: { id: true, title: true, result: true, impact: true },
            }),
          ]);
        if (!opportunity) notFound("Opportunity");
        if (!profile?.fullName) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Complete your career profile before generating a resume",
          });
        }
        const generated = await generateOpportunityResume({
          opportunity,
          source: {
            profile,
            experiences,
            education,
            projects,
            verifiedOutcomes: outcomes,
          },
        });
        return ctx.db.$transaction(async (database) => {
          const resume = input.resumeId
            ? await database.careerResume.findUnique({
                where: { id: input.resumeId },
              })
            : await database.careerResume.create({
                data: {
                  title:
                    input.title || `${opportunity.role} at ${opportunity.company}`,
                  opportunityId: opportunity.id,
                },
              });
          if (!resume) notFound("Resume");
          const latest = await database.careerResumeVersion.aggregate({
            where: { resumeId: resume.id },
            _max: { version: true },
          });
          const version = await database.careerResumeVersion.create({
            data: {
              resumeId: resume.id,
              version: (latest._max.version ?? 0) + 1,
              content: generated.content,
              sourceMap: generated.sourceMap,
              source: "AI",
              model: OPENAI_MODEL,
              promptVersion: RESUME_PROMPT_VERSION,
            },
          });
          return { resume, version };
        });
      }),
    save: publicProcedure
      .input(careerResumeSaveSchema)
      .mutation(async ({ ctx, input }) => {
        const resume = await ctx.db.careerResume.findUnique({
          where: { id: input.resumeId },
          select: { id: true },
        });
        if (!resume) notFound("Resume");
        const latest = await ctx.db.careerResumeVersion.aggregate({
          where: { resumeId: resume.id },
          _max: { version: true },
        });
        return ctx.db.careerResumeVersion.create({
          data: {
            resumeId: resume.id,
            version: (latest._max.version ?? 0) + 1,
            content: input.content,
            source: "MANUAL",
          },
        });
      }),
    delete: publicProcedure
      .input(careerDeleteSchema)
      .mutation(({ ctx, input }) =>
        ctx.db.careerResume.delete({ where: { id: input.id } }),
      ),
  }),
});
