import { getQueryClient, trpc, HydrateClient } from "@/server/trpc/server";
import { TransfersPageClient } from "@/modules/finances/components/transfers-page-client";

export const dynamic = "force-dynamic";

export default async function TransfersPage() {
  const queryClient = getQueryClient();
  const now = new Date();

  void queryClient.prefetchQuery(
    trpc.finances.transfer.list.queryOptions({
      year: now.getFullYear(),
      month: now.getMonth() + 1,
    }),
  );

  return (
    <HydrateClient>
      <TransfersPageClient />
    </HydrateClient>
  );
}
