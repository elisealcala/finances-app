import { getQueryClient, trpc, HydrateClient } from "@/server/trpc/server";
import { FinancesPageClient } from "@/modules/finances/components/finances-page-client";

export const dynamic = "force-dynamic";

export default async function FinancesPage() {
  const queryClient = getQueryClient();
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  void queryClient.prefetchQuery(
    trpc.finances.overview.periodSummary.queryOptions({ year, month }),
  );
  void queryClient.prefetchQuery(
    trpc.finances.overview.monthlySummary.queryOptions({ year }),
  );

  return (
    <HydrateClient>
      <FinancesPageClient />
    </HydrateClient>
  );
}
