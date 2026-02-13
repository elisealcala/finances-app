/**
 * One-time migration script: Import financial data from Notion databases.
 *
 * Usage:
 *   npx tsx scripts/migrate-from-notion.ts
 *
 * Required environment variables:
 *   NOTION_TOKEN          - Notion integration API token
 *   NOTION_CATEGORIES_DB  - Database ID for "Categories Global"
 *   NOTION_ACCOUNTS_DB    - Database ID for "Accounts"
 *   NOTION_INCOMES_DB     - Database ID for "Incomes"
 *   NOTION_EXPENSES_DB    - Database ID for "Expenses"
 *   NOTION_TRANSFERS_DB   - Database ID for "Transfers"
 *   DATABASE_URL          - PostgreSQL connection string (from .env)
 */

import { Client } from "@notionhq/client";
import { PrismaClient, Prisma } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";

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
    const response = await notion.databases.query({
      database_id: databaseId,
      start_cursor: cursor,
      page_size: 100,
    });
    pages.push(...(response.results as NotionPage[]));
    cursor = response.has_more ? response.next_cursor! : undefined;
  } while (cursor);

  return pages;
}

function getTitle(page: NotionPage, prop: string): string {
  const p = page.properties[prop];
  if (p?.type === "title") return p.title?.[0]?.plain_text ?? "";
  return "";
}

function getRichText(page: NotionPage, prop: string): string {
  const p = page.properties[prop];
  if (p?.type === "rich_text") return p.rich_text?.[0]?.plain_text ?? "";
  return "";
}

function getNumber(page: NotionPage, prop: string): number {
  const p = page.properties[prop];
  if (p?.type === "number") return p.number ?? 0;
  return 0;
}

function getDate(page: NotionPage, prop: string): Date | null {
  const p = page.properties[prop];
  if (p?.type === "date" && p.date?.start) return new Date(p.date.start);
  return null;
}

function getSelect(page: NotionPage, prop: string): string | null {
  const p = page.properties[prop];
  if (p?.type === "select") return p.select?.name ?? null;
  return null;
}

function getRelationIds(page: NotionPage, prop: string): string[] {
  const p = page.properties[prop];
  if (p?.type === "relation") return p.relation?.map((r: { id: string }) => r.id) ?? [];
  return [];
}

// ============================================
// Migration Steps
// ============================================

async function migrateCategories(dbId: string) {
  console.log("\n--- Migrating Categories ---");
  const pages = await fetchAllPages(dbId);
  const map = new Map<string, string>(); // notionId -> localId
  let created = 0;
  let skipped = 0;

  for (const page of pages) {
    const name = getTitle(page, "Name") || getRichText(page, "Name");
    if (!name) {
      console.warn(`  Skipping category page ${page.id}: no name`);
      skipped++;
      continue;
    }

    const monthlyBudget = getNumber(page, "Monthly Budget");

    // Idempotent: skip if already exists
    const existing = await prisma.category.findUnique({ where: { name } });
    if (existing) {
      map.set(page.id, existing.id);
      skipped++;
      continue;
    }

    const category = await prisma.category.create({
      data: {
        name,
        monthlyBudget: monthlyBudget > 0 ? new Prisma.Decimal(monthlyBudget) : null,
      },
    });
    map.set(page.id, category.id);
    created++;
  }

  console.log(`  Categories: ${created} created, ${skipped} skipped`);
  return map;
}

async function migrateAccounts(dbId: string) {
  console.log("\n--- Migrating Accounts ---");
  const pages = await fetchAllPages(dbId);
  const map = new Map<string, string>(); // notionId -> localId
  let created = 0;
  let skipped = 0;

  for (const page of pages) {
    const name = getTitle(page, "Name") || getRichText(page, "Name");
    if (!name) {
      console.warn(`  Skipping account page ${page.id}: no name`);
      skipped++;
      continue;
    }

    const opening = getNumber(page, "Opening");

    // Idempotent: skip if account with same name exists
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
  }

  console.log(`  Accounts: ${created} created, ${skipped} skipped`);
  return map;
}

