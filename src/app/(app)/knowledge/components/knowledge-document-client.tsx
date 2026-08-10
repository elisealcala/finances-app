"use client";

import { format } from "date-fns";
import { ArrowLeft, CalendarDays } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader, PageShell } from "@/components/page";
import { useKnowledgeDocument } from "@/hooks/use-knowledge";
import { KnowledgeCanvas } from "./knowledge-canvas";
import { KnowledgeMarkdown } from "./knowledge-markdown";

export function KnowledgeDocumentClient({ id }: { id: string }) {
  const { data: document, isLoading } = useKnowledgeDocument(id);

  if (isLoading || !document) {
    return (
      <PageShell width="medium">
        <p className="text-muted-foreground text-sm">Loading note…</p>
      </PageShell>
    );
  }

  return (
    <PageShell width="medium">
      <Button variant="ghost" size="sm" asChild className="w-fit">
        <Link href="/career/knowledge">
          <ArrowLeft className="size-4" /> Back to Knowledge
        </Link>
      </Button>

      <PageHeader
        title={document.title}
        description={document.relativePath}
      />

      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline" className="gap-1.5 font-normal">
          <CalendarDays className="size-3" />
          {format(document.date, "MMMM d, yyyy")}
        </Badge>
        {document.tags.map((tag) => (
          <Badge key={tag} variant="secondary">#{tag}</Badge>
        ))}
      </div>

      {document.canvas ? <KnowledgeCanvas canvas={document.canvas} /> : null}

      <Card>
        <CardContent className="py-7">
          <article className="max-w-none">
            <KnowledgeMarkdown content={document.content} />
          </article>
        </CardContent>
      </Card>
    </PageShell>
  );
}
