import type { PrismaClient } from "@/generated/prisma/client";
import { computeAllAvailableBalances } from "./available-balance";
import { getUpcomingObligations } from "./upcoming";
import type { FinancialAlert } from "@/types/prediction";

/**
 * Generate financial alerts based on current state.
 */
export async function generateAlerts(
  db: PrismaClient,
  referenceDate: Date = new Date(),
): Promise<FinancialAlert[]> {
  const alerts: FinancialAlert[] = [];

  const [availableBalances, obligations] = await Promise.all([
    computeAllAvailableBalances(db, referenceDate),
    getUpcomingObligations(db, 30, referenceDate),
  ]);

  // CRITICAL: Account will go negative before debt payment
  for (const ab of availableBalances) {
    if (ab.available < 0) {
      alerts.push({
        id: `negative-${ab.accountId}`,
        severity: "critical",
        title: "Insufficient funds",
        message: `${ab.accountName} will be short by ${Math.abs(ab.available).toFixed(2)} to cover this month's obligations.`,
        accountId: ab.accountId,
      });
    } else if (ab.available < ab.committed * 0.2 && ab.committed > 0) {
      // CRITICAL: Very tight margin
      alerts.push({
        id: `tight-${ab.accountId}`,
        severity: "critical",
        title: "Very tight margin",
        message: `${ab.accountName} has only ${ab.available.toFixed(2)} available after obligations. Any extra spending may cause problems.`,
        accountId: ab.accountId,
      });
    }
  }

  // WARNING: Budget at 85%+
  const now = referenceDate;
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  const categories = await db.category.findMany({
    where: { monthlyBudget: { not: null }, isArchived: false },
  });

  for (const cat of categories) {
    if (!cat.monthlyBudget) continue;
    const budget = Number(cat.monthlyBudget);

    const spent = await db.expense.aggregate({
      where: {
        categoryId: cat.id,
        date: { gte: monthStart, lte: monthEnd },
      },
      _sum: { amount: true },
    });

    const totalSpent = Number(spent._sum.amount ?? 0);
    const percentUsed = budget > 0 ? (totalSpent / budget) * 100 : 0;

    if (percentUsed >= 100) {
      alerts.push({
        id: `budget-exceeded-${cat.id}`,
        severity: "warning",
        title: "Budget exceeded",
        message: `Category "${cat.name}" is at ${percentUsed.toFixed(0)}% of budget (${totalSpent.toFixed(2)} / ${budget.toFixed(2)}).`,
      });
    } else if (percentUsed >= 85) {
      alerts.push({
        id: `budget-warning-${cat.id}`,
        severity: "warning",
        title: "Budget almost reached",
        message: `Category "${cat.name}" is at ${percentUsed.toFixed(0)}% of budget (${totalSpent.toFixed(2)} / ${budget.toFixed(2)}).`,
      });
    }
  }

  // INFO: Upcoming debt payments in 3 days
  const threeDaysFromNow = new Date(referenceDate);
  threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

  for (const ob of obligations) {
    if (
      ob.source === "debt_installment" &&
      ob.dueDate <= threeDaysFromNow &&
      !ob.isPaid
    ) {
      const daysUntil = Math.ceil(
        (ob.dueDate.getTime() - referenceDate.getTime()) / (1000 * 60 * 60 * 24),
      );
      alerts.push({
        id: `due-soon-${ob.id}`,
        severity: "info",
        title: "Payment due soon",
        message: `${ob.name} (${ob.amount.toFixed(2)}) is due in ${daysUntil} day${daysUntil !== 1 ? "s" : ""}.`,
        debtId: ob.debtId ?? undefined,
        accountId: ob.accountId || undefined,
      });
    }
  }

  // Sort: critical first, then warning, then info
  const severityOrder = { critical: 0, warning: 1, info: 2 };
  alerts.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  return alerts;
}
