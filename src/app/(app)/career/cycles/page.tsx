import { addMonths, format } from "date-fns";
import { HydrateClient, getQueryClient, trpc } from "@/server/trpc/server";
import { CareerCyclesClient } from "./components/career-cycles-client";

export const dynamic = "force-dynamic";

export default async function CareerCyclesPage({
  searchParams,
}: {
  searchParams: Promise<{ new?: string }>;
}) {
  const queryClient = getQueryClient();
  void queryClient.prefetchQuery(
    trpc.career.cycle.list.queryOptions({ includeArchived: false }),
  );
  const now = new Date();
  const query = await searchParams;
  return (
    <HydrateClient>
      <CareerCyclesClient
        defaultStartDate={format(now, "yyyy-MM-dd")}
        defaultEndDate={format(addMonths(now, 1), "yyyy-MM-dd")}
        initiallyCreating={query.new === "true"}
      />
    </HydrateClient>
  );
}
