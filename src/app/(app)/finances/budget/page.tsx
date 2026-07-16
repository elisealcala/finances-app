import { getQueryClient, trpc, HydrateClient } from "@/server/trpc/server";
import { BudgetPageClient } from "./components/budget-page-client";

export const dynamic = "force-dynamic";

export default async function BudgetPage() {
  const queryClient = getQueryClient();
  const now = new Date();

  void queryClient.prefetchQuery(
    trpc.finances.category.budgetStatus.queryOptions({
      year: now.getFullYear(),
      month: now.getMonth() + 1,
    }),
  );

  return (
    <HydrateClient>
      <BudgetPageClient />
    </HydrateClient>
  );
}
