import "server-only";
import { format } from "date-fns";
import { z } from "zod";
import { zodTextFormat } from "openai/helpers/zod";
import { getOpenAIClient, OPENAI_MODEL } from "@/server/openai/client";
import { resumeContentSchema } from "@/server/trpc/schemas/career.schema";

export const RESUME_PROMPT_VERSION = "opportunity-resume-v1";

const generatedResumeSchema = z.object({
  content: resumeContentSchema,
  sourceMap: z.array(
    z.object({
      section: z.string(),
      generatedText: z.string(),
      sourceIds: z.array(z.string()),
    }),
  ),
});

const SYSTEM_PROMPT = `You create a concise, ATS-friendly resume for one opportunity.

Use only facts in the supplied career profile. You may shorten, reorder, and rewrite source achievements for clarity and relevance, but never invent employers, roles, dates, technologies, projects, metrics, impact, certifications, or education. Preserve the sourceId on every included experience, education item, and project. Omit irrelevant material instead of fabricating relevance.

The professional summary should be specific to the opportunity while staying grounded. Use strong, plain language. Prefer 3-5 bullets per recent relevant role and fewer for older roles. Return a source map for generated claims so the user can audit the draft.`;

type ResumeSource = {
  profile: {
    fullName: string;
    headline: string;
    email: string;
    phone: string;
    location: string;
    website: string | null;
    githubUrl: string | null;
    linkedInUrl: string | null;
    summary: string;
    skills: string[];
  };
  experiences: Array<{
    id: string;
    company: string;
    role: string;
    location: string | null;
    startDate: Date;
    endDate: Date | null;
    current: boolean;
    summary: string | null;
    achievements: string[];
    skills: string[];
  }>;
  education: Array<{
    id: string;
    institution: string;
    degree: string;
    field: string | null;
    startDate: Date | null;
    endDate: Date | null;
    details: string | null;
  }>;
  projects: Array<{
    id: string;
    title: string;
    description: string;
    url: string | null;
    githubUrl: string | null;
    highlights: string[];
    skills: string[];
  }>;
  verifiedOutcomes: Array<{
    id: string;
    title: string;
    result: string;
    impact: string | null;
  }>;
};

export async function generateOpportunityResume(input: {
  opportunity: {
    company: string;
    role: string;
    url: string | null;
    jobDescription: string;
  };
  source: ResumeSource;
}) {
  const client = getOpenAIClient();
  const source = {
    ...input.source,
    experiences: input.source.experiences.map((experience) => ({
      ...experience,
      startDate: format(experience.startDate, "MMM yyyy"),
      endDate: experience.current
        ? "Present"
        : experience.endDate
          ? format(experience.endDate, "MMM yyyy")
          : "",
    })),
    education: input.source.education.map((education) => ({
      ...education,
      startDate: education.startDate
        ? format(education.startDate, "yyyy")
        : "",
      endDate: education.endDate ? format(education.endDate, "yyyy") : "",
    })),
  };

  const response = await client.responses.parse({
    model: OPENAI_MODEL,
    reasoning: { effort: "low" },
    max_output_tokens: 5000,
    input: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: JSON.stringify(
          { opportunity: input.opportunity, careerSource: source },
          null,
          2,
        ),
      },
    ],
    text: {
      format: zodTextFormat(generatedResumeSchema, "opportunity_resume"),
    },
  });
  if (!response.output_parsed) {
    throw new Error("The resume generator returned no structured resume");
  }
  return generatedResumeSchema.parse(response.output_parsed);
}

