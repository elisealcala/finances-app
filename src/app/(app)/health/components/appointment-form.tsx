"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCreateAppointment } from "@/hooks/use-health";
import { toast } from "sonner";

type Medication = { name: string; dosage: string; frequency: string };

export function AppointmentForm() {
  const router = useRouter();
  const createAppointment = useCreateAppointment();

  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [specialty, setSpecialty] = useState("");
  const [doctorName, setDoctorName] = useState("");
  const [cost, setCost] = useState("");
  const [notes, setNotes] = useState("");
  const [medications, setMedications] = useState<Medication[]>([]);

  function updateMed(idx: number, patch: Partial<Medication>) {
    setMedications((meds) =>
      meds.map((m, i) => (i === idx ? { ...m, ...patch } : m)),
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!specialty.trim()) {
      toast.error("Specialty is required");
      return;
    }
    try {
      const created = await createAppointment.mutateAsync({
        date: new Date(date),
        specialty: specialty.trim(),
        doctorName: doctorName.trim() || null,
        cost: cost ? Number(cost) : null,
        notes: notes.trim() || null,
        medications: medications
          .filter((m) => m.name.trim())
          .map((m) => ({
            name: m.name.trim(),
            dosage: m.dosage.trim() || null,
            frequency: m.frequency.trim() || null,
          })),
      });
      toast.success("Appointment created");
      router.push(`/health/${created.id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-1.5">
          <Label htmlFor="date">Date</Label>
          <Input
            id="date"
            type="date"
            required
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="specialty">Specialty</Label>
          <Input
            id="specialty"
            required
            placeholder="e.g. Dermatology"
            value={specialty}
            onChange={(e) => setSpecialty(e.target.value)}
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="doctor">Doctor</Label>
          <Input
            id="doctor"
            placeholder="Optional"
            value={doctorName}
            onChange={(e) => setDoctorName(e.target.value)}
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="cost">Cost</Label>
          <Input
            id="cost"
            type="number"
            step="0.01"
            min="0"
            placeholder="0.00"
            value={cost}
            onChange={(e) => setCost(e.target.value)}
          />
        </div>
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          rows={3}
          placeholder="Diagnosis, recommendations, follow-up..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Medications</Label>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() =>
              setMedications((m) => [
                ...m,
                { name: "", dosage: "", frequency: "" },
              ])
            }
          >
            <Plus className="size-4" /> Add medication
          </Button>
        </div>
        {medications.length === 0 ? (
          <p className="text-muted-foreground text-xs">No medications added.</p>
        ) : (
          <div className="space-y-2">
            {medications.map((med, idx) => (
              <div key={idx} className="grid grid-cols-[2fr_1fr_1fr_auto] gap-2">
                <Input
                  placeholder="Name"
                  value={med.name}
                  onChange={(e) => updateMed(idx, { name: e.target.value })}
                />
                <Input
                  placeholder="Dosage"
                  value={med.dosage}
                  onChange={(e) => updateMed(idx, { dosage: e.target.value })}
                />
                <Input
                  placeholder="Frequency"
                  value={med.frequency}
                  onChange={(e) =>
                    updateMed(idx, { frequency: e.target.value })
                  }
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() =>
                    setMedications((m) => m.filter((_, i) => i !== idx))
                  }
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      <p className="text-muted-foreground text-xs">
        You can upload receipts and lab analyses on the appointment detail page
        after creating it.
      </p>

      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/health")}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={createAppointment.isPending}>
          {createAppointment.isPending ? "Saving..." : "Create"}
        </Button>
      </div>
    </form>
  );
}
