"use client";

import { format } from "date-fns";
import {
  ArrowRight,
  Brain,
  CalendarRange,
  FileUser,
  Plus,
  Sparkles,
  Target,
} from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader, PageSection, PageShell } from "@/components/page";
import { useCareerOverview } from "@/hooks/use-career";

function statusLabel(status: string) {
  return status.charAt(0) + status.slice(1).toLowerCase();
}

export function CareerOverviewClient() {
  const overview = useCareerOverview();

  if (overview.isLoading) {
    return (
      <PageShell>
        <Skeleton className="h-16 w-full max-w-xl" />
        <Skeleton className="h-64 w-full" />
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-36" />
          <Skeleton className="h-36" />
          <Skeleton className="h-36" />
        </div>
      </PageShell>
    );
  }

  const data = overview.data;
  const active = data?.activeCycle;

  return (
    <PageShell>
      <PageHeader
        title="Career"
        description="Turn long-term growth into measurable cycles, evidence, and application-ready stories."
        actions={
          <Button asChild>
            <Link href="/career/cycles?new=true">
              <Plus className="size-4" /> Generate cycle
            </Link>
          </Button>
        }
      />

      {active ? (
        <Card className="overflow-hidden border-0 bg-gradient-to-br from-slate-950 via-indigo-950 to-violet-950 text-white shadow-xl shadow-indigo-950/10">
          <CardContent className="grid gap-8 p-6 md:grid-cols-[1fr_280px] md:p-8">
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="border-white/15 bg-white/10 text-white">
                  Active cycle
                </Badge>
                <Badge className="bg-indigo-500 text-white">
                  {statusLabel(active.health)}
                </Badge>
              </div>
              <div>
                <p className="text-xs font-medium tracking-[0.16em] text-indigo-200 uppercase">
                  {active.title || "Current focus"}
                </p>
                <h2 className="mt-2 max-w-3xl text-xl leading-8 font-semibold tracking-[-0.02em] md:text-2xl">
                  {active.desiredResult}
                </h2>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <span className="text-slate-300">Actual</span>
                    <span className="font-semibold">{Math.round(active.progress)}%</span>
                  </div>
                  <Progress
                    value={active.progress}
                    className="bg-white/15 [&_[data-slot=progress-indicator]]:bg-indigo-400"
                  />
                </div>
                <div>
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <span className="text-slate-300">Expected</span>
                    <span className="font-semibold">
                      {Math.round(active.expectedProgress)}%
                    </span>
                  </div>
                  <Progress
                    value={active.expectedProgress}
                    className="bg-white/15 [&_[data-slot=progress-indicator]]:bg-slate-400"
                  />
                </div>
              </div>
            </div>
            <div className="flex flex-col justify-between gap-5 rounded-2xl border border-white/10 bg-white/[0.06] p-5">
              <div>
                <p className="text-4xl font-semibold">{active.daysRemaining}</p>
                <p className="mt-1 text-sm text-slate-300">days remaining</p>
                <p className="mt-4 text-xs text-slate-400">
                  {format(active.startDate, "MMM d")} – {format(active.endDate, "MMM d, yyyy")}
                </p>
              </div>
              <Button asChild variant="secondary">
                <Link href={`/career/cycles/${active.id}`}>
                  Open cycle <ArrowRight className="size-4" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-4 py-14 text-center">
            <div className="bg-primary/10 text-primary flex size-12 items-center justify-center rounded-2xl">
              <Target className="size-6" />
            </div>
            <div>
              <h2 className="font-semibold">Start a career cycle</h2>
              <p className="text-muted-foreground mt-1 max-w-xl text-sm">
                Define the result, let AI propose weighted outputs, then prove the work with forms, links, or GitHub evidence.
              </p>
            </div>
            <Button asChild>
              <Link href="/career/cycles?new=true">Generate your first cycle</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <Link href="/career/cycles" className="block">
          <Card className="hover:border-primary/40 h-full transition-colors">
            <CardHeader>
              <CalendarRange className="text-primary size-5" />
              <CardTitle className="text-base">Cycles</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">
                {(data?.upcomingCycles.length ?? 0) + (data?.recentCycles.length ?? 0)}
              </p>
              <p className="text-muted-foreground mt-1 text-xs">
                upcoming and recently completed
              </p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/career/knowledge" className="block">
          <Card className="hover:border-primary/40 h-full transition-colors">
            <CardHeader>
              <Brain className="size-5 text-violet-600" />
              <CardTitle className="text-base">Evidence reviews</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">
                {data?.recentEvaluations.length ?? 0}
              </p>
              <p className="text-muted-foreground mt-1 text-xs">
                recent AI evaluations
              </p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/career/resume" className="block">
          <Card className="hover:border-primary/40 h-full transition-colors">
            <CardHeader>
              <FileUser className="size-5 text-emerald-600" />
              <CardTitle className="text-base">Resume readiness</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">
                {Math.round((data?.resumeReadiness ?? 0) * 100)}%
              </p>
              <Progress value={(data?.resumeReadiness ?? 0) * 100} className="mt-2" />
              <p className="text-muted-foreground mt-2 text-xs">
                {data?.opportunityCount ?? 0} active opportunities
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>

      {data?.upcomingCycles.length ? (
        <PageSection>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Next cycles</h2>
              <p className="text-muted-foreground text-sm">
                Drafts and scheduled work waiting for activation.
              </p>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link href="/career/cycles">View all</Link>
            </Button>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {data.upcomingCycles.slice(0, 4).map((cycle) => (
              <Link key={cycle.id} href={`/career/cycles/${cycle.id}`}>
                <Card className="hover:bg-accent/30 h-full transition-colors">
                  <CardContent className="flex items-start gap-3 pt-6">
                    <Sparkles className="text-primary mt-0.5 size-4" />
                    <div>
                      <p className="font-medium">{cycle.title || cycle.desiredResult}</p>
                      <p className="text-muted-foreground mt-1 text-xs">
                        {statusLabel(cycle.status)} · {format(cycle.startDate, "MMM d, yyyy")}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </PageSection>
      ) : null}
    </PageShell>
  );
}
