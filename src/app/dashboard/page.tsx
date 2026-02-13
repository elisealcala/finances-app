import { getQueryClient, trpc, HydrateClient } from "@/server/trpc/server";
import { DashboardOverview } from "./dashboard-overview";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const queryClient = getQueryClient();
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  void queryClient.prefetchQuery(trpc.debt.list.queryOptions());
  void queryClient.prefetchQuery(
    trpc.finances.overview.periodSummary.queryOptions({ year, month }),
  );
  void queryClient.prefetchQuery(trpc.finances.account.list.queryOptions());

  return (
    <HydrateClient>
      <DashboardOverview />
    </HydrateClient>
  );
}
