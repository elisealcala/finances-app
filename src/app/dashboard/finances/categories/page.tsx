import { getQueryClient, trpc, HydrateClient } from "@/server/trpc/server";
import { CategoriesPageClient } from "./components/categories-page-client";

export const dynamic = "force-dynamic";

export default async function CategoriesPage() {
  const queryClient = getQueryClient();
  const now = new Date();

  void queryClient.prefetchQuery(trpc.finances.category.list.queryOptions());
  void queryClient.prefetchQuery(
    trpc.finances.category.summary.queryOptions({
      year: now.getFullYear(),
      month: now.getMonth() + 1,
    }),
  );

  return (
    <HydrateClient>
      <CategoriesPageClient />
    </HydrateClient>
  );
}
