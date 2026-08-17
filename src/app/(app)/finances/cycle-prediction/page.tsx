import { PageHeader, PageShell } from "@/components/page";
import { getQueryClient, HydrateClient, trpc } from "@/server/trpc/server";
import { FinanceCyclePlanner } from "../components/finance-cycle-planner";

export const dynamic = "force-dynamic";

export default async function CyclePredictionPage() {
  const queryClient = getQueryClient();

  void queryClient.prefetchQuery(trpc.finances.cycle.list.queryOptions());
  void queryClient.prefetchQuery(trpc.finances.cycle.defaults.queryOptions());

  return (
    <HydrateClient>
      <PageShell>
        <PageHeader
          title="Cycle prediction"
          description="Plan a savings cycle, compare scenarios, and see how your cash and purchase goals may change over time."
        />
        <FinanceCyclePlanner />
      </PageShell>
    </HydrateClient>
  );
}
