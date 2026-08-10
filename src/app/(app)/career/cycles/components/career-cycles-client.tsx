"use client";

import { format } from "date-fns";
import {
  Archive,
  ArrowRight,
  CalendarRange,
  CheckCircle2,
  Clock3,
  Plus,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader, PageSection, PageShell } from "@/components/page";
import { useCareerCycles, useTransitionCareerCycle } from "@/hooks/use-career";
import { useCreatePerformanceCycle } from "@/hooks/use-performance";
import { PerformanceCycleSetup } from "@/app/(app)/performance/components/performance-form-dialogs";
import type { CareerCycle } from "@/types/career";

function parseDate(value: string) {
  return new Date(`${value}T12:00:00`);
}

const statusConfig = {
  DRAFT: { label: "Draft", icon: Clock3, className: "bg-slate-500 text-white" },
  UPCOMING: { label: "Upcoming", icon: CalendarRange, className: "bg-sky-600 text-white" },
  ACTIVE: { label: "Active", icon: Sparkles, className: "bg-indigo-600 text-white" },
  COMPLETED: { label: "Completed", icon: CheckCircle2, className: "bg-emerald-600 text-white" },
  ARCHIVED: { label: "Archived", icon: Archive, className: "" },
} as const;

function CycleCard({
  cycle,
  isUpdating,
  onArchive,
  onRestore,
}: {
  cycle: CareerCycle;
  isUpdating: boolean;
  onArchive: (id: string) => void;
  onRestore: (id: string) => void;
}) {
  const config = statusConfig[cycle.status];
  const Icon = config.icon;
  return (
    <Card className="hover:border-primary/40 h-full transition-colors">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div>
            <Badge className={config.className} variant={cycle.status === "ARCHIVED" ? "outline" : "default"}>
              <Icon className="size-3" /> {config.label}
            </Badge>
            <CardTitle className="mt-3 text-base leading-6">
              <Link className="hover:text-primary transition-colors" href={`/career/cycles/${cycle.id}`}>
                {cycle.title || cycle.desiredResult}
              </Link>
            </CardTitle>
          </div>
          <Button asChild size="icon" variant="ghost">
            <Link href={`/career/cycles/${cycle.id}`} aria-label="Open cycle">
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {cycle.title ? (
          <p className="text-muted-foreground line-clamp-2 text-sm leading-6">
            {cycle.desiredResult}
          </p>
        ) : null}
        <div>
          <div className="mb-2 flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium">{Math.round(cycle.progress)}%</span>
          </div>
          <Progress value={cycle.progress} />
        </div>
        <div className="text-muted-foreground flex items-center justify-between text-xs">
          <span>
            {format(cycle.startDate, "MMM d, yyyy")} – {format(cycle.endDate, "MMM d, yyyy")}
          </span>
          <span>{cycle.outcomes.length} outcomes</span>
        </div>
        <div className="flex justify-end border-t pt-3">
          {cycle.status === "ARCHIVED" ? (
            <Button size="sm" variant="ghost" disabled={isUpdating} onClick={() => onRestore(cycle.id)}>
              <RotateCcw className="size-4" /> Restore
            </Button>
          ) : (
            <Button size="sm" variant="ghost" disabled={isUpdating} onClick={() => onArchive(cycle.id)}>
              <Archive className="size-4" /> Archive
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function ManualCycleForm({
  defaultStartDate,
  defaultEndDate,
  onCreated,
}: {
  defaultStartDate: string;
  defaultEndDate: string;
  onCreated: () => void;
}) {
  const [title, setTitle] = useState("");
  const [desiredResult, setDesiredResult] = useState("");
  const [startDate, setStartDate] = useState(defaultStartDate);
  const [endDate, setEndDate] = useState(defaultEndDate);
  const createCycle = useCreatePerformanceCycle();

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    try {
      await createCycle.mutateAsync({
        title: title || null,
        desiredResult,
        startDate: parseDate(startDate),
        endDate: parseDate(endDate),
      });
      toast.success("Career cycle created");
      onCreated();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create cycle");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor="cycle-title">Cycle name</Label>
        <Input
          id="cycle-title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Build stronger platform engineering evidence"
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="cycle-result">Desired result</Label>
        <Textarea
          id="cycle-result"
          value={desiredResult}
          onChange={(event) => setDesiredResult(event.target.value)}
          placeholder="What should be observably true by the end of this cycle?"
          className="min-h-24"
          required
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="manual-cycle-start">Start</Label>
          <Input id="manual-cycle-start" type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="manual-cycle-end">End</Label>
          <Input id="manual-cycle-end" type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} />
        </div>
      </div>
      <Button type="submit" disabled={createCycle.isPending}>
        {createCycle.isPending ? "Creating…" : "Create cycle"}
      </Button>
    </form>
  );
}

export function CareerCyclesClient({
  defaultStartDate,
  defaultEndDate,
  initiallyCreating,
}: {
  defaultStartDate: string;
  defaultEndDate: string;
  initiallyCreating: boolean;
}) {
  const [showArchived, setShowArchived] = useState(false);
  const cycles = useCareerCycles(showArchived);
  const transition = useTransitionCareerCycle();
  const [createOpen, setCreateOpen] = useState(initiallyCreating);
  const [createMode, setCreateMode] = useState<"ai" | "manual">("ai");
  const rows = cycles.data ?? [];
  const current = rows.filter((cycle) => cycle.status === "ACTIVE");
  const upcoming = rows.filter((cycle) => ["DRAFT", "UPCOMING"].includes(cycle.status));
  const completed = rows.filter((cycle) => cycle.status === "COMPLETED");
  const archived = rows.filter((cycle) => cycle.status === "ARCHIVED");

  async function changeArchiveStatus(id: string, archived: boolean) {
    try {
      await transition.mutateAsync({
        id,
        status: archived ? "ARCHIVED" : "COMPLETED",
      });
      toast.success(archived ? "Cycle archived" : "Cycle restored to completed");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update cycle");
    }
  }

  function renderCycle(cycle: CareerCycle) {
    return (
      <CycleCard
        key={cycle.id}
        cycle={cycle}
        isUpdating={transition.isPending}
        onArchive={(id) => void changeArchiveStatus(id, true)}
        onRestore={(id) => void changeArchiveStatus(id, false)}
      />
    );
  }

  return (
    <PageShell>
      <PageHeader
        title="Career cycles"
        description="Plan several cycles, keep one active focus, and compare evidence-backed progress over time."
        actions={
          <>
            <Button variant="outline" onClick={() => setShowArchived((value) => !value)}>
              <Archive className="size-4" /> {showArchived ? "Hide archive" : "Show archive"}
            </Button>
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="size-4" /> Generate cycle
            </Button>
          </>
        }
      />

      {current.length ? (
        <PageSection>
          <h2 className="text-lg font-semibold">Current</h2>
          <div className="grid gap-4 lg:grid-cols-2">
            {current.map(renderCycle)}
          </div>
        </PageSection>
      ) : null}

      {upcoming.length ? (
        <PageSection>
          <h2 className="text-lg font-semibold">Upcoming</h2>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {upcoming.map(renderCycle)}
          </div>
        </PageSection>
      ) : null}

      {completed.length ? (
        <PageSection>
          <h2 className="text-lg font-semibold">Completed</h2>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {completed.map(renderCycle)}
          </div>
        </PageSection>
      ) : null}

      {showArchived ? (
        <PageSection>
          <h2 className="text-lg font-semibold">Archived</h2>
          {archived.length ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {archived.map(renderCycle)}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">No archived cycles.</p>
          )}
        </PageSection>
      ) : null}

      {!cycles.isLoading && !rows.length ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
            <CalendarRange className="text-muted-foreground size-9" />
            <p className="font-medium">No career cycles yet</p>
            <Button onClick={() => setCreateOpen(true)}>Generate cycle</Button>
          </CardContent>
        </Card>
      ) : null}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>New career cycle</DialogTitle>
            <DialogDescription>
              Generate a weighted plan with AI or define the cycle yourself.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2">
            <Button variant={createMode === "ai" ? "default" : "outline"} size="sm" onClick={() => setCreateMode("ai")}>
              <Sparkles className="size-4" /> AI plan
            </Button>
            <Button variant={createMode === "manual" ? "default" : "outline"} size="sm" onClick={() => setCreateMode("manual")}>
              Manual
            </Button>
          </div>
          {createMode === "ai" ? (
            <PerformanceCycleSetup defaultStartDate={defaultStartDate} defaultEndDate={defaultEndDate} />
          ) : (
            <ManualCycleForm defaultStartDate={defaultStartDate} defaultEndDate={defaultEndDate} onCreated={() => setCreateOpen(false)} />
          )}
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}
