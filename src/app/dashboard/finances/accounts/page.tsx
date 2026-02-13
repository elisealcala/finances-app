import { getQueryClient, trpc, HydrateClient } from "@/server/trpc/server";
import { AccountsPageClient } from "@/modules/finances/components/accounts-page-client";

export const dynamic = "force-dynamic";

export default async function AccountsPage() {
  const queryClient = getQueryClient();
  void queryClient.prefetchQuery(trpc.finances.account.list.queryOptions());

  return (
    <HydrateClient>
      <AccountsPageClient />
    </HydrateClient>
  );
}
