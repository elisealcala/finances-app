import { AppointmentForm } from "../components/appointment-form";

export default function NewAppointmentPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">New appointment</h2>
        <p className="text-muted-foreground text-sm">
          Log a doctor visit, medications, and any records.
        </p>
      </div>
      <AppointmentForm />
    </div>
  );
}
