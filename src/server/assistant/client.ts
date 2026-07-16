import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { env } from "@/env";

// Swappable via env without a code change; upgrading to Opus later is one var.
const DEFAULT_MODEL = "claude-sonnet-5";
export const ASSISTANT_MODEL = env.ANTHROPIC_MODEL ?? DEFAULT_MODEL;

let client: Anthropic | null = null;

export function getAnthropicClient(): Anthropic {
  if (!env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY not configured");
  }
  if (!client) {
    client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  }
  return client;
}
