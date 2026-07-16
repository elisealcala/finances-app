import "server-only";
import { env } from "@/env";

// Telegram echoes the secret we registered via setWebhook on every webhook POST
// as the X-Telegram-Bot-Api-Secret-Token header.
export function isValidWebhookSecret(headerValue: string | null): boolean {
  return (
    Boolean(env.TELEGRAM_WEBHOOK_SECRET) &&
    headerValue === env.TELEGRAM_WEBHOOK_SECRET
  );
}

// The app has no auth system; a single allow-listed chat id is the whole
// authorization model (analogous to the CRON_SECRET check on cron routes).
export function isAllowedChat(chatId: number | string): boolean {
  return (
    Boolean(env.TELEGRAM_ALLOWED_CHAT_ID) &&
    String(chatId) === env.TELEGRAM_ALLOWED_CHAT_ID
  );
}
