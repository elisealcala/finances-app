"use client";

import { format } from "date-fns";
import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  Pencil,
  Plus,
  Target,
} from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader, PageSection, PageShell } from "@/components/page";
import { usePerformanceDashboard } from "@/hooks/use-performance";
import {
  EditPerformanceCycleDialog,
  PerformanceCycleSetup,
  PerformanceOutcomeDialog,
} from "./performance-form-dialogs";
import {
  PerformanceHealthBadge,
  PerformanceOutcomeCard,
} from "./performance-outcome-card";

export function PerformancePageClient({
  defaultStartDate,
  defaultEndDate,
}: {
  defaultStartDate: string;
  defaultEndDate: string;
}) {
  const { data: cycle, isLoading } = usePerformanceDashboard();
  const [editCycleOpen, setEditCycleOpen] = useState(false);
  const [outcomeOpen, setOutcomeOpen] = useState(false);

  if (isLoading) {
    return (
      <PageShell>
        <Skeleton className="h-16 w-full max-w-2xl" />
        <Skeleton className="h-56 w-full" />
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      </PageShell>
    );
  }

  if (!cycle) {
    return (
      <PageShell width="medium">
        <PageHeader
          title="Performance"
          description="Define a focused result, measure progress, and adjust before the deadline—not after it."
        />
        <Card>
          <CardHeader>
            <div className="bg-primary/10 text-primary mb-2 flex size-10 items-center justify-center rounded-xl">
              <Target className="size-5" />
            </div>
            <CardTitle>Generate a performance cycle</CardTitle>
          </CardHeader>
          <CardContent>
            <PerformanceCycleSetup
              defaultStartDate={defaultStartDate}
              defaultEndDate={defaultEndDate}
            />
          </CardContent>
        </Card>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <PageHeader
        title="Performance"
        description={`${format(cycle.startDate, "MMM d, yyyy")} – ${format(cycle.endDate, "MMM d, yyyy")}`}
        actions={
          <>
            <Button variant="outline" onClick={() => setEditCycleOpen(true)}>
              <Pencil className="size-4" /> Edit cycle
            </Button>
            <Button onClick={() => setOutcomeOpen(true)}>
              <Plus className="size-4" /> Add outcome
            </Button>
          </>
        }
      />

      <Card className="overflow-hidden border-0 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-white shadow-xl shadow-indigo-950/10">
        <CardContent className="grid gap-8 p-6 md:grid-cols-[1fr_280px] md:p-8">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="border-white/15 bg-white/10 text-white">Active cycle</Badge>
              <PerformanceHealthBadge health={cycle.health} />
            </div>
            <div>
              <p className="text-xs font-medium tracking-[0.16em] text-indigo-200 uppercase">
                Desired result
              </p>
              <h2 className="mt-2 max-w-4xl text-xl leading-8 font-semibold tracking-[-0.02em] text-balance md:text-2xl">
                {cycle.desiredResult}
              </h2>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="text-slate-300">Actual progress</span>
                  <span className="font-semibold">{Math.round(cycle.progress)}%</span>
                </div>
                <Progress value={cycle.progress} className="bg-white/15 [&_[data-slot=progress-indicator]]:bg-indigo-400" />
              </div>
              <div>
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="text-slate-300">Expected today</span>
                  <span className="font-semibold">{Math.round(cycle.expectedProgress)}%</span>
                </div>
                <Progress value={cycle.expectedProgress} className="bg-white/15 [&_[data-slot=progress-indicator]]:bg-slate-400" />
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-1">
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <p className="text-sm text-slate-300">Trajectory</p>
              <p className="mt-1 text-2xl font-semibold">
                {cycle.variance >= 0 ? "+" : ""}
                {Math.round(cycle.variance)} pts
              </p>
              <p className="mt-1 text-xs text-slate-400">against expected progress</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <p className="text-sm text-slate-300">Time remaining</p>
              <p className="mt-1 text-2xl font-semibold">{cycle.daysRemaining} days</p>
              <p className="mt-1 text-xs text-slate-400">
                {cycle.lastUpdatedAt
                  ? `Updated ${format(cycle.lastUpdatedAt, "MMM d")}`
                  : "No updates yet"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <Target className="text-muted-foreground size-4" /> Outcomes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{cycle.outcomes.length}</p>
            <p className="text-muted-foreground mt-1 text-xs">active results in this cycle</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <AlertTriangle className="text-muted-foreground size-4" /> Blockers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{cycle.blockers.length}</p>
            <p className="text-muted-foreground mt-1 text-xs">
              {cycle.blockers.length ? "need attention" : "nothing reported"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <CalendarClock className="text-muted-foreground size-4" /> Weekly rhythm
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">
              {cycle.lastUpdatedAt ? format(cycle.lastUpdatedAt, "MMM d") : "—"}
            </p>
            <p className="text-muted-foreground mt-1 text-xs">last progress update</p>
          </CardContent>
        </Card>
      </div>

      {cycle.blockers.length || cycle.nextActions.length ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Current blockers</CardTitle>
            </CardHeader>
            <CardContent>
              {cycle.blockers.length ? (
                <div className="space-y-3">
                  {cycle.blockers.map((item) => (
                    <div key={item.keyResultId} className="flex items-start gap-3 text-sm">
                      <AlertTriangle className="text-destructive mt-0.5 size-4 shrink-0" />
                      <span className="leading-6">{item.blocker}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">No active blockers.</p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Next actions</CardTitle>
            </CardHeader>
            <CardContent>
              {cycle.nextActions.length ? (
                <div className="space-y-3">
                  {cycle.nextActions.map((item) => (
                    <div key={item.keyResultId} className="flex items-start gap-3 text-sm">
                      <ArrowRight className="text-primary mt-0.5 size-4 shrink-0" />
                      <span className="leading-6">{item.nextAction}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">
                  Add a next action in the next progress update.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      ) : null}

      <PageSection>
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold tracking-[-0.02em]">Outcomes</h2>
            <p className="text-muted-foreground text-sm">
              The observable results that make the cycle goal true.
            </p>
          </div>
          {cycle.outcomes.length ? (
            <Button variant="outline" size="sm" onClick={() => setOutcomeOpen(true)}>
              <Plus className="size-4" /> Add outcome
            </Button>
          ) : null}
        </div>
        {cycle.outcomes.length ? (
          <div className="grid gap-4">
            {cycle.outcomes.map((outcome) => (
              <PerformanceOutcomeCard
                key={outcome.id}
                cycleId={cycle.id}
                outcome={outcome}
              />
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
              <Target className="text-muted-foreground size-8" />
              <p className="font-medium">Define the first observable outcome</p>
              <p className="text-muted-foreground max-w-lg text-sm">
                Prefer “lead two adopted architecture decisions” over “learn more architecture.”
              </p>
              <Button onClick={() => setOutcomeOpen(true)}>
                <Plus className="size-4" /> Add outcome
              </Button>
            </CardContent>
          </Card>
        )}
      </PageSection>

      <EditPerformanceCycleDialog
        cycle={cycle}
        open={editCycleOpen}
        onOpenChange={setEditCycleOpen}
      />
      <PerformanceOutcomeDialog
        cycleId={cycle.id}
        open={outcomeOpen}
        onOpenChange={setOutcomeOpen}
      />
    </PageShell>
  );
}
