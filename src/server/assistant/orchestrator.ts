import "server-only";
import type Anthropic from "@anthropic-ai/sdk";
import { getAnthropicClient, ASSISTANT_MODEL } from "./client";
import { ASSISTANT_TOOLS, dispatchTool } from "./tools";
import { buildSystemPrompt } from "./system-prompt";
import { loadRecentMessages, saveMessage, pruneOldMessages } from "./memory";

const MAX_TOOL_ITERATIONS = 4;
const MAX_TOKENS = 1536;

export async function runAssistantTurn(
  chatId: string,
  userText: string,
): Promise<string> {
  await saveMessage(chatId, "USER", userText);

  const history = await loadRecentMessages(chatId);
  const messages: Anthropic.MessageParam[] = history.map((m) => ({
    role: m.role === "USER" ? "user" : "assistant",
    content: m.content,
  }));
  // The API requires the first message to be from the user.
  while (messages.length && messages[0].role !== "user") messages.shift();

  const client = getAnthropicClient();
  const system = buildSystemPrompt(new Date());

  let finalText = "Sorry, I couldn't come up with an answer.";

  for (let i = 0; i < MAX_TOOL_ITERATIONS; i++) {
    const response = await client.messages.create({
      model: ASSISTANT_MODEL,
      max_tokens: MAX_TOKENS,
      thinking: { type: "disabled" },
      system,
      tools: ASSISTANT_TOOLS,
      messages,
    });

    if (response.stop_reason !== "tool_use") {
      const text = response.content.find(
        (b): b is Anthropic.TextBlock => b.type === "text",
      )?.text;
      if (text) finalText = text;
      break;
    }

    messages.push({ role: "assistant", content: response.content });

    const toolUseBlocks = response.content.filter(
      (b): b is Anthropic.ToolUseBlock => b.type === "tool_use",
    );

    const toolResults: Anthropic.ToolResultBlockParam[] = [];
    for (const block of toolUseBlocks) {
      try {
        const result = await dispatchTool(block.name, block.input);
        toolResults.push({
          type: "tool_result",
          tool_use_id: block.id,
          content: JSON.stringify(result),
        });
      } catch (err) {
        // Feed the error back so the model can recover instead of the whole
        // turn crashing on a single bad tool call.
        toolResults.push({
          type: "tool_result",
          tool_use_id: block.id,
          content: err instanceof Error ? err.message : "Tool failed",
          is_error: true,
        });
      }
    }
    messages.push({ role: "user", content: toolResults });

    if (i === MAX_TOOL_ITERATIONS - 1) {
      finalText =
        "That took more steps than expected — please try asking a more specific question.";
    }
  }

  await saveMessage(chatId, "ASSISTANT", finalText);
  await pruneOldMessages(chatId);
  return finalText;
}
