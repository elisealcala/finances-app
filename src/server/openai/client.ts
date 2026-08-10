import "server-only";
import OpenAI from "openai";
import { env } from "@/env";

const DEFAULT_MODEL = "gpt-5.6-sol";
export const OPENAI_MODEL = env.OPENAI_MODEL ?? DEFAULT_MODEL;

let client: OpenAI | null = null;

export function getOpenAIClient(): OpenAI {
  if (!env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY not configured");
  }

  if (!client) {
    client = new OpenAI({ apiKey: env.OPENAI_API_KEY });
  }

  return client;
}
