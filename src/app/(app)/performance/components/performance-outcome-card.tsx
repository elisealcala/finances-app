"use client";

import { format } from "date-fns";
import {
  AlertTriangle,
  ExternalLink,
  History,
  Pencil,
  Plus,
  TrendingUp,
} from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type {
  PerformanceHealth,
  PerformanceKeyResult,
  PerformanceOutcome,
} from "@/types/performance";
import {
  PerformanceKeyResultDialog,
  PerformanceOutcomeDialog,
  PerformanceProgressDialog,
} from "./performance-form-dialogs";

const healthLabels: Record<PerformanceHealth, string> = {
  ON_TRACK: "On track",
  AT_RISK: "At risk",
  OFF_TRACK: "Off track",
  COMPLETE: "Complete",
};

export function PerformanceHealthBadge({
  health,
}: {
  health: PerformanceHealth;
}) {
  return (
    <Badge
      variant={
        health === "OFF_TRACK"
          ? "destructive"
          : health === "ON_TRACK" || health === "COMPLETE"
            ? "default"
            : "secondary"
      }
      className={
        health === "ON_TRACK" || health === "COMPLETE"
          ? "bg-emerald-600 text-white"
          : health === "AT_RISK"
            ? "bg-amber-500 text-white"
            : undefined
      }
    >
      {healthLabels[health]}
    </Badge>
  );
}

function formatMetric(keyResult: PerformanceKeyResult): string {
  if (keyResult.measurementMode === "BOOLEAN") {
    return keyResult.progress >= 100 ? "Complete" : "Not complete";
  }
  if (
    keyResult.measurementMode === "MILESTONE" ||
    keyResult.measurementMode === "MANUAL"
  ) {
    return `${Math.round(keyResult.progress)}%`;
  }

  const suffix = keyResult.unit ? ` ${keyResult.unit}` : "";
  return `${keyResult.currentValue.toLocaleString()} / ${keyResult.target.toLocaleString()}${suffix}`;
}

