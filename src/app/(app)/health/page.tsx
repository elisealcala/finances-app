import { getQueryClient, trpc, HydrateClient } from "@/server/trpc/server";
import { HealthPageClient } from "./components/health-page-client";

export const dynamic = "force-dynamic";

export default async function HealthPage() {
  const queryClient = getQueryClient();
  void queryClient.prefetchQuery(
    trpc.health.appointment.list.queryOptions(undefined),
  );

  return (
    <HydrateClient>
      <HealthPageClient />
    </HydrateClient>
  );
}
