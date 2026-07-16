"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { ArrowLeft, Trash2, Plus, FileText, Image as ImageIcon, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { FileUpload } from "@/components/health/file-upload";
import {
  useAppointment,
  useDeleteAppointment,
  useAddMedication,
  useDeleteMedication,
  useDeleteAttachment,
} from "@/hooks/use-health";
import { toast } from "sonner";
import { useState } from "react";

const KIND_LABEL: Record<string, string> = {
  RECEIPT: "Receipt",
  ANALYSIS: "Analysis",
  OTHER: "Other",
};

export function AppointmentDetail({ id }: { id: string }) {
  const router = useRouter();
  const { data: apt, isLoading } = useAppointment(id);
  const deleteAppointment = useDeleteAppointment();
  const addMedication = useAddMedication();
  const deleteMedication = useDeleteMedication();
  const deleteAttachment = useDeleteAttachment(id);

  const [medName, setMedName] = useState("");
  const [medDosage, setMedDosage] = useState("");
  const [medFreq, setMedFreq] = useState("");

  if (isLoading) return <p className="text-muted-foreground text-sm">Loading...</p>;
  if (!apt) return <p className="text-muted-foreground text-sm">Not found.</p>;

  async function handleDelete() {
    if (!confirm("Delete this appointment and all attached files?")) return;
    try {
      await deleteAppointment.mutateAsync({ id });
      toast.success("Deleted");
      router.push("/health");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete");
    }
  }

  async function handleAddMed(e: React.FormEvent) {
    e.preventDefault();
    if (!medName.trim()) return;
    try {
      await addMedication.mutateAsync({
        appointmentId: id,
        name: medName.trim(),
        dosage: medDosage.trim() || null,
        frequency: medFreq.trim() || null,
      });
      setMedName("");
      setMedDosage("");
      setMedFreq("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to add");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/health">
            <ArrowLeft className="size-4" /> Back
          </Link>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDelete}
          disabled={deleteAppointment.isPending}
        >
          <Trash2 className="size-4" /> Delete
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-baseline justify-between gap-3">
            <CardTitle className="text-xl">
              {apt.specialty}
              {apt.doctorName && (
                <span className="text-muted-foreground ml-2 text-sm font-normal">
                  · {apt.doctorName}
                </span>
              )}
            </CardTitle>
            <span className="text-muted-foreground text-sm">
              {format(apt.date, "EEEE, MMMM d, yyyy")}
            </span>
          </div>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {apt.cost != null && (
            <div>
              <span className="text-muted-foreground">Cost: </span>
              <span>${Number(apt.cost).toFixed(2)}</span>
            </div>
          )}
          {apt.notes && (
            <div className="text-foreground whitespace-pre-wrap">
              {apt.notes}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Medications</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {apt.medications.length === 0 ? (
            <p className="text-muted-foreground text-sm">No medications.</p>
          ) : (
            <ul className="space-y-2">
              {apt.medications.map((med) => (
                <li
                  key={med.id}
                  className="flex items-center justify-between gap-2 text-sm"
                >
                  <div>
                    <span className="font-medium">{med.name}</span>
                    {med.dosage && (
                      <span className="text-muted-foreground ml-2">
                        {med.dosage}
                      </span>
                    )}
                    {med.frequency && (
                      <span className="text-muted-foreground ml-2">
                        · {med.frequency}
                      </span>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteMedication.mutate({ id: med.id })}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
          <form
            onSubmit={handleAddMed}
            className="grid grid-cols-[2fr_1fr_1fr_auto] gap-2"
          >
            <Input
              placeholder="Name"
              value={medName}
              onChange={(e) => setMedName(e.target.value)}
            />
            <Input
              placeholder="Dosage"
              value={medDosage}
              onChange={(e) => setMedDosage(e.target.value)}
            />
            <Input
              placeholder="Frequency"
              value={medFreq}
              onChange={(e) => setMedFreq(e.target.value)}
            />
            <Button type="submit" size="icon" disabled={addMedication.isPending}>
              <Plus className="size-4" />
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Files</CardTitle>
            <FileUpload appointmentId={id} />
          </div>
        </CardHeader>
        <CardContent>
          {apt.attachments.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No files yet. Upload receipts or lab analyses.
            </p>
          ) : (
            <ul className="space-y-2">
              {apt.attachments.map((a) => (
                <li
                  key={a.id}
                  className="flex items-center justify-between gap-2 text-sm"
                >
                  <a
                    href={a.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex min-w-0 flex-1 items-center gap-2 hover:underline"
                  >
                    {a.mimeType.startsWith("image/") ? (
                      <ImageIcon className="text-muted-foreground size-4 shrink-0" />
                    ) : (
                      <FileText className="text-muted-foreground size-4 shrink-0" />
                    )}
                    <span className="truncate">{a.filename}</span>
                    <Badge variant="secondary" className="ml-1 shrink-0">
                      {KIND_LABEL[a.kind] ?? a.kind}
                    </Badge>
                    <ExternalLink className="text-muted-foreground size-3 shrink-0" />
                  </a>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteAttachment.mutate({ id: a.id })}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
