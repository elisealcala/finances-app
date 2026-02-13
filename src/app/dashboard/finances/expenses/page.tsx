import { getQueryClient, trpc, HydrateClient } from "@/server/trpc/server";
import { ExpensesPageClient } from "@/modules/finances/components/expenses-page-client";

export const dynamic = "force-dynamic";

export default async function ExpensesPage() {
  const queryClient = getQueryClient();
  const now = new Date();

  void queryClient.prefetchQuery(
    trpc.finances.expense.list.queryOptions({
      year: now.getFullYear(),
      month: now.getMonth() + 1,
    }),
  );

  return (
    <HydrateClient>
      <ExpensesPageClient />
    </HydrateClient>
  );
}
