import { HydrateClient, getQueryClient, trpc } from "@/server/trpc/server";
import { CareerResumePageClient } from "./components/career-resume-page-client";

export const dynamic = "force-dynamic";

export default function CareerResumePage() {
  const queryClient = getQueryClient();
  void queryClient.prefetchQuery(trpc.career.profile.get.queryOptions());
  void queryClient.prefetchQuery(trpc.career.experience.list.queryOptions());
  void queryClient.prefetchQuery(trpc.career.education.list.queryOptions());
  void queryClient.prefetchQuery(trpc.career.project.list.queryOptions());
  void queryClient.prefetchQuery(trpc.career.opportunity.list.queryOptions());
  void queryClient.prefetchQuery(trpc.career.resume.list.queryOptions());
  return (
    <HydrateClient>
      <CareerResumePageClient />
    </HydrateClient>
  );
}
