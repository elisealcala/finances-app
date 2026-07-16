import { getQueryClient, trpc, HydrateClient } from "@/server/trpc/server";
import { ImportsPageClient } from "./components/imports-page-client";

export const dynamic = "force-dynamic";

export default async function ImportsPage() {
  const queryClient = getQueryClient();
  void queryClient.prefetchQuery(
    trpc.imports.list.queryOptions({ status: "PENDING" }),
  );
  void queryClient.prefetchQuery(trpc.imports.status.queryOptions());

  return (
    <HydrateClient>
      <ImportsPageClient />
    </HydrateClient>
  );
}