async function migrateIncomes(
  dbId: string,
  accountMap: Map<string, string>,
  categoryMap: Map<string, string>,
) {
  console.log("\n--- Migrating Incomes ---");
  const pages = await fetchAllPages(dbId);
  let created = 0;
  let skipped = 0;

  for (const page of pages) {
    const name = getTitle(page, "Name") || getRichText(page, "Name");
    const amount = getNumber(page, "Amount");
    const date = getDate(page, "Date");

    if (!name || !date || amount <= 0) {
      skipped++;
      continue;
    }

    // Resolve account relation
    const accountRelIds = getRelationIds(page, "Account");
    const accountId = accountRelIds.length > 0 ? accountMap.get(accountRelIds[0]) : undefined;
    if (!accountId) {
      console.warn(`  Skipping income "${name}": no account mapping`);
      skipped++;
      continue;
    }

    // Resolve category relation
    const categoryRelIds = getRelationIds(page, "Category");
    const categoryId = categoryRelIds.length > 0 ? categoryMap.get(categoryRelIds[0]) : undefined;

    // Idempotent: check for existing by name + date
    const existing = await prisma.income.findFirst({
      where: { name, date, accountId },
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

  console.log(`  Incomes: ${created} created, ${skipped} skipped`);
}

async function migrateExpenses(
  dbId: string,
  accountMap: Map<string, string>,
  categoryMap: Map<string, string>,
) {
  console.log("\n--- Migrating Expenses ---");
  const pages = await fetchAllPages(dbId);
  let created = 0;
  let skipped = 0;

  for (const page of pages) {
    const name = getTitle(page, "Name") || getRichText(page, "Name");
    const amount = getNumber(page, "Amount");
    const date = getDate(page, "Date");

    if (!name || !date || amount <= 0) {
      skipped++;
      continue;
    }

    // Resolve account relation
    const accountRelIds = getRelationIds(page, "Account");
    const accountId = accountRelIds.length > 0 ? accountMap.get(accountRelIds[0]) : undefined;
    if (!accountId) {
      console.warn(`  Skipping expense "${name}": no account mapping`);
      skipped++;
      continue;
    }

    // Resolve category relation
    const categoryRelIds = getRelationIds(page, "Category");
    const categoryId = categoryRelIds.length > 0 ? categoryMap.get(categoryRelIds[0]) : undefined;

    // Map "Not Paid" select to paymentStatus
    const selectValue = getSelect(page, "Status") ?? getSelect(page, "Payment Status");
    const paymentStatus = selectValue === "Not Paid" ? "NOT_PAID" : "PAID";

    // Idempotent
    const existing = await prisma.expense.findFirst({
      where: { name, date, accountId },
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
        paymentStatus,
        accountId,
        categoryId: categoryId ?? null,
      },
    });
    created++;
  }

  console.log(`  Expenses: ${created} created, ${skipped} skipped`);
}

async function migrateTransfers(
  dbId: string,
  accountMap: Map<string, string>,
) {
  console.log("\n--- Migrating Transfers ---");
  const pages = await fetchAllPages(dbId);
  let created = 0;
  let skipped = 0;

  for (const page of pages) {
    const name = getTitle(page, "Name") || getRichText(page, "Name");
    const amount = getNumber(page, "Amount");
    const date = getDate(page, "Date");

    if (!name || !date || amount <= 0) {
      skipped++;
      continue;
    }

    // Resolve from/to account relations
    const fromRelIds = getRelationIds(page, "From") || getRelationIds(page, "From Account");
    const toRelIds = getRelationIds(page, "To") || getRelationIds(page, "To Account");

    const fromAccountId = fromRelIds.length > 0 ? accountMap.get(fromRelIds[0]) : undefined;
    const toAccountId = toRelIds.length > 0 ? accountMap.get(toRelIds[0]) : undefined;

    if (!fromAccountId || !toAccountId) {
      console.warn(`  Skipping transfer "${name}": missing account mapping`);
      skipped++;
      continue;
    }

    // Idempotent
    const existing = await prisma.transfer.findFirst({
      where: { name, date, fromAccountId },
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

  console.log(`  Transfers: ${created} created, ${skipped} skipped`);
}

// ============================================
// Main
// ============================================

async function main() {
  console.log("=== Notion to Finances App Migration ===\n");

  const requiredEnvs = [
    "NOTION_TOKEN",
    "NOTION_CATEGORIES_DB",
    "NOTION_ACCOUNTS_DB",
    "NOTION_INCOMES_DB",
    "NOTION_EXPENSES_DB",
    "NOTION_TRANSFERS_DB",
  ];

  const missing = requiredEnvs.filter((e) => !process.env[e]);
  if (missing.length > 0) {
    console.error(`Missing required environment variables:\n  ${missing.join("\n  ")}`);
    console.error("\nSet these in your .env file or export them before running.");
    process.exit(1);
  }

  try {
    // 1. Categories (no dependencies)
    const categoryMap = await migrateCategories(process.env.NOTION_CATEGORIES_DB!);

    // 2. Accounts (no dependencies)
    const accountMap = await migrateAccounts(process.env.NOTION_ACCOUNTS_DB!);

    // 3. Incomes (depends on accounts + categories)
    await migrateIncomes(
      process.env.NOTION_INCOMES_DB!,
      accountMap,
      categoryMap,
    );

    // 4. Expenses (depends on accounts + categories)
    await migrateExpenses(
      process.env.NOTION_EXPENSES_DB!,
      accountMap,
      categoryMap,
    );

    // 5. Transfers (depends on accounts)
    await migrateTransfers(process.env.NOTION_TRANSFERS_DB!, accountMap);

    console.log("\n=== Migration Complete ===");
  } catch (error) {
    console.error("\nMigration failed:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
