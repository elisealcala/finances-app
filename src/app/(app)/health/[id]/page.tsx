import { AppointmentDetail } from "../components/appointment-detail";
import { PageShell } from "@/components/page";

export default async function AppointmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <PageShell width="narrow">
      <AppointmentDetail id={id} />
    </PageShell>
  );
}
