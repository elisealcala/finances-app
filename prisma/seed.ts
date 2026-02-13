import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({ adapter });

/**
 * Calculate remaining balance using Present Value of Annuity formula:
 * PV = PMT × [(1 - (1 + r)^(-n)) / r]
 *
 * Where:
 *   PMT = monthly payment
 *   r   = monthly interest rate (derived from TEA)
 *   n   = remaining installments
 */
function calculateRemainingBalance(
  monthlyPayment: number,
  teaPercent: number,
  remainingInstallments: number,
): number {
  const monthlyRate = Math.pow(1 + teaPercent / 100, 1 / 12) - 1;
  const pvFactor =
    (1 - Math.pow(1 + monthlyRate, -remainingInstallments)) / monthlyRate;
  return Math.round(monthlyPayment * pvFactor * 100) / 100;
}

async function main() {
  console.log("Calculating remaining balances...\n");

  const debts = [
    {
      name: "TRASLADO DE DEUDA - 40K",
      type: "CREDIT_CARD" as const,
      tea: 16.19,
      monthlyPayment: 1965.89,
      totalInstallments: 24,
      currentInstallment: 10,
      originalAmount: 40003.0,
      dueDate: 12,
      startDate: "2025-03-12",
      color: "#4f46e5",
    },
    {
      name: "TRASLADO DE D054-026",
      type: "CREDIT_CARD" as const,
      tea: 16.19,
      monthlyPayment: 1215.93,
      totalInstallments: 18,
      currentInstallment: 10,
      originalAmount: 19462.34,
      dueDate: 8,
      startDate: "2025-04-08",
      color: "#0891b2",
    },
    {
      name: "TRASLADO DE DEUDA - 10K",
      type: "CREDIT_CARD" as const,
      tea: 33.89,
      monthlyPayment: 993.97,
      totalInstallments: 12,
      currentInstallment: 1,
      originalAmount: 10004.0,
      dueDate: 12,
      startDate: "2025-12-12",
      color: "#d97706",
    },
  ];

  let totalBalance = 0;
  let totalMonthly = 0;

  for (const debt of debts) {
    const remaining = debt.totalInstallments - debt.currentInstallment;
    const balance = calculateRemainingBalance(
      debt.monthlyPayment,
      debt.tea,
      remaining,
    );
    totalBalance += balance;
    totalMonthly += debt.monthlyPayment;

    console.log(`  ${debt.name}`);
    console.log(`    Original: S/. ${debt.originalAmount.toLocaleString()}`);
    console.log(`    Installment: ${debt.currentInstallment}/${debt.totalInstallments} (${remaining} remaining)`);
    console.log(`    TEA: ${debt.tea}% → Monthly rate: ${((Math.pow(1 + debt.tea / 100, 1 / 12) - 1) * 100).toFixed(3)}%`);
    console.log(`    Monthly payment: S/. ${debt.monthlyPayment.toLocaleString()}`);
    console.log(`    Remaining balance: S/. ${balance.toLocaleString()}\n`);

    await prisma.debt.create({
      data: {
        name: debt.name,
        type: debt.type,
        originalBalance: debt.originalAmount,
        balance: balance,
        interestRate: debt.tea,
        monthlyCapital: debt.monthlyPayment,
        monthlyInterest: 0,
        originalMonthlyCapital: debt.monthlyPayment,
        originalMonthlyInterest: 0,
        minimumPayment: debt.monthlyPayment,
        originalMinimumPayment: debt.monthlyPayment,
        dueDate: debt.dueDate,
        color: debt.color,
        startedAt: new Date(debt.startDate),
        status: "ACTIVE",
        notes: [
          `Original: S/. ${debt.originalAmount.toLocaleString()}`,
          `Cuota ${debt.currentInstallment}/${debt.totalInstallments}`,
          `Currency: PEN (Soles)`,
        ].join(" | "),
      },
    });

    console.log(`    ✓ Written to database\n`);
  }

  console.log("─".repeat(50));
  console.log(`  TOTAL remaining debt: S/. ${totalBalance.toLocaleString()}`);
  console.log(`  TOTAL monthly payment: S/. ${totalMonthly.toLocaleString()}`);
  console.log("─".repeat(50));
  console.log("\nDone! All debts seeded to database.");
}

main()
  .catch((e) => {
    console.error("Error seeding database:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
