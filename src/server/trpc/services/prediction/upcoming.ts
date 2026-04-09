import type { PrismaClient } from "@/generated/prisma/client";
import type { Obligation } from "@/types/prediction";

/**
 * Get the next occurrence date for a recurring transaction relative to a reference date.
 */
function getNextOccurrence(
  frequency: string,
  dayOfMonth: number | null,
  startDate: Date,
  referenceDate: Date,
): Date {
  const day = dayOfMonth ?? startDate.getDate();

  if (frequency === "MONTHLY") {
    const candidate = new Date(
      referenceDate.getFullYear(),
      referenceDate.getMonth(),
      Math.min(day, daysInMonth(referenceDate.getFullYear(), referenceDate.getMonth())),
    );
    if (candidate >= referenceDate) return candidate;
    const next = new Date(referenceDate.getFullYear(), referenceDate.getMonth() + 1, 1);
    return new Date(
      next.getFullYear(),
      next.getMonth(),
      Math.min(day, daysInMonth(next.getFullYear(), next.getMonth())),
    );
  }

  if (frequency === "BIWEEKLY") {
    const start = new Date(startDate);
    let current = new Date(start);
    while (current < referenceDate) {
      current = new Date(current.getTime() + 14 * 24 * 60 * 60 * 1000);
    }
    return current;
  }

  if (frequency === "WEEKLY") {
    const start = new Date(startDate);
    let current = new Date(start);
    while (current < referenceDate) {
      current = new Date(current.getTime() + 7 * 24 * 60 * 60 * 1000);
    }
    return current;
  }

  if (frequency === "QUARTERLY") {
    const quarterMonths = [0, 3, 6, 9];
    for (const qm of quarterMonths) {
      const candidate = new Date(referenceDate.getFullYear(), qm, Math.min(day, daysInMonth(referenceDate.getFullYear(), qm)));
      if (candidate >= referenceDate) return candidate;
    }
    return new Date(referenceDate.getFullYear() + 1, 0, Math.min(day, 31));
  }

  if (frequency === "YEARLY") {
    const candidate = new Date(
      referenceDate.getFullYear(),
      startDate.getMonth(),
      Math.min(day, daysInMonth(referenceDate.getFullYear(), startDate.getMonth())),
    );
    if (candidate >= referenceDate) return candidate;
    return new Date(
      referenceDate.getFullYear() + 1,
      startDate.getMonth(),
      Math.min(day, daysInMonth(referenceDate.getFullYear() + 1, startDate.getMonth())),
    );
  }

  return referenceDate;
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

/**
 * Get all occurrences of a recurring transaction within a date range.
 */
export function getOccurrencesInRange(
  frequency: string,
  dayOfMonth: number | null,
  startDate: Date,
  endDate: Date | null,
  rangeStart: Date,
  rangeEnd: Date,
): Date[] {
  const occurrences: Date[] = [];
  const effectiveStart = startDate > rangeStart ? startDate : rangeStart;
  const effectiveEnd = endDate && endDate < rangeEnd ? endDate : rangeEnd;

  let current = getNextOccurrence(frequency, dayOfMonth, startDate, effectiveStart);
  while (current <= effectiveEnd) {
    occurrences.push(new Date(current));

    if (frequency === "MONTHLY") {
      const day = dayOfMonth ?? startDate.getDate();
      const next = new Date(current.getFullYear(), current.getMonth() + 1, 1);
      current = new Date(
        next.getFullYear(),
        next.getMonth(),
        Math.min(day, daysInMonth(next.getFullYear(), next.getMonth())),
      );
    } else if (frequency === "BIWEEKLY") {
      current = new Date(current.getTime() + 14 * 24 * 60 * 60 * 1000);
    } else if (frequency === "WEEKLY") {
      current = new Date(current.getTime() + 7 * 24 * 60 * 60 * 1000);
    } else if (frequency === "QUARTERLY") {
      const day = dayOfMonth ?? startDate.getDate();
      const next = new Date(current.getFullYear(), current.getMonth() + 3, 1);
      current = new Date(
        next.getFullYear(),
        next.getMonth(),
        Math.min(day, daysInMonth(next.getFullYear(), next.getMonth())),
      );
    } else if (frequency === "YEARLY") {
      const day = dayOfMonth ?? startDate.getDate();
      current = new Date(
        current.getFullYear() + 1,
        startDate.getMonth(),
        Math.min(day, daysInMonth(current.getFullYear() + 1, startDate.getMonth())),
      );
    } else {
      break;
    }
  }

  return occurrences;
}

/**
 * Get upcoming obligations (recurring expenses + debt installments) within N days.
 */
export async function getUpcomingObligations(
  db: PrismaClient,
  daysAhead: number,
  referenceDate: Date = new Date(),
): Promise<Obligation[]> {
  const rangeEnd = new Date(referenceDate);
  rangeEnd.setDate(rangeEnd.getDate() + daysAhead);

  const [recurringTransactions, pendingInstallments] = await Promise.all([
    db.recurringTransaction.findMany({
      where: {
        isActive: true,
        type: "EXPENSE",
        startDate: { lte: rangeEnd },
        OR: [{ endDate: null }, { endDate: { gte: referenceDate } }],
      },
    }),
    db.debtInstallment.findMany({
      where: {
        status: "PENDING",
        dueDate: { gte: referenceDate, lte: rangeEnd },
      },
      include: { debt: { select: { name: true } } },
    }),
  ]);

  const obligations: Obligation[] = [];

  // Recurring expense obligations
  for (const rt of recurringTransactions) {
    const occurrences = getOccurrencesInRange(
      rt.frequency,
      rt.dayOfMonth,
      rt.startDate,
      rt.endDate,
      referenceDate,
      rangeEnd,
    );
    for (const date of occurrences) {
      obligations.push({
        id: `recurring-${rt.id}-${date.toISOString()}`,
        name: rt.name,
        amount: Number(rt.amount),
        dueDate: date,
        accountId: rt.accountId,
        source: "recurring",
        debtId: rt.debtId,
        isPaid: false,
      });
    }
  }

  // Debt installment obligations
  for (const inst of pendingInstallments) {
    obligations.push({
      id: `installment-${inst.id}`,
      name: `${inst.debt.name} #${inst.installmentNumber}`,
      amount: Number(inst.totalAmount),
      dueDate: inst.dueDate,
      accountId: "", // Will be filled from funding links
      source: "debt_installment",
      debtId: inst.debtId,
      isPaid: false,
    });
  }

  // Resolve accountId for debt installments using funding links
  const debtIds = [
    ...new Set(
      obligations
        .filter((o) => o.source === "debt_installment" && o.debtId)
        .map((o) => o.debtId!),
    ),
  ];

  if (debtIds.length > 0) {
    const fundingLinks = await db.fundingLink.findMany({
      where: { debtId: { in: debtIds } },
    });
    const debtToAccount = new Map(
      fundingLinks.map((fl) => [fl.debtId, fl.sourceAccountId]),
    );
    for (const o of obligations) {
      if (o.source === "debt_installment" && o.debtId && debtToAccount.has(o.debtId)) {
        o.accountId = debtToAccount.get(o.debtId)!;
      }
    }
  }

  // Sort by date
  obligations.sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());

  return obligations;
}
