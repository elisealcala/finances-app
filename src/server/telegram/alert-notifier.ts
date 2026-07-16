import "server-only";
import { db } from "@/server/db";
import { env } from "@/env";
import { generateAlerts } from "@/server/trpc/services/prediction/alerts";
import { sendTelegramMessage } from "./client";
import type { FinancialAlert } from "@/types/prediction";

export type AlertNotifyResult = {
  checked: number;
  sent: number;
  skippedDuplicate: number;
  ranAt: string;
};

// generateAlerts' ids are not time-scoped (e.g. `budget-warning-${categoryId}`
// is the same string every month), so dedup pairs the id with a period key
// whose granularity matches how the alert can recur.
function periodKeyFor(alert: FinancialAlert, referenceDate: Date): string {
  if (alert.id.startsWith("budget-")) {
    const year = referenceDate.getFullYear();
    const month = String(referenceDate.getMonth() + 1).padStart(2, "0");
    return `${year}-${month}`; // resets monthly with the budget
  }
  if (alert.id.startsWith("due-soon-")) {
    return "once"; // id already encodes a specific installment occurrence
  }
  return referenceDate.toISOString().slice(0, 10); // balance/margin: daily
}

const SEVERITY_ICON: Record<FinancialAlert["severity"], string> = {
  critical: "🔴",
  warning: "🟡",
  info: "ℹ️",
};

function formatAlertsMessage(alerts: FinancialAlert[]): string {
  const lines = alerts.map(
    (a) => `${SEVERITY_ICON[a.severity]} ${a.title}\n${a.message}`,
  );
  return `Budget alerts:\n\n${lines.join("\n\n")}`;
}

export async function checkAndSendAlerts(
  referenceDate: Date = new Date(),
): Promise<AlertNotifyResult> {
  const chatId = env.TELEGRAM_ALLOWED_CHAT_ID;
  if (!chatId) {
    throw new Error("TELEGRAM_ALLOWED_CHAT_ID not configured");
  }

  const alerts = await generateAlerts(db, referenceDate);

  const newAlerts: FinancialAlert[] = [];
  const periodKeyByAlertId = new Map<string, string>();

  for (const alert of alerts) {
    const periodKey = periodKeyFor(alert, referenceDate);
    periodKeyByAlertId.set(alert.id, periodKey);
    const existing = await db.assistantAlertLog.findUnique({
      where: { alertKey_periodKey: { alertKey: alert.id, periodKey } },
    });
    if (!existing) newAlerts.push(alert);
  }

  // Batch all new alerts into one push; log only after a successful send so a
  // failed send is retried naturally on the next cron tick.
  if (newAlerts.length > 0) {
    await sendTelegramMessage(chatId, formatAlertsMessage(newAlerts));
    await db.assistantAlertLog.createMany({
      data: newAlerts.map((a) => ({
        alertKey: a.id,
        periodKey: periodKeyByAlertId.get(a.id)!,
        severity: a.severity,
        title: a.title,
        message: a.message,
      })),
    });
  }

  return {
    checked: alerts.length,
    sent: newAlerts.length,
    skippedDuplicate: alerts.length - newAlerts.length,
    ranAt: new Date().toISOString(),
  };
}
