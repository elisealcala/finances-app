import { z } from "zod";
import {
  careerOutputKindSchema,
  performanceCycleStatusSchema,
} from "./performance.schema";

const idSchema = z.string().min(1);
const optionalUrlSchema = z
  .union([z.string().url(), z.literal("")])
  .optional()
  .nullable();

export const careerRubricCriterionSchema = z.object({
  criterion: z.string().trim().min(3).max(200),
  description: z.string().trim().min(5).max(500),
  weight: z.number().positive().max(100),
});

export const careerCycleListSchema = z
  .object({
    status: performanceCycleStatusSchema.optional(),
    includeArchived: z.boolean().default(false),
  })
  .default({ includeArchived: false });

export const careerCycleGetSchema = z.object({ id: idSchema });

export const careerCycleTransitionSchema = z.object({
  id: idSchema,
  status: performanceCycleStatusSchema,
});

export const careerOutputSubmissionSchema = z.object({
  keyResultId: idSchema,
  kind: careerOutputKindSchema,
  label: z.string().trim().max(200).optional().nullable(),
  url: optionalUrlSchema,
  notes: z.string().trim().max(6000).optional().nullable(),
  data: z.record(z.string(), z.unknown()).default({}),
});

export const careerSubmissionGradeSchema = z.object({
  id: idSchema,
  instructions: z.string().trim().max(2000).optional(),
});

export const careerEvaluationAcceptSchema = z.object({
  id: idSchema,
  overrideScore: z.number().min(0).max(100).optional(),
  overrideNote: z.string().trim().min(3).max(2000).optional(),
});

export const careerGithubRepositoryCreateSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1)
    .max(100)
    .regex(/^[A-Za-z0-9._-]+$/, "Use a valid GitHub repository name"),
  description: z.string().trim().max(350).optional(),
  isPrivate: z.boolean().default(true),
});

export const careerProfileSchema = z.object({
  fullName: z.string().trim().max(160),
  headline: z.string().trim().max(240),
  email: z.union([z.string().email(), z.literal("")]),
  phone: z.string().trim().max(80),
  location: z.string().trim().max(160),
  website: optionalUrlSchema,
  githubUrl: optionalUrlSchema,
  linkedInUrl: optionalUrlSchema,
  summary: z.string().trim().max(4000),
  skills: z.array(z.string().trim().min(1).max(80)).max(80),
});

export const careerExperienceCreateSchema = z
  .object({
    company: z.string().trim().min(1).max(160),
    role: z.string().trim().min(1).max(160),
    location: z.string().trim().max(160).optional().nullable(),
    employmentType: z.string().trim().max(80).optional().nullable(),
    startDate: z.date(),
    endDate: z.date().optional().nullable(),
    current: z.boolean().default(false),
    summary: z.string().trim().max(3000).optional().nullable(),
    achievements: z.array(z.string().trim().min(1).max(1200)).max(30),
    skills: z.array(z.string().trim().min(1).max(80)).max(40),
  })
  .refine((value) => !value.endDate || value.endDate >= value.startDate, {
    message: "End date must not be before start date",
    path: ["endDate"],
  });

export const careerExperienceUpdateSchema = careerExperienceCreateSchema.and(
  z.object({ id: idSchema }),
);

export const careerEducationCreateSchema = z.object({
  institution: z.string().trim().min(1).max(200),
  degree: z.string().trim().min(1).max(200),
  field: z.string().trim().max(200).optional().nullable(),
  startDate: z.date().optional().nullable(),
  endDate: z.date().optional().nullable(),
  details: z.string().trim().max(2000).optional().nullable(),
});

export const careerEducationUpdateSchema = careerEducationCreateSchema.extend({
  id: idSchema,
});

export const careerProjectCreateSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().min(10).max(4000),
  url: optionalUrlSchema,
  githubUrl: optionalUrlSchema,
  highlights: z.array(z.string().trim().min(1).max(1200)).max(20),
  skills: z.array(z.string().trim().min(1).max(80)).max(40),
});

export const careerProjectUpdateSchema = careerProjectCreateSchema.extend({
  id: idSchema,
});

export const careerDeleteSchema = z.object({ id: idSchema });

export const careerOpportunityStatusSchema = z.enum([
  "DRAFT",
  "APPLIED",
  "INTERVIEW",
  "OFFER",
  "REJECTED",
  "ARCHIVED",
]);

export const careerOpportunityCreateSchema = z.object({
  company: z.string().trim().min(1).max(160),
  role: z.string().trim().min(1).max(160),
  url: optionalUrlSchema,
  jobDescription: z.string().trim().min(20).max(30_000),
  status: careerOpportunityStatusSchema.default("DRAFT"),
});

export const careerOpportunityUpdateSchema = careerOpportunityCreateSchema.extend({
  id: idSchema,
});

const resumeLinkSchema = z.object({
  label: z.string().trim().min(1).max(80),
  url: z.string().url(),
});

export const resumeContentSchema = z.object({
  personal: z.object({
    fullName: z.string().trim().min(1).max(160),
    headline: z.string().trim().max(240),
    email: z.string().trim().max(160),
    phone: z.string().trim().max(80),
    location: z.string().trim().max(160),
    links: z.array(resumeLinkSchema).max(8),
  }),
  summary: z.string().trim().min(10).max(3000),
  experiences: z
    .array(
      z.object({
        sourceId: z.string().optional().nullable(),
        company: z.string().trim().min(1).max(160),
        role: z.string().trim().min(1).max(160),
        location: z.string().trim().max(160).optional().nullable(),
        startDate: z.string().trim().max(80),
        endDate: z.string().trim().max(80),
        bullets: z.array(z.string().trim().min(1).max(1200)).max(12),
      }),
    )
    .max(20),
  education: z
    .array(
      z.object({
        sourceId: z.string().optional().nullable(),
        institution: z.string().trim().min(1).max(200),
        degree: z.string().trim().min(1).max(240),
        date: z.string().trim().max(80),
        details: z.string().trim().max(1000).optional().nullable(),
      }),
    )
    .max(12),
  skills: z.array(z.string().trim().min(1).max(80)).max(80),
  projects: z
    .array(
      z.object({
        sourceId: z.string().optional().nullable(),
        title: z.string().trim().min(1).max(200),
        description: z.string().trim().min(5).max(2000),
        url: optionalUrlSchema,
        bullets: z.array(z.string().trim().min(1).max(1200)).max(8),
      }),
    )
    .max(12),
});

export const careerResumeGenerateSchema = z.object({
  opportunityId: idSchema,
  resumeId: idSchema.optional(),
  title: z.string().trim().min(2).max(160).optional(),
});

export const careerResumeSaveSchema = z.object({
  resumeId: idSchema,
  content: resumeContentSchema,
});

export const careerResumeGetSchema = z.object({ id: idSchema });
