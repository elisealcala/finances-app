import "server-only";
import { appRouter } from "@/server/trpc/router";
import { createCallerFactory } from "@/server/trpc/init";
import { db } from "@/server/db";

const createCaller = createCallerFactory(appRouter);

// A server-side tRPC caller lets the assistant's tools invoke the exact same
// validated procedures the UI uses (multi-currency aggregation, budget/debt
// math) with no HTTP hop and no duplicated query logic.
export function getServerCaller() {
  return createCaller({ db });
}
