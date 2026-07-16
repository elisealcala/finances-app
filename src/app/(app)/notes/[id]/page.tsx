import { NoteEditPage } from "../components/note-edit";

export default async function NoteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <div className="mx-auto max-w-3xl">
      <NoteEditPage id={id} />
    </div>
  );
}
