import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "@/server/trpc/router";
import type { z } from "zod";
import type { resumeContentSchema } from "@/server/trpc/schemas/career.schema";

type RouterOutputs = inferRouterOutputs<AppRouter>;

export type CareerOverview = RouterOutputs["career"]["overview"];
export type CareerCycle = RouterOutputs["career"]["cycle"]["get"];
export type CareerOutcome = CareerCycle["outcomes"][number];
export type CareerOutput = CareerOutcome["keyResults"][number];
export type CareerOutputSubmission = CareerOutput["submissions"][number];
export type CareerEvaluation = CareerOutputSubmission["evaluations"][number];
export type CareerProfile = RouterOutputs["career"]["profile"]["get"];
export type CareerExperience = RouterOutputs["career"]["experience"]["list"][number];
export type CareerEducation = RouterOutputs["career"]["education"]["list"][number];
export type CareerProject = RouterOutputs["career"]["project"]["list"][number];
export type CareerOpportunity = RouterOutputs["career"]["opportunity"]["list"][number];
export type CareerResume = RouterOutputs["career"]["resume"]["get"];
export type ResumeContent = z.infer<typeof resumeContentSchema>;

