import { getQueryClient, trpc, HydrateClient } from "@/server/trpc/server";
import { DebtPageClient } from "@/modules/debt/components/debt-page-client";

export const dynamic = "force-dynamic";

export default async function DebtPage() {
  const queryClient = getQueryClient();
  void queryClient.prefetchQuery(trpc.debt.list.queryOptions());

  return (
    <HydrateClient>
      <DebtPageClient />
    </HydrateClient>
  );
}
