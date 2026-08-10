import { redirect } from "next/navigation";

export default async function KnowledgeDocumentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/career/knowledge/${id}`);
}
