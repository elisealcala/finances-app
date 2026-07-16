import { getQueryClient, trpc, HydrateClient } from "@/server/trpc/server";
import { IncomesPageClient } from "./components/incomes-page-client";

export const dynamic = "force-dynamic";

export default async function IncomesPage() {
  const queryClient = getQueryClient();
  const now = new Date();

  void queryClient.prefetchQuery(
    trpc.finances.income.list.queryOptions({
      year: now.getFullYear(),
      month: now.getMonth() + 1,
    }),
  );
  void queryClient.prefetchQuery(
    trpc.finances.income.categorySummary.queryOptions(),
  );

  return (
    <HydrateClient>
      <IncomesPageClient />
    </HydrateClient>
  );
}
