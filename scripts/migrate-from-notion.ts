/**
 * Progressive migration script: Import financial data from Notion databases.
 *
 * Usage:
 *   # Step 1: Create accounts and categories (run once)
 *   npx tsx scripts/migrate-from-notion.ts setup
 *
 *   # Step 2: Migrate transactions by month
 *   npx tsx scripts/migrate-from-notion.ts data --year 2024 --month 9
 *   npx tsx scripts/migrate-from-notion.ts data --year 2025 --month 1
 *
 *   # Or migrate a full year at once
 *   npx tsx scripts/migrate-from-notion.ts data --year 2025
 *
 *   # Delete all migrated transactions (keeps accounts & categories)
 *   npx tsx scripts/migrate-from-notion.ts clean
 *
 * Required environment variables (set in .env):
 *   NOTION_TOKEN  - Notion integration API token
 *   DATABASE_URL  - PostgreSQL connection string
 */

import { Client } from "@notionhq/client";
import { PrismaClient, Prisma } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";

// ============================================
// Notion Data Source IDs (from "Finances" page)
// ============================================

const NOTION_DBS = {
  categories: "82113552-f4b1-4ad1-9174-f3eeb7d50dca",
  accounts: "f551b544-8a00-4c87-b251-1b168d4bf410",
  expenses: "54c2e487-02cc-4b7b-8e7f-fe46df785353",
  incomes: "4a50a081-f40b-4e58-9d3a-bb7a77702770",
  transfers: "43e06dab-1866-4eff-965f-d9702a303e3e",
};

// ============================================
// Clients
// ============================================

const notion = new Client({ auth: process.env.NOTION_TOKEN });

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});
const prisma = new PrismaClient({ adapter });

// ============================================
// Helpers
// ============================================

type NotionPage = {
  id: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  properties: Record<string, any>;
};

async function fetchAllPages(databaseId: string): Promise<NotionPage[]> {
  const pages: NotionPage[] = [];
  let cursor: string | undefined;

  do {
    const response = await notion.dataSources.query({
      data_source_id: databaseId,
      start_cursor: cursor,
      page_size: 100,
    });
    pages.push(...(response.results as NotionPage[]));
    cursor = response.has_more ? (response.next_cursor ?? undefined) : undefined;
  } while (cursor);

  return pages;
}

async function fetchPagesByDateRange(
  databaseId: string,
  from: string,
  to: string,
  dateProp: string,
): Promise<NotionPage[]> {
  const pages: NotionPage[] = [];
  let cursor: string | undefined;

  do {
    const response = await notion.dataSources.query({
      data_source_id: databaseId,
      start_cursor: cursor,
      page_size: 100,
      filter: {
        and: [
          {
            property: dateProp,
            date: { on_or_after: from },
          },
          {
            property: dateProp,
            date: { before: to },
          },
        ],
      },
    });
    pages.push(...(response.results as NotionPage[]));
    cursor = response.has_more ? (response.next_cursor ?? undefined) : undefined;
  } while (cursor);

  return pages;
}

function getTitle(page: NotionPage, prop: string): string {
  const p = page.properties[prop];
  if (p?.type === "title") return p.title?.[0]?.plain_text ?? "";
  return "";
}

function getNumber(page: NotionPage, prop: string): number {
  const p = page.properties[prop];
  if (p?.type === "number") return p.number ?? 0;
  return 0;
}

function getDate(page: NotionPage, prop: string): Date | null {
  const p = page.properties[prop];
  if (p?.type === "date" && p.date?.start) {
    // Append T12:00:00 to avoid timezone shifting the date back a day
    const raw = p.date.start;
    return new Date(raw.includes("T") ? raw : `${raw}T12:00:00`);
  }
  return null;
}

function getRelationIds(page: NotionPage, prop: string): string[] {
  const p = page.properties[prop];
  if (p?.type === "relation")
    return p.relation?.map((r: { id: string }) => r.id) ?? [];
  return [];
}

