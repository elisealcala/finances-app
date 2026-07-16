import "server-only";
import { env } from "@/env";

const TELEGRAM_MAX_LEN = 4096;

async function callTelegram(
  method: string,
  body: Record<string, unknown>,
): Promise<void> {
  if (!env.TELEGRAM_BOT_TOKEN) {
    throw new Error("TELEGRAM_BOT_TOKEN not configured");
  }
  const res = await fetch(
    `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/${method}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    },
  );
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Telegram ${method} failed: ${res.status} ${detail}`);
  }
}

// Split on newline boundaries where possible so long replies stay readable
// across Telegram's per-message character limit.
function chunkText(text: string, max: number): string[] {
  if (text.length <= max) return [text];
  const chunks: string[] = [];
  let remaining = text;
  while (remaining.length > max) {
    let cut = remaining.lastIndexOf("\n", max);
    if (cut <= 0) cut = max;
    chunks.push(remaining.slice(0, cut));
    remaining = remaining.slice(cut).replace(/^\n/, "");
  }
  if (remaining.length) chunks.push(remaining);
  return chunks;
}

// Plain text only — no parse_mode. Telegram's Markdown modes reject the whole
// message on a single unescaped special character, which is a worse failure
// mode than plainer formatting for LLM-generated text.
export async function sendTelegramMessage(
  chatId: string,
  text: string,
): Promise<void> {
  for (const chunk of chunkText(text, TELEGRAM_MAX_LEN)) {
    await callTelegram("sendMessage", { chat_id: chatId, text: chunk });
  }
}

export async function sendChatAction(
  chatId: string,
  action: "typing",
): Promise<void> {
  await callTelegram("sendChatAction", { chat_id: chatId, action });
}
