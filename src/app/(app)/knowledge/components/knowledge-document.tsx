"use client";

import { format } from "date-fns";
import { CalendarDays, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { KnowledgeDocument, KnowledgeNavigationDocument } from "@/types/knowledge";
import { KnowledgeCanvas } from "./knowledge-canvas";
import { KnowledgeMarkdown } from "./knowledge-markdown";

export function KnowledgeDocument({
  document,
  links,
}: {
  document: KnowledgeDocument;
  links: KnowledgeNavigationDocument[];
}) {
  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline" className="gap-1.5 font-normal">
          <FileText className="size-3" />
          {document.relativePath}
        </Badge>
        <Badge variant="outline" className="gap-1.5 font-normal">
          <CalendarDays className="size-3" />
          {format(document.date, "MMMM d, yyyy")}
        </Badge>
        {document.tags.map((tag) => (
          <Badge key={tag} variant="secondary">
            #{tag}
          </Badge>
        ))}
      </div>

      {document.canvas ? <KnowledgeCanvas canvas={document.canvas} /> : null}

      <Card>
        <CardContent className="px-5 py-7 sm:px-8 lg:px-10 lg:py-9">
          <article className="max-w-none scroll-mt-6">
            <KnowledgeMarkdown
              content={document.content}
              currentRelativePath={document.relativePath}
              documents={links}
            />
          </article>
        </CardContent>
      </Card>
    </div>
  );
}