function dateRangeForArgs(year: number, month?: number): { from: string; to: string; label: string } {
  if (month) {
    const from = `${year}-${String(month).padStart(2, "0")}-01`;
    const nextMonth = month === 12 ? 1 : month + 1;
    const nextYear = month === 12 ? year + 1 : year;
    const to = `${nextYear}-${String(nextMonth).padStart(2, "0")}-01`;
    const label = `${year}-${String(month).padStart(2, "0")}`;
    return { from, to, label };
  }
  return { from: `${year}-01-01`, to: `${year + 1}-01-01`, label: `${year}` };
}

// ============================================
// Setup: Categories + Accounts
// ============================================

async function migrateCategories() {
  console.log("\n--- Migrating Categories ---");
  const pages = await fetchAllPages(NOTION_DBS.categories);
  const map = new Map<string, string>(); // notionId -> localId
  let created = 0;
  let skipped = 0;

  for (const page of pages) {
    const name = getTitle(page, "Name");
    if (!name) {
      console.warn(`  Skipping category page ${page.id}: no name`);
      skipped++;
      continue;
    }

    // Notion has a typo: "Montly Budget"
    const monthlyBudget = getNumber(page, "Montly Budget");

    const existing = await prisma.category.findUnique({ where: { name } });
    if (existing) {
      map.set(page.id, existing.id);
      skipped++;
      continue;
    }

    const category = await prisma.category.create({
      data: {
        name,
        monthlyBudget:
          monthlyBudget > 0 ? new Prisma.Decimal(monthlyBudget) : null,
      },
    });
    map.set(page.id, category.id);
    created++;
    console.log(`  + ${name}${monthlyBudget > 0 ? ` (budget: S/. ${monthlyBudget})` : ""}`);
  }

  console.log(`  Categories: ${created} created, ${skipped} skipped`);
  return map;
}

async function migrateAccounts() {
  console.log("\n--- Migrating Accounts ---");
  const pages = await fetchAllPages(NOTION_DBS.accounts);
  const map = new Map<string, string>(); // notionId -> localId
  let created = 0;
  let skipped = 0;

  for (const page of pages) {
    const name = getTitle(page, "Name");
    if (!name) {
      console.warn(`  Skipping account page ${page.id}: no name`);
      skipped++;
      continue;
    }

    const opening = getNumber(page, "Opening");

    const existing = await prisma.account.findFirst({ where: { name } });
    if (existing) {
      map.set(page.id, existing.id);
      skipped++;
      continue;
    }

    const account = await prisma.account.create({
      data: {
        name,
        type: "BANK",
        opening: new Prisma.Decimal(opening),
        currency: "PEN",
      },
    });
    map.set(page.id, account.id);
    created++;
    console.log(`  + ${name} (opening: S/. ${opening})`);
  }

  console.log(`  Accounts: ${created} created, ${skipped} skipped`);
  return map;
}

// ============================================
// Clean: Delete all transactions
// ============================================

async function cleanTransactions() {
  console.log("\n=== Cleaning Transactions ===");

  const expenseCount = await prisma.expense.count();
  const incomeCount = await prisma.income.count();
  const transferCount = await prisma.transfer.count();

  console.log(`  Found: ${expenseCount} expenses, ${incomeCount} incomes, ${transferCount} transfers`);

  if (expenseCount + incomeCount + transferCount === 0) {
    console.log("  Nothing to delete.");
    return;
  }

  await prisma.expense.deleteMany({});
  console.log(`  Deleted ${expenseCount} expenses`);

  await prisma.income.deleteMany({});
  console.log(`  Deleted ${incomeCount} incomes`);

  await prisma.transfer.deleteMany({});
  console.log(`  Deleted ${transferCount} transfers`);

  console.log("\n=== Clean Complete ===");
}

// ============================================
// Data: Incomes, Expenses, Transfers (by date range)
// ============================================

async function buildLookupMaps() {
  console.log("  Building lookup maps...");

  const categoryMap = new Map<string, string>();
  const accountMap = new Map<string, string>();

  const localCategories = await prisma.category.findMany();
  const localAccounts = await prisma.account.findMany();

  const notionCategories = await fetchAllPages(NOTION_DBS.categories);
  const notionAccounts = await fetchAllPages(NOTION_DBS.accounts);

  for (const page of notionCategories) {
    const name = getTitle(page, "Name");
    const local = localCategories.find((c) => c.name === name);
    if (local) categoryMap.set(page.id, local.id);
  }

  for (const page of notionAccounts) {
    const name = getTitle(page, "Name");
    const local = localAccounts.find((a) => a.name === name);
    if (local) accountMap.set(page.id, local.id);
  }

  console.log(
    `  Maps: ${categoryMap.size} categories, ${accountMap.size} accounts`,
  );
  return { categoryMap, accountMap };
}

