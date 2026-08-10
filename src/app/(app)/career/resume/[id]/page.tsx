import { HydrateClient, getQueryClient, trpc } from "@/server/trpc/server";
import { CareerResumeEditorClient } from "../components/career-resume-editor-client";

export const dynamic = "force-dynamic";

export default async function CareerResumeEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const queryClient = getQueryClient();
  void queryClient.prefetchQuery(trpc.career.resume.get.queryOptions({ id }));
  return (
    <HydrateClient>
      <CareerResumeEditorClient id={id} />
    </HydrateClient>
  );
}
