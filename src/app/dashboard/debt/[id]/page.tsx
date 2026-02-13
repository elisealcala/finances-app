import { HydrateClient } from "@/server/trpc/server";
import { DebtDetailPage } from "@/modules/debt/components/debt-detail-page";

export const dynamic = "force-dynamic";

export default async function DebtDetailRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <HydrateClient>
      <DebtDetailPage debtId={id} />
    </HydrateClient>
  );
}
