import { getQueryClient, trpc, HydrateClient } from "@/server/trpc/server";
import { PredictionPageClient } from "@/modules/prediction/components/prediction-page-client";

export const dynamic = "force-dynamic";

export default async function PredictionsPage() {
  const queryClient = getQueryClient();
  void queryClient.prefetchQuery(
    trpc.prediction.projection.availableBalances.queryOptions(),
  );
  void queryClient.prefetchQuery(
    trpc.prediction.projection.cashFlow.queryOptions({ months: 6 }),
  );
  void queryClient.prefetchQuery(
    trpc.prediction.projection.alerts.queryOptions(),
  );
  void queryClient.prefetchQuery(
    trpc.prediction.projection.upcoming.queryOptions({ daysAhead: 30 }),
  );
  void queryClient.prefetchQuery(
    trpc.prediction.projection.spendingRoom.queryOptions(),
  );

  return (
    <HydrateClient>
      <PredictionPageClient />
    </HydrateClient>
  );
}
