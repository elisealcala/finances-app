import { HydrateClient, getQueryClient, trpc } from "@/server/trpc/server";
import { TasksHubClient } from "./components/tasks-hub-client";

export const dynamic = "force-dynamic";

export default async function TasksPage() {
  const queryClient = getQueryClient();
  void queryClient.prefetchQuery(trpc.hub.workspace.queryOptions());

  return (
    <HydrateClient>
      <TasksHubClient />
    </HydrateClient>
  );
}
