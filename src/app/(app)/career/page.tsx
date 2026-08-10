import { HydrateClient, getQueryClient, trpc } from "@/server/trpc/server";
import { CareerOverviewClient } from "./components/career-overview-client";

export const dynamic = "force-dynamic";

export default function CareerPage() {
  const queryClient = getQueryClient();
  void queryClient.prefetchQuery(trpc.career.overview.queryOptions());
  return (
    <HydrateClient>
      <CareerOverviewClient />
    </HydrateClient>
  );
}
