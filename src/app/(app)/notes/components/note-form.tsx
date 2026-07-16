"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NoteEditor } from "@/components/notes/editor";
import { useCreateNote, useUpdateNote, useDeleteNote } from "@/hooks/use-notes";
import { toast } from "sonner";

type Props = {
  mode?: "create" | "edit";
  initial?: {
    id: string;
    date: Date;
    title: string | null;
    content: unknown;
  };
};

export function NoteForm({ mode = "create", initial }: Props) {
  const router = useRouter();
  const createNote = useCreateNote();
  const updateNote = useUpdateNote();
  const deleteNote = useDeleteNote();

  const [date, setDate] = useState(
    format(initial?.date ?? new Date(), "yyyy-MM-dd"),
  );
  const [title, setTitle] = useState(initial?.title ?? "");
  const [content, setContent] = useState<unknown>(initial?.content ?? null);

  async function handleSave() {
    try {
      if (mode === "create") {
        const created = await createNote.mutateAsync({
          date: new Date(date),
          title: title.trim() || null,
          content: content ?? {},
        });
        toast.success("Saved");
        router.push(`/notes/${created.id}`);
      } else if (initial) {
        await updateNote.mutateAsync({
          id: initial.id,
          date: new Date(date),
          title: title.trim() || null,
          content: content ?? {},
        });
        toast.success("Updated");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save");
    }
  }

  async function handleDelete() {
    if (!initial || !confirm("Delete this entry?")) return;
    try {
      await deleteNote.mutateAsync({ id: initial.id });
      toast.success("Deleted");
      router.push("/notes");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete");
    }
  }

  const pending = createNote.isPending || updateNote.isPending;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-[160px_1fr] gap-3">
        <div className="grid gap-1.5">
          <Label htmlFor="date">Date</Label>
          <Input
            id="date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            placeholder="Optional title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>
      </div>

      <NoteEditor value={content} onChange={setContent} />

      <div className="flex justify-between gap-2">
        <div>
          {mode === "edit" && (
            <Button
              type="button"
              variant="ghost"
              onClick={handleDelete}
              disabled={deleteNote.isPending}
            >
              Delete
            </Button>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/notes")}
          >
            Cancel
          </Button>
          <Button type="button" onClick={handleSave} disabled={pending}>
            {pending ? "Saving..." : mode === "create" ? "Create" : "Save"}
          </Button>
        </div>
      </div>
    </div>
  );
}
