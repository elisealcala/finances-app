import { NoteForm } from "../components/note-form";
import { PageHeader, PageShell } from "@/components/page";

export default function NewNotePage() {
  return (
    <PageShell width="narrow">
      <PageHeader title="New entry" description="Write something worth returning to." />
      <NoteForm />
    </PageShell>
  );
}