async function migrateIncomes(
  range: { from: string; to: string; label: string },
  accountMap: Map<string, string>,
  categoryMap: Map<string, string>,
) {
  console.log(`\n--- Migrating Incomes (${range.label}) ---`);
  const pages = await fetchPagesByDateRange(NOTION_DBS.incomes, range.from, range.to, "Date");
  let created = 0;
  let skipped = 0;

  for (const page of pages) {
    const name = getTitle(page, "Name");
    const amount = getNumber(page, "Amount");
    const date = getDate(page, "Date");

    if (!name || !date || amount <= 0) {
      skipped++;
      continue;
    }

    const accountRelIds = getRelationIds(page, "Account");
    const accountId =
      accountRelIds.length > 0 ? accountMap.get(accountRelIds[0]) : undefined;
    if (!accountId) {
      console.warn(`  Skipping income "${name}": no account mapping`);
      skipped++;
      continue;
    }

    const categoryRelIds = getRelationIds(page, "Category");
    const categoryId =
      categoryRelIds.length > 0
        ? categoryMap.get(categoryRelIds[0])
        : undefined;

    const existing = await prisma.income.findFirst({
      where: { name, date, accountId, amount: new Prisma.Decimal(amount) },
    });
    if (existing) {
      skipped++;
      continue;
    }

    await prisma.income.create({
      data: {
        name,
        amount: new Prisma.Decimal(amount),
        date,
        accountId,
        categoryId: categoryId ?? null,
      },
    });
    created++;
  }

  console.log(`  Incomes ${range.label}: ${created} created, ${skipped} skipped`);
}

async function migrateExpenses(
  range: { from: string; to: string; label: string },
  accountMap: Map<string, string>,
  categoryMap: Map<string, string>,
) {
  console.log(`\n--- Migrating Expenses (${range.label}) ---`);
  const pages = await fetchPagesByDateRange(NOTION_DBS.expenses, range.from, range.to, "Date");
  let created = 0;
  let skipped = 0;

  for (const page of pages) {
    const name = getTitle(page, "Name");
    const amount = getNumber(page, "Amount");
    const date = getDate(page, "Date");

    if (!name || !date || amount <= 0) {
      skipped++;
      continue;
    }

    const accountRelIds = getRelationIds(page, "Account");
    const accountId =
      accountRelIds.length > 0 ? accountMap.get(accountRelIds[0]) : undefined;
    if (!accountId) {
      console.warn(`  Skipping expense "${name}": no account mapping`);
      skipped++;
      continue;
    }

    const categoryRelIds = getRelationIds(page, "Category");
    const categoryId =
      categoryRelIds.length > 0
        ? categoryMap.get(categoryRelIds[0])
        : undefined;

    const existing = await prisma.expense.findFirst({
      where: { name, date, accountId, amount: new Prisma.Decimal(amount) },
    });
    if (existing) {
      skipped++;
      continue;
    }

    await prisma.expense.create({
      data: {
        name,
        amount: new Prisma.Decimal(amount),
        date,
        accountId,
        categoryId: categoryId ?? null,
      },
    });
    created++;
  }

  console.log(`  Expenses ${range.label}: ${created} created, ${skipped} skipped`);
}

