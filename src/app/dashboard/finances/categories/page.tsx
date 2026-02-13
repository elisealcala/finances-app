import { getQueryClient, trpc, HydrateClient } from "@/server/trpc/server";
import { CategoriesPageClient } from "@/modules/finances/components/categories-page-client";

export const dynamic = "force-dynamic";

export default async function CategoriesPage() {
  const queryClient = getQueryClient();
  void queryClient.prefetchQuery(trpc.finances.category.list.queryOptions());

  return (
    <HydrateClient>
      <CategoriesPageClient />
    </HydrateClient>
  );
}
