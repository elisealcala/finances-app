import { NoteForm } from "../components/note-form";

export default function NewNotePage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">New entry</h2>
        <p className="text-muted-foreground text-sm">Write something.</p>
      </div>
      <NoteForm />
    </div>
  );
}
