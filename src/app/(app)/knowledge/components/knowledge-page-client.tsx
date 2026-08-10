"use client";

import { format, formatDistanceToNow } from "date-fns";
import {
  ArrowRight,
  Brain,
  CalendarDays,
  FolderOpen,
  LayoutDashboard,
  RefreshCw,
  Search,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PageHeader, PageSection, PageShell } from "@/components/page";
import {
  useKnowledgeDocuments,
  useKnowledgeStatus,
  useSyncKnowledge,
} from "@/hooks/use-knowledge";

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Knowledge sync failed";
}

export function KnowledgePageClient() {
  const [search, setSearch] = useState("");
  const [pillar, setPillar] = useState<string | undefined>();
  const status = useKnowledgeStatus();
  const documents = useKnowledgeDocuments({
    search: search || undefined,
    pillar,
  });
  const sync = useSyncKnowledge();

  const pillars = useMemo(() => {
    const counts = new Map<string, number>();
    for (const document of documents.data ?? []) {
      if (!document.pillar) continue;
      counts.set(document.pillar, (counts.get(document.pillar) ?? 0) + 1);
    }
    return [...counts.entries()].sort(([left], [right]) =>
      left.localeCompare(right),
    );
  }, [documents.data]);

  async function handleSync() {
    try {
      const result = await sync.mutateAsync();
      toast.success(
        `Indexed ${result.scannedDocuments} notes and ${result.canvasDocuments} canvases`,
      );
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }

  return (
    <PageShell>
      <PageHeader
        title="Knowledge"
        description="Your searchable Obsidian second brain, indexed independently from career cycles."
        actions={
          <Button onClick={handleSync} disabled={sync.isPending}>
            <RefreshCw className={sync.isPending ? "size-4 animate-spin" : "size-4"} />
            {sync.isPending ? "Syncing…" : "Sync Obsidian"}
          </Button>
        }
      />

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

      <PageSection>
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search notes, paths, or tags…"
              className="pl-9"
            />
          </div>
          {pillar ? (
            <Button variant="outline" onClick={() => setPillar(undefined)}>
              Clear {pillar}
            </Button>
          ) : null}
        </div>

        {pillars.length && !search ? (
          <div className="flex flex-wrap gap-2">
            {pillars.map(([name, count]) => (
              <Button
                key={name}
                variant={pillar === name ? "default" : "outline"}
                size="sm"
                onClick={() => setPillar(pillar === name ? undefined : name)}
              >
                {name} <span className="opacity-60">{count}</span>
              </Button>
            ))}
          </div>
        ) : null}
      </PageSection>

      {documents.isLoading ? (
        <p className="text-muted-foreground text-sm">Loading knowledge…</p>
      ) : documents.data?.length ? (
        <div className="grid gap-4 lg:grid-cols-2">
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
                Sync your Obsidian vault or change the current filters.
              </p>
            </div>
            <Button onClick={handleSync} disabled={sync.isPending}>
              Sync Obsidian
            </Button>
          </CardContent>
        </Card>
      )}
    </PageShell>
  );
}
