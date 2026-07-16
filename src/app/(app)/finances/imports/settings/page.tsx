import { getQueryClient, trpc, HydrateClient } from "@/server/trpc/server";
import { ImportsSettingsClient } from "./components/settings-page-client";

export const dynamic = "force-dynamic";

export default async function ImportsSettingsPage() {
  const queryClient = getQueryClient();
  void queryClient.prefetchQuery(trpc.imports.status.queryOptions());

  return (
    <HydrateClient>
      <ImportsSettingsClient />
    </HydrateClient>
  );
}
