import { HydrateClient, getQueryClient, trpc } from "@/server/trpc/server";
import { CareerCycleDetailClient } from "../components/career-cycle-detail-client";

export const dynamic = "force-dynamic";

export default async function CareerCycleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const queryClient = getQueryClient();
  void queryClient.prefetchQuery(trpc.career.cycle.get.queryOptions({ id }));
  return (
    <HydrateClient>
      <CareerCycleDetailClient id={id} />
    </HydrateClient>
  );
}
