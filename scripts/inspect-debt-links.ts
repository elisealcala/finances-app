/**
 * Diagnostic — list every Debt and every Account, highlight which Debts are
 * NOT linked to an Account (i.e., no Account has account.debtId === debt.id).
 * Read-only. Run with: npx tsx scripts/inspect-debt-links.ts
 */
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});
const db = new PrismaClient({ adapter, log: ["error"] });

async function main() {
  const [debts, accounts] = await Promise.all([
    db.debt.findMany({
      select: {
        id: true,
        name: true,
        lender: true,
        type: true,
        balance: true,
        status: true,
      },
      orderBy: { name: "asc" },
    }),
    db.account.findMany({
      select: {
        id: true,
        name: true,
        type: true,
        currency: true,
        debtId: true,
        isArchived: true,
      },
      orderBy: { name: "asc" },
    }),
  ]);

  const accountByDebt = new Map<string, (typeof accounts)[number]>();
  for (const a of accounts) {
    if (a.debtId) accountByDebt.set(a.debtId, a);
  }

  const linkedDebts: typeof debts = [];
  const unlinkedDebts: typeof debts = [];
  for (const d of debts) {
    if (accountByDebt.has(d.id)) linkedDebts.push(d);
    else unlinkedDebts.push(d);
  }

  const unlinkedAccounts = accounts.filter((a) => a.debtId == null);

  console.log(
    `\n=== Linked debts (${linkedDebts.length}) — already have Account.debtId set ===`,
  );
  for (const d of linkedDebts) {
    const acc = accountByDebt.get(d.id)!;
    console.log(
      `  • ${d.name}${d.lender ? ` (${d.lender})` : ""}  →  Account: ${acc.name} [${acc.type}, ${acc.currency}]`,
    );
  }

  console.log(
    `\n=== Unlinked debts (${unlinkedDebts.length}) — no Account points to them ===`,
  );
  for (const d of unlinkedDebts) {
    console.log(
      `  [${d.id}] ${d.name}${d.lender ? ` (${d.lender})` : ""}  | type=${d.type} status=${d.status} balance=${Number(d.balance).toFixed(2)}`,
    );
  }

  console.log(
    `\n=== Accounts with no debtId (${unlinkedAccounts.length}) — potential pairing candidates ===`,
  );
  for (const a of unlinkedAccounts) {
    console.log(
      `  [${a.id}] ${a.name} | type=${a.type} currency=${a.currency} archived=${a.isArchived}`,
    );
  }

  console.log("");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