function PerformanceKeyResultRow({
  outcomeId,
  keyResult,
}: {
  outcomeId: string;
  keyResult: PerformanceKeyResult;
}) {
  const [updateOpen, setUpdateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  return (
    <div className="rounded-xl border p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="font-medium">{keyResult.title}</h4>
            <PerformanceHealthBadge health={keyResult.health} />
          </div>
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="text-muted-foreground">{formatMetric(keyResult)}</span>
            <span className="font-medium">{Math.round(keyResult.progress)}%</span>
          </div>
          <Progress value={keyResult.progress} />
        </div>
        <div className="flex shrink-0 gap-2">
          <Button size="sm" variant="outline" onClick={() => setEditOpen(true)}>
            <Pencil className="size-3.5" /> Edit
          </Button>
          <Button size="sm" onClick={() => setUpdateOpen(true)}>
            <TrendingUp className="size-3.5" /> Update
          </Button>
        </div>
      </div>

      {keyResult.latestUpdate ? (
        <div className="bg-muted/45 mt-4 rounded-lg p-3 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-muted-foreground text-xs">
              {format(keyResult.latestUpdate.recordedAt, "MMM d, yyyy")}
            </span>
            <Badge variant="outline" className="text-[10px]">
              {keyResult.latestUpdate.confidence.toLowerCase()} confidence
            </Badge>
          </div>
          <p className="mt-1 leading-6">{keyResult.latestUpdate.summary}</p>
          {keyResult.latestUpdate.blocker ? (
            <div className="text-destructive mt-2 flex items-start gap-2">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" />
              <span>{keyResult.latestUpdate.blocker}</span>
            </div>
          ) : null}
          {keyResult.latestUpdate.nextAction ? (
            <p className="mt-2">
              <span className="text-muted-foreground">Next:</span>{" "}
              {keyResult.latestUpdate.nextAction}
            </p>
          ) : null}
          {keyResult.latestUpdate.evidenceUrl ? (
            <a
              href={keyResult.latestUpdate.evidenceUrl}
              target="_blank"
              rel="noreferrer"
              className="text-primary mt-2 inline-flex items-center gap-1 font-medium hover:underline"
            >
              {keyResult.latestUpdate.evidenceLabel || "Open evidence"}
              <ExternalLink className="size-3.5" />
            </a>
          ) : null}
        </div>
      ) : (
        <p className="text-muted-foreground mt-3 text-sm">
          No progress update yet. The baseline is being used as the current value.
        </p>
      )}

      {keyResult.updates.length > 1 ? (
        <details className="mt-3 text-sm">
          <summary className="text-muted-foreground flex cursor-pointer list-none items-center gap-2 font-medium">
            <History className="size-4" /> {keyResult.updates.length - 1} earlier update
            {keyResult.updates.length === 2 ? "" : "s"}
          </summary>
          <div className="mt-3 space-y-3 border-l pl-4">
            {keyResult.updates.slice(1).map((update) => (
              <div key={update.id}>
                <p className="text-muted-foreground text-xs">
                  {format(update.recordedAt, "MMM d, yyyy")}
                </p>
                <p className="mt-1 leading-6">{update.summary}</p>
              </div>
            ))}
          </div>
        </details>
      ) : null}

      <PerformanceProgressDialog
        keyResult={keyResult}
        open={updateOpen}
        onOpenChange={setUpdateOpen}
      />
      <PerformanceKeyResultDialog
        outcomeId={outcomeId}
        keyResult={keyResult}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
    </div>
  );
}

export function PerformanceOutcomeCard({
  cycleId,
  outcome,
}: {
  cycleId: string;
  outcome: PerformanceOutcome;
}) {
  const [outcomeOpen, setOutcomeOpen] = useState(false);
  const [keyResultOpen, setKeyResultOpen] = useState(false);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle className="text-lg">{outcome.title}</CardTitle>
              <PerformanceHealthBadge health={outcome.health} />
            </div>
            <p className="text-muted-foreground text-sm leading-6">{outcome.result}</p>
            {outcome.impact ? (
              <p className="text-sm leading-6">
                <span className="text-muted-foreground">Why it matters:</span>{" "}
                {outcome.impact}
              </p>
            ) : null}
          </div>
          <div className="flex shrink-0 gap-2">
            <Button variant="outline" size="sm" onClick={() => setOutcomeOpen(true)}>
              <Pencil className="size-3.5" /> Edit
            </Button>
            <Button size="sm" onClick={() => setKeyResultOpen(true)}>
              <Plus className="size-3.5" /> Key result
            </Button>
          </div>
        </div>
        <div className="space-y-2 pt-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Outcome progress</span>
            <span className="font-semibold">{Math.round(outcome.progress)}%</span>
          </div>
          <Progress value={outcome.progress} className="h-2.5" />
        </div>
      </CardHeader>
      <CardContent>
        {outcome.keyResults.length ? (
          <div className="grid gap-3">
            {outcome.keyResults.map((keyResult) => (
              <PerformanceKeyResultRow
                key={keyResult.id}
                outcomeId={outcome.id}
                keyResult={keyResult}
              />
            ))}
          </div>
        ) : (
          <div className="border-muted-foreground/20 flex flex-col items-center gap-3 rounded-xl border border-dashed py-8 text-center">
            <p className="text-sm font-medium">How will you prove this outcome?</p>
            <p className="text-muted-foreground max-w-md text-sm">
              Add a measurable key result with a baseline and target.
            </p>
            <Button size="sm" onClick={() => setKeyResultOpen(true)}>
              <Plus className="size-4" /> Add key result
            </Button>
          </div>
        )}
      </CardContent>

      <PerformanceOutcomeDialog
        cycleId={cycleId}
        outcome={outcome}
        open={outcomeOpen}
        onOpenChange={setOutcomeOpen}
      />
      <PerformanceKeyResultDialog
        outcomeId={outcome.id}
        open={keyResultOpen}
        onOpenChange={setKeyResultOpen}
      />
    </Card>
  );
}
