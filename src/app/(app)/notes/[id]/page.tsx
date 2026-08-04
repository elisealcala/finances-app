import { NoteEditPage } from "../components/note-edit";
import { PageShell } from "@/components/page";

export default async function NoteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <PageShell width="narrow">
      <NoteEditPage id={id} />
    </PageShell>
  );
}
