import { getQueryClient, trpc, HydrateClient } from "@/server/trpc/server";
import { FinancesPageClient } from "./components/finances-page-client";

export const dynamic = "force-dynamic";

const CURRENCIES = ["PEN", "USD", "EUR"] as const;

export default async function FinancesPage() {
  const queryClient = getQueryClient();
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  for (const currency of CURRENCIES) {
    void queryClient.prefetchQuery(
      trpc.finances.overview.periodSummary.queryOptions({
        year,
        month,
        currency,
      }),
    );
    void queryClient.prefetchQuery(
      trpc.finances.overview.monthlySummary.queryOptions({
        year,
        currency,
      }),
    );
  }
  void queryClient.prefetchQuery(trpc.debt.list.queryOptions());

  return (
    <HydrateClient>
      <FinancesPageClient />
    </HydrateClient>
  );
}
