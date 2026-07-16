import { NextResponse, after } from "next/server";
import { isValidWebhookSecret, isAllowedChat } from "@/server/telegram/auth";
import { sendTelegramMessage, sendChatAction } from "@/server/telegram/client";
import { runAssistantTurn } from "@/server/assistant/orchestrator";
import type { TelegramUpdate } from "@/server/telegram/types";

export const runtime = "nodejs";
export const maxDuration = 60;

const WELCOME = [
  "Hi! I'm your finances assistant. Ask me about your money — read-only, so I can't change anything.",
  "",
  "Try:",
  "• How much did I spend on groceries this month?",
  "• What's my budget looking like?",
  "• What are my account balances?",
  "• How much do I owe on my credit cards?",
].join("\n");

export async function POST(request: Request) {
  if (
    !isValidWebhookSecret(
      request.headers.get("x-telegram-bot-api-secret-token"),
    )
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const update = (await request.json()) as TelegramUpdate;
  const message = update.message;
  if (!message?.text) {
    return NextResponse.json({ ok: true }); // ignore non-text updates
  }

  if (!isAllowedChat(message.chat.id)) {
    // Silently drop — don't confirm the bot exists to strangers.
    return NextResponse.json({ ok: true });
  }

  const chatId = String(message.chat.id);
  const text = message.text.trim();

  // Ack Telegram immediately, then do the slow work in the background. Telegram
  // retries deliveries that don't get a timely 2xx, so ack-first avoids
  // duplicate processing when an LLM turn runs long.
  if (text.startsWith("/")) {
    after(async () => {
      try {
        await sendTelegramMessage(chatId, WELCOME);
      } catch (error) {
        console.error("telegram command reply failed", error);
      }
    });
    return NextResponse.json({ ok: true });
  }

  after(async () => {
    try {
      await sendChatAction(chatId, "typing");
      const reply = await runAssistantTurn(chatId, text);
      await sendTelegramMessage(chatId, reply);
    } catch (error) {
      console.error("telegram webhook error", error);
      await sendTelegramMessage(
        chatId,
        "Something went wrong answering that — please try again.",
      ).catch(() => {});
    }
  });

  return NextResponse.json({ ok: true });
}
