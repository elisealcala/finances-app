import { AppointmentForm } from "../components/appointment-form";
import { PageHeader, PageShell } from "@/components/page";

export default function NewAppointmentPage() {
  return (
    <PageShell width="narrow" className="max-w-2xl">
      <PageHeader
        title="New appointment"
        description="Log a doctor visit, medications, and related records."
      />
      <AppointmentForm />
    </PageShell>
  );
}
