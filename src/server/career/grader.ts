import "server-only";
import { z } from "zod";
import { zodTextFormat } from "openai/helpers/zod";
import { getOpenAIClient, OPENAI_MODEL } from "@/server/openai/client";
import { careerRubricCriterionSchema } from "@/server/trpc/schemas/career.schema";

export const CAREER_GRADING_PROMPT_VERSION = "career-output-grader-v1";

const careerEvaluationResultSchema = z.object({
  score: z.number().min(0).max(100),
  grade: z.string().trim().min(1).max(40),
  summary: z.string().trim().min(10).max(3000),
  strengths: z.array(z.string().trim().min(3).max(600)).max(8),
  improvements: z.array(z.string().trim().min(3).max(600)).max(8),
  criterionScores: z.array(
    z.object({
      criterion: z.string().trim().min(1).max(200),
      score: z.number().min(0).max(100),
      rationale: z.string().trim().min(3).max(1000),
    }),
  ),
  citations: z.array(
    z.object({
      label: z.string().trim().min(1).max(200),
      reference: z.string().trim().min(1).max(500),
    }),
  ),
});

const SYSTEM_PROMPT = `You evaluate a career output for a software engineer.

Evaluate only the supplied evidence against the supplied rubric. Do not assume files, tests, business results, or stakeholder approval that are not present. A polished README is not proof that the implementation works. Prefer check results, commit or pull-request evidence, concrete metrics, and specific form responses.

For each rubric criterion, give a 0-100 score and a concise rationale. The overall score must be the rubric-weighted score. Cite exact evidence references such as a commit SHA, pull request URL, workflow run, field name, or submitted URL. If the evidence is too thin, score conservatively and explain what would raise the score.`;

export async function gradeCareerSubmission(input: {
  outputTitle: string;
  outcomeTitle: string;
  outcomeResult: string;
  rubric: unknown;
  submission: {
    kind: string;
    label: string | null;
    url: string | null;
    notes: string | null;
    data: unknown;
  };
  githubEvidence?: unknown;
  instructions?: string;
}) {
  const rubric = careerRubricCriterionSchema.array().parse(input.rubric);
  const client = getOpenAIClient();
  const response = await client.responses.parse({
    model: OPENAI_MODEL,
    reasoning: { effort: "low" },
    max_output_tokens: 3000,
    input: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: JSON.stringify(
          {
            outcome: {
              title: input.outcomeTitle,
              expectedResult: input.outcomeResult,
            },
            output: { title: input.outputTitle, rubric },
            submission: input.submission,
            githubEvidence: input.githubEvidence ?? null,
            extraInstructions: input.instructions ?? null,
          },
          null,
          2,
        ),
      },
    ],
    text: {
      format: zodTextFormat(careerEvaluationResultSchema, "career_evaluation"),
    },
  });

  if (!response.output_parsed) {
    throw new Error("The career evaluator returned no structured evaluation");
  }
  return careerEvaluationResultSchema.parse(response.output_parsed);
}

