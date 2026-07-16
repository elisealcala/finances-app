import "server-only";
import { db } from "@/server/db";

const HISTORY_LIMIT = 20; // messages loaded into context per turn
const HISTORY_WINDOW_MS = 24 * 60 * 60 * 1000; // only recent context counts
const RETENTION_LIMIT = 40; // rows kept per chat before pruning

export async function loadRecentMessages(chatId: string) {
  const since = new Date(Date.now() - HISTORY_WINDOW_MS);
  const rows = await db.assistantMessage.findMany({
    where: { chatId, createdAt: { gte: since } },
    orderBy: { createdAt: "desc" },
    take: HISTORY_LIMIT,
  });
  return rows.reverse(); // chronological order for the Anthropic messages array
}

export async function saveMessage(
  chatId: string,
  role: "USER" | "ASSISTANT",
  content: string,
) {
  await db.assistantMessage.create({ data: { chatId, role, content } });
}

export async function pruneOldMessages(chatId: string) {
  const keep = await db.assistantMessage.findMany({
    where: { chatId },
    orderBy: { createdAt: "desc" },
    take: RETENTION_LIMIT,
    select: { id: true },
  });
  if (keep.length < RETENTION_LIMIT) return;
  await db.assistantMessage.deleteMany({
    where: { chatId, id: { notIn: keep.map((r) => r.id) } },
  });
}
