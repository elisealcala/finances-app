import { HydrateClient, getQueryClient, trpc } from "@/server/trpc/server";
import { KnowledgeDocumentClient } from "@/app/(app)/knowledge/components/knowledge-document-client";

export const dynamic = "force-dynamic";

export default async function CareerKnowledgeDocumentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const queryClient = getQueryClient();
  void queryClient.prefetchQuery(trpc.knowledge.get.queryOptions({ id }));

  return (
    <HydrateClient>
      <KnowledgeDocumentClient id={id} />
    </HydrateClient>
  );
}
