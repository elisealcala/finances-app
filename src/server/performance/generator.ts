import "server-only";
import { zodTextFormat } from "openai/helpers/zod";
import { getOpenAIClient, OPENAI_MODEL } from "@/server/openai/client";
import { generatedPerformancePlanSchema } from "@/server/trpc/schemas/performance.schema";

const SYSTEM_PROMPT = `You design focused individual career cycles for a senior full-stack engineer using the exact date range provided by the user.

The plan must measure observable impact, not a generic career path or learning curriculum.

Rules:
- Produce 2 to 4 outcomes and 1 to 4 key results per outcome.
- Phrase outcomes as states that should be true by the end date.
- Prefer results within the individual's influence: shipped improvements, adopted decisions, reliability, delivery, product impact, mentorship, or communication outcomes.
- Prefer NUMBER or PERCENTAGE key results when a credible measure exists.
- Use MILESTONE for ordered deliverables, BOOLEAN for one verifiable artifact, and MANUAL only when no honest objective measure exists.
- For MILESTONE and MANUAL use baseline 0, target 100, and unit "%".
- For BOOLEAN use baseline 0, target 1, and unit null.
- Do not invent past accomplishments, company metrics, or baselines that the user did not provide. Use a baseline of 0 for new deliverables and conservative targets for proposed future outputs.
- Keep every title and result concise, specific, and review-ready.
- Assign meaningful percentage weights to outcomes and outputs based on career impact. Outcome weights must total 100 and outputs within each outcome must total 100.
- Include a concise rationale for every weight.
- Treat each key result as an output. Choose GITHUB_REPOSITORY or GITHUB_PULL_REQUEST when code is the best proof, FORM when a structured reflection or stakeholder review is best, and METRIC, MILESTONE, LINK, FILE, or MANUAL otherwise.
- Give every output a rubric with 2 to 4 observable criteria whose weights total 100. The rubric must be usable by a reviewer or an LLM without guessing hidden context.`;

function normalizeWeights<T extends { weight: number }>(items: T[]): T[] {
  const total = items.reduce((sum, item) => sum + Math.max(0, item.weight), 0);
  if (!total) {
    const equal = 100 / Math.max(1, items.length);
    return items.map((item) => ({ ...item, weight: equal }));
  }
  return items.map((item) => ({
    ...item,
    weight: Math.round((Math.max(0, item.weight) / total) * 10_000) / 100,
  }));
}

export async function generatePerformancePlan(input: {
  context?: string;
  startDate: Date;
  endDate: Date;
}) {
  const client = getOpenAIClient();
  const period = `${input.startDate.toISOString().slice(0, 10)} through ${input.endDate
    .toISOString()
    .slice(0, 10)}`;
  const context = input.context?.trim() || "No additional brief was provided.";

  const response = await client.responses.parse({
    model: OPENAI_MODEL,
    reasoning: { effort: "low" },
    max_output_tokens: 3000,
    input: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: `Create a performance plan for ${period}.\n\nUser brief:\n${context}`,
      },
    ],
    text: {
      format: zodTextFormat(
        generatedPerformancePlanSchema,
        "performance_plan",
      ),
    },
  });

  if (!response.output_parsed) {
    const refusal = response.output
      .flatMap((item) => (item.type === "message" ? item.content : []))
      .find((item) => item.type === "refusal");
    throw new Error(
      refusal?.refusal ??
        "The OpenAI performance plan generator returned no structured plan",
    );
  }

  const plan = generatedPerformancePlanSchema.parse(response.output_parsed);
  return {
    ...plan,
    outcomes: normalizeWeights(plan.outcomes).map((outcome) => ({
      ...outcome,
      keyResults: normalizeWeights(outcome.keyResults),
    })),
  };
}
