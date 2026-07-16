import { AppointmentDetail } from "../components/appointment-detail";

export default async function AppointmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <div className="mx-auto max-w-3xl">
      <AppointmentDetail id={id} />
    </div>
  );
}
