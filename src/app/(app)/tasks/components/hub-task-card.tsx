"use client";

import { format, isBefore, isToday, isTomorrow, startOfDay } from "date-fns";
import { CalendarDays, Check, ListChecks } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  priorityMeta,
  statusMeta,
  type HubTask,
  type HubTaskStatus,
} from "./hub-types";

function dueLabel(date: Date | null) {
  if (!date) return null;
  const value = new Date(date);
  if (isToday(value)) return "Today";
  if (isTomorrow(value)) return "Tomorrow";
  return format(value, "MMM d");
}

export function HubTaskCard({
  task,
  compact = false,
  selected = false,
  onOpen,
  onStatusChange,
}: {
  task: HubTask;
  compact?: boolean;
  selected?: boolean;
  onOpen: () => void;
  onStatusChange: (status: HubTaskStatus) => void;
}) {
  const done = task.status === "DONE";
  const overdue = Boolean(
    task.dueDate &&
      !done &&
      task.status !== "CANCELED" &&
      isBefore(startOfDay(new Date(task.dueDate)), startOfDay(new Date())),
  );
  const completedSubtasks = task.subtasks.filter((item) => item.completed).length;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") onOpen();
      }}
      className={cn(
        "group bg-card hover:bg-accent/35 relative cursor-pointer rounded-xl border p-3.5 transition-colors",
        compact && "p-3",
        selected && "border-primary/30 bg-accent/40 ring-primary/10 ring-2",
      )}
    >
      <div className="flex items-start gap-3">
        <button
          type="button"
          aria-label={done ? "Mark task as to do" : "Mark task as done"}
          title={done ? "Move back to To do" : "Mark as done"}
          onClick={(event) => {
            event.stopPropagation();
            onStatusChange(done ? "TODO" : "DONE");
          }}
          className={cn(
            "mt-0.5 flex h-7 shrink-0 items-center justify-center gap-1.5 rounded-md border px-2 text-[11px] font-semibold transition-colors",
            done
              ? "border-emerald-500 bg-emerald-500 text-white"
              : "border-emerald-500/45 bg-emerald-500/8 text-emerald-700 hover:border-emerald-500 hover:bg-emerald-500/15 dark:text-emerald-300",
            compact && "w-7 px-0",
          )}
        >
          <Check className="size-3.5" />
          <span className={compact ? "sr-only" : undefined}>
            {done ? "Done" : "Mark done"}
          </span>
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <p
              className={cn(
                "text-sm font-medium leading-5",
                done && "text-muted-foreground line-through",
              )}
            >
              {task.title}
            </p>
            <span className="text-muted-foreground shrink-0 font-mono text-[10px]">
              {task.identifier}
            </span>
          </div>

          {!compact && task.description ? (
            <p className="text-muted-foreground mt-1 line-clamp-2 text-xs leading-5">
              {task.description}
            </p>
          ) : null}

          <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
            <span className={cn("inline-flex items-center gap-1 text-[11px]", statusMeta[task.status].className)}>
              <span className={cn("size-1.5 rounded-full", statusMeta[task.status].dot)} />
              {statusMeta[task.status].label}
            </span>
            {task.priority !== "NONE" ? (
              <Badge className={cn("h-5 border-0 px-1.5 text-[10px]", priorityMeta[task.priority].className)}>
                {priorityMeta[task.priority].label}
              </Badge>
            ) : null}
            {task.project ? (
              <span className="text-muted-foreground inline-flex items-center gap-1 text-[11px]">
                <span className="size-2 rounded-sm" style={{ background: task.project.color }} />
                {task.project.name}
              </span>
            ) : null}
            {task.dueDate ? (
              <span className={cn("text-muted-foreground inline-flex items-center gap-1 text-[11px]", overdue && "text-destructive font-medium")}>
                <CalendarDays className="size-3" />
                {overdue ? "Overdue · " : ""}{dueLabel(task.dueDate)}
              </span>
            ) : null}
            {task.subtasks.length > 0 ? (
              <span className="text-muted-foreground inline-flex items-center gap-1 text-[11px]">
                <ListChecks className="size-3" />
                {completedSubtasks}/{task.subtasks.length}
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
