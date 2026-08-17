"use client";

import {
  BookOpenText,
  FolderOpen,
  Library,
  RefreshCw,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { PageHeader, PageShell } from "@/components/page";
import {
  useKnowledgeNavigation,
  useKnowledgeStatus,
  useSyncKnowledge,
} from "@/hooks/use-knowledge";
import { cn } from "@/lib/utils";

type KnowledgeView = "index" | "library" | "document";

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Knowledge sync failed";
}

function NavigationLink({
  href,
  active,
  icon,
  title,
  count,
}: {
  href: string;
  active: boolean;
  icon: React.ReactNode;
  title: string;
  count?: number;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group relative flex min-h-10 items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors",
        active
          ? "bg-accent text-accent-foreground font-medium"
          : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
      )}
    >
      <span
        className={cn(
          "bg-primary absolute inset-y-2 left-0 w-0.5 rounded-full transition-opacity",
          active ? "opacity-100" : "opacity-0",
        )}
      />
      <span className="shrink-0">{icon}</span>
      <span className="min-w-0 flex-1 leading-5">{title}</span>
      {typeof count === "number" ? (
        <span className="text-muted-foreground text-xs tabular-nums">{count}</span>
      ) : null}
    </Link>
  );
}

export function KnowledgeWorkspace({
  children,
  activeView,
  activePillar,
}: {
  children: React.ReactNode;
  activeView: KnowledgeView;
  activePillar?: string | null;
}) {
  const navigation = useKnowledgeNavigation();
  const status = useKnowledgeStatus();
  const sync = useSyncKnowledge();

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
    <PageShell width="full">
      <PageHeader
        title="Knowledge"
        description="Your Obsidian vault, organized around its roadmap and category indexes."
        actions={
          <Button onClick={handleSync} disabled={sync.isPending}>
            <RefreshCw
              className={sync.isPending ? "size-4 animate-spin" : "size-4"}
            />
            {sync.isPending ? "Syncing…" : "Sync Obsidian"}
          </Button>
        }
      />

      <div className="grid items-start gap-6 lg:grid-cols-[17rem_minmax(0,1fr)] xl:gap-8">
        <aside className="border-border/80 bg-card/60 overflow-hidden rounded-xl border lg:sticky lg:top-4">
          <nav aria-label="Knowledge navigation" className="space-y-1 p-2">
            <NavigationLink
              href="/career/knowledge"
              active={activeView === "index"}
              icon={<BookOpenText className="size-4" />}
              title="Index"
            />
            <NavigationLink
              href="/career/knowledge?view=all"
              active={activeView === "library"}
              icon={<Library className="size-4" />}
              title="All notes"
              count={status.data?.documentCount}
            />

            <Separator className="my-3" />
            <p className="text-muted-foreground px-3 pb-1 text-[11px] font-semibold tracking-[0.12em] uppercase">
              Categories
            </p>
            {navigation.isLoading ? (
              <p className="text-muted-foreground px-3 py-2 text-xs">
                Loading categories…
              </p>
            ) : (
              navigation.data?.categories.map((category) => (
                <NavigationLink
                  key={category.name}
                  href={
                    category.indexDocumentId
                      ? `/career/knowledge/${category.indexDocumentId}`
                      : "/career/knowledge?view=all"
                  }
                  active={
                    activeView === "document" && activePillar === category.name
                  }
                  icon={<FolderOpen className="size-4" />}
                  title={category.title}
                  count={category.documentCount}
                />
              ))
            )}
          </nav>

          <div className="border-border/70 text-muted-foreground border-t px-5 py-3 text-xs leading-5">
            {status.data?.lastIndexedAt
              ? `${status.data.documentCount} notes synced from Obsidian`
              : "Sync Obsidian to build the index"}
          </div>
        </aside>

        <main className="min-w-0">{children}</main>
      </div>
    </PageShell>
  );
}
