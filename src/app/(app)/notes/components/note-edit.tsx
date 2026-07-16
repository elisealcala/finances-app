"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NoteForm } from "./note-form";
import { useNote } from "@/hooks/use-notes";

export function NoteEditPage({ id }: { id: string }) {
  const { data: note, isLoading } = useNote(id);

  if (isLoading) {
    return <p className="text-muted-foreground text-sm">Loading...</p>;
  }
  if (!note) {
    return <p className="text-muted-foreground text-sm">Not found.</p>;
  }

  return (
    <div className="space-y-5">
      <Button variant="ghost" size="sm" asChild>
        <Link href="/notes">
          <ArrowLeft className="size-4" /> Back
        </Link>
      </Button>
      <NoteForm
        mode="edit"
        initial={{
          id: note.id,
          date: note.date,
          title: note.title,
          content: note.content,
        }}
      />
    </div>
  );
}
