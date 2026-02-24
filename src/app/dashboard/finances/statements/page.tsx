import { getQueryClient, trpc, HydrateClient } from "@/server/trpc/server";
import { StatementsPageClient } from "@/modules/finances/components/statements-page-client";

export const dynamic = "force-dynamic";

export default async function StatementsPage() {
  const queryClient = getQueryClient();
  const now = new Date();

  void queryClient.prefetchQuery(
    trpc.finances.statement.list.queryOptions({
      year: now.getFullYear(),
    }),
  );

  return (
    <HydrateClient>
      <StatementsPageClient />
    </HydrateClient>
  );
}
