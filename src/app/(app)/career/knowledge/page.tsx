import { HydrateClient, getQueryClient, trpc } from "@/server/trpc/server";
import { KnowledgePageClient } from "@/app/(app)/knowledge/components/knowledge-page-client";

export const dynamic = "force-dynamic";

export default function CareerKnowledgePage() {
  const queryClient = getQueryClient();
  void queryClient.prefetchQuery(trpc.knowledge.status.queryOptions());
  void queryClient.prefetchQuery(trpc.knowledge.list.queryOptions({}));

  return (
    <HydrateClient>
      <KnowledgePageClient />
    </HydrateClient>
  );
}
