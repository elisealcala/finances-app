import { getQueryClient, trpc, HydrateClient } from "@/server/trpc/server";
import { RecurringPageClient } from "./components/recurring-page-client";

export const dynamic = "force-dynamic";

export default async function RecurringPage() {
  const queryClient = getQueryClient();
  void queryClient.prefetchQuery(
    trpc.prediction.recurring.list.queryOptions(),
  );

  return (
    <HydrateClient>
      <RecurringPageClient />
    </HydrateClient>
  );
}
