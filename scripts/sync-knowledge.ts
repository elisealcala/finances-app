import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { syncKnowledgeVault } from "@/server/knowledge/vault";

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL not configured");

  const database = new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });

  try {
    const result = await syncKnowledgeVault(database);
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  } finally {
    await database.$disconnect();
  }
}

void main().catch((error: unknown) => {
  process.stderr.write(
    `${error instanceof Error ? error.stack ?? error.message : String(error)}\n`,
  );
  process.exitCode = 1;
});
