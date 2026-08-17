"use client";

import { format, formatDistanceToNow } from "date-fns";
import {
  ArrowRight,
  Brain,
  CalendarDays,
  FolderOpen,
  LayoutDashboard,
  Search,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  useKnowledgeDocuments,
  useKnowledgeIndex,
  useKnowledgeNavigation,
  useKnowledgeStatus,
} from "@/hooks/use-knowledge";
import { KnowledgeDocument } from "./knowledge-document";
import { KnowledgeWorkspace } from "./knowledge-workspace";

function KnowledgeIndex() {
  const index = useKnowledgeIndex();
  const navigation = useKnowledgeNavigation();

  if (index.isLoading || navigation.isLoading) {
    return <p className="text-muted-foreground text-sm">Loading index…</p>;
  }

  if (!index.data) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-2 py-14 text-center">
          <Brain className="text-muted-foreground size-9" />
          <p className="font-medium">The knowledge index is not synced yet</p>
          <p className="text-muted-foreground max-w-md text-sm">
            Sync Obsidian to load the vault roadmap and category indexes.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <KnowledgeDocument
      document={index.data}
      links={navigation.data?.documents ?? []}
    />
  );
}

function KnowledgeLibrary() {
  const [search, setSearch] = useState("");
  const status = useKnowledgeStatus();
  const documents = useKnowledgeDocuments({ search: search || undefined });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">All notes</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          Search every indexed note, path, and tag in the vault.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="bg-primary/10 text-primary flex size-10 items-center justify-center rounded-xl">
                <Brain className="size-5" />
              </div>
              <div>
                <p className="text-2xl font-semibold">
                  {status.data?.documentCount ?? "—"}
                </p>
                <p className="text-muted-foreground text-xs">
                  indexed notes · {status.data?.canvasCount ?? "—"} canvases
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="bg-sky-500/10 text-sky-700 flex size-10 items-center justify-center rounded-xl dark:text-sky-300">
                <FolderOpen className="size-5" />
              </div>
              <div>
                <p className="text-sm font-semibold">
                  {status.data?.lastIndexedAt
                    ? formatDistanceToNow(status.data.lastIndexedAt, {
                        addSuffix: true,
                      })
                    : "Not synced yet"}
                </p>
                <p className="text-muted-foreground text-xs">last indexed</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="relative">
        <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search notes, paths, or tags…"
          className="pl-9"
        />
      </div>

      {documents.isLoading ? (
        <p className="text-muted-foreground text-sm">Loading knowledge…</p>
      ) : documents.data?.length ? (
        <div className="grid gap-4 xl:grid-cols-2">
          {documents.data.map((document) => (
            <Link key={document.id} href={`/career/knowledge/${document.id}`}>
              <Card className="hover:bg-accent/30 h-full transition-colors">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <CardTitle className="line-clamp-2 text-base leading-6">
                        {document.title}
                      </CardTitle>
                      <p className="text-muted-foreground mt-1 truncate text-xs">
                        {document.relativePath}
                      </p>
                      <p className="text-muted-foreground mt-1 flex items-center gap-1.5 text-xs">
                        <CalendarDays className="size-3" />
                        {format(document.date, "MMM d, yyyy")}
                      </p>
                    </div>
                    <ArrowRight className="text-muted-foreground mt-1 size-4 shrink-0" />
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {document.excerpt ? (
                    <p className="text-muted-foreground line-clamp-3 text-sm leading-6">
                      {document.excerpt}
                    </p>
                  ) : null}
                  <div className="flex flex-wrap gap-1.5">
                    {document.hasCanvas ? (
                      <Badge variant="outline" className="gap-1 font-normal">
                        <LayoutDashboard className="size-3" /> Canvas
                      </Badge>
                    ) : null}
                    {document.tags.slice(0, 6).map((tag) => (
                      <Badge key={tag} variant="secondary" className="font-normal">
                        #{tag}
                      </Badge>
                    ))}
                    {document.tags.length > 6 ? (
                      <Badge variant="outline">+{document.tags.length - 6}</Badge>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
            <Brain className="text-muted-foreground size-9" />
            <div>
              <p className="font-medium">No knowledge notes found</p>
              <p className="text-muted-foreground mt-1 text-sm">
                Sync your Obsidian vault or change the search.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export function KnowledgePageClient({ showLibrary = false }: { showLibrary?: boolean }) {
  return (
    <KnowledgeWorkspace activeView={showLibrary ? "library" : "index"}>
      {showLibrary ? <KnowledgeLibrary /> : <KnowledgeIndex />}
    </KnowledgeWorkspace>
  );
}
