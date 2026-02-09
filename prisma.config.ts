import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Use DIRECT_URL for CLI operations (migrations, introspection)
    // PgBouncer doesn't support prepared statements needed by Prisma Migrate
    url: process.env["DIRECT_URL"] ?? process.env["DATABASE_URL"],
  },
});
