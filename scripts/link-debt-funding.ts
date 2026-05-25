/**
 * One-off: insert FundingLink rows pairing each personal-loan debt with its
 * lender's bank account, so marking an installment paid auto-creates an
 * expense from that account. Idempotent — re-running is safe.
 *
 * Run with: node --env-file=.env --import=tsx scripts/link-debt-funding.ts
 */
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});
const db = new PrismaClient({ adapter, log: ["error"] });

const LENDER_TO_ACCOUNT_NAME: Record<string, string> = {
  BBVA: "BBVA",
  Interbank: "Interbank",
};

async function main() {
  const debts = await db.debt.findMany({
    where: { type: "PERSONAL_LOAN" },
    select: {
      id: true,
      name: true,
      lender: true,
      status: true,
      fundingLinks: { select: { id: true, sourceAccountId: true } },
    },
    orderBy: { name: "asc" },
  });

  const accounts = await db.account.findMany({
    select: { id: true, name: true },
  });
  const accountByName = new Map(accounts.map((a) => [a.name, a]));

  let inserted = 0;
  let skipped = 0;

  for (const debt of debts) {
    const targetAccountName = debt.lender
      ? LENDER_TO_ACCOUNT_NAME[debt.lender]
      : undefined;
    if (!targetAccountName) {
      console.warn(
        `  • SKIP ${debt.name}: no account mapping for lender "${debt.lender ?? "(none)"}"`,
      );
      skipped++;
      continue;
    }
    const account = accountByName.get(targetAccountName);
    if (!account) {
      console.warn(
        `  • SKIP ${debt.name}: account "${targetAccountName}" not found`,
      );
      skipped++;
      continue;
    }

    if (debt.fundingLinks.length > 0) {
      console.log(
        `  • SKIP ${debt.name}: already has ${debt.fundingLinks.length} funding link(s)`,
      );
      skipped++;
      continue;
    }

    await db.fundingLink.create({
      data: {
        debtId: debt.id,
        sourceAccountId: account.id,
      },
    });
    console.log(
      `  ✓ Linked ${debt.name} (${debt.status}) → ${account.name}`,
    );
    inserted++;
  }

  console.log(`\nDone. Inserted ${inserted}, skipped ${skipped}.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