async function migrateTransfers(
  range: { from: string; to: string; label: string },
  accountMap: Map<string, string>,
) {
  console.log(`\n--- Migrating Transfers (${range.label}) ---`);
  const pages = await fetchPagesByDateRange(NOTION_DBS.transfers, range.from, range.to, "Date");
  let created = 0;
  let skipped = 0;

  for (const page of pages) {
    const name = getTitle(page, "Name");
    const amount = getNumber(page, "Amount");
    const date = getDate(page, "Date");

    if (!name || !date || amount <= 0) {
      skipped++;
      continue;
    }

    const fromRelIds = getRelationIds(page, "From Account");
    const toRelIds = getRelationIds(page, "To Account");

    const fromAccountId =
      fromRelIds.length > 0 ? accountMap.get(fromRelIds[0]) : undefined;
    const toAccountId =
      toRelIds.length > 0 ? accountMap.get(toRelIds[0]) : undefined;

    if (!fromAccountId || !toAccountId) {
      console.warn(`  Skipping transfer "${name}": missing account mapping`);
      skipped++;
      continue;
    }

    const existing = await prisma.transfer.findFirst({
      where: { name, date, fromAccountId, toAccountId, amount: new Prisma.Decimal(amount) },
    });
    if (existing) {
      skipped++;
      continue;
    }

    await prisma.transfer.create({
      data: {
        name,
        amount: new Prisma.Decimal(amount),
        date,
        fromAccountId,
        toAccountId,
      },
    });
    created++;
  }

  console.log(`  Transfers ${range.label}: ${created} created, ${skipped} skipped`);
}

// ============================================
// CLI
// ============================================

function printUsage() {
  console.log(`
Usage:
  npx tsx scripts/migrate-from-notion.ts setup                        Create accounts & categories
  npx tsx scripts/migrate-from-notion.ts data --year N [--month M]    Migrate transactions
  npx tsx scripts/migrate-from-notion.ts clean                        Delete all expenses, incomes, transfers

Examples:
  npx tsx scripts/migrate-from-notion.ts setup
  npx tsx scripts/migrate-from-notion.ts data --year 2024 --month 9
  npx tsx scripts/migrate-from-notion.ts data --year 2025 --month 1
  npx tsx scripts/migrate-from-notion.ts data --year 2025
  npx tsx scripts/migrate-from-notion.ts clean
`);
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!process.env.NOTION_TOKEN && command !== "clean") {
    console.error("Missing NOTION_TOKEN environment variable.");
    console.error("Add it to your .env file:");
    console.error('  NOTION_TOKEN="ntn_..."');
    process.exit(1);
  }

  if (!process.env.DATABASE_URL) {
    console.error("Missing DATABASE_URL environment variable.");
    process.exit(1);
  }

  try {
    if (command === "setup") {
      console.log("=== Setup: Categories & Accounts ===");
      const categoryMap = await migrateCategories();
      const accountMap = await migrateAccounts();
      console.log("\n=== Setup Complete ===");
      console.log(
        `  ${categoryMap.size} categories, ${accountMap.size} accounts ready`,
      );
    } else if (command === "clean") {
      await cleanTransactions();
    } else if (command === "data") {
      const yearIdx = args.indexOf("--year");
      if (yearIdx === -1 || !args[yearIdx + 1]) {
        console.error("Missing --year argument.");
        printUsage();
        process.exit(1);
      }

      const year = parseInt(args[yearIdx + 1]);
      if (isNaN(year) || year < 2000 || year > 2100) {
        console.error(`Invalid year: ${args[yearIdx + 1]}`);
        process.exit(1);
      }

      const monthIdx = args.indexOf("--month");
      const month = monthIdx !== -1 ? parseInt(args[monthIdx + 1]) : undefined;
      if (month !== undefined && (isNaN(month) || month < 1 || month > 12)) {
        console.error(`Invalid month: ${args[monthIdx + 1]}`);
        process.exit(1);
      }

      const range = dateRangeForArgs(year, month);

      console.log(`=== Migrating Data for ${range.label} ===`);
      const { categoryMap, accountMap } = await buildLookupMaps();

      if (accountMap.size === 0) {
        console.error(
          "\nNo accounts found. Run 'setup' first:\n  npx tsx scripts/migrate-from-notion.ts setup",
        );
        process.exit(1);
      }

      await migrateIncomes(range, accountMap, categoryMap);
      await migrateExpenses(range, accountMap, categoryMap);
      await migrateTransfers(range, accountMap);

      console.log(`\n=== Migration for ${range.label} Complete ===`);
    } else {
      printUsage();
      process.exit(command ? 1 : 0);
    }
  } catch (error) {
    console.error("\nMigration failed:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
