import { getQueryClient, trpc, HydrateClient } from "@/server/trpc/server";
import { NotesPageClient } from "./components/notes-page-client";

export const dynamic = "force-dynamic";

export default async function NotesPage() {
  const queryClient = getQueryClient();
  const now = new Date();
  void queryClient.prefetchQuery(
    trpc.notes.list.queryOptions({
      year: now.getFullYear(),
      month: now.getMonth() + 1,
    }),
  );

  return (
    <HydrateClient>
      <NotesPageClient />
    </HydrateClient>
  );
}
