import { HydrateClient, getQueryClient, trpc } from "@/server/trpc/server";
import { KnowledgePageClient } from "@/app/(app)/knowledge/components/knowledge-page-client";

export const dynamic = "force-dynamic";

export default async function CareerKnowledgePage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const { view } = await searchParams;
  const showLibrary = view === "all";
  const queryClient = getQueryClient();
  void queryClient.prefetchQuery(trpc.knowledge.status.queryOptions());
  void queryClient.prefetchQuery(trpc.knowledge.navigation.queryOptions());
  if (showLibrary) {
    void queryClient.prefetchQuery(trpc.knowledge.list.queryOptions({}));
  } else {
    void queryClient.prefetchQuery(trpc.knowledge.index.queryOptions());
  }

  return (
    <HydrateClient>
      <KnowledgePageClient showLibrary={showLibrary} />
    </HydrateClient>
  );
}
