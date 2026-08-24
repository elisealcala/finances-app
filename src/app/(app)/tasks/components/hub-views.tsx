"use client";

import { useMemo, useState } from "react";
import {
  addDays,
  endOfWeek,
  format,
  isBefore,
  isSameDay,
  startOfDay,
  startOfWeek,
} from "date-fns";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Lightbulb,
  Plus,
  Sparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { HubTaskCard } from "./hub-task-card";
import {
  BOARD_STATUSES,
  TASK_PRIORITIES,
  TASK_STATUSES,
  ideaStageMeta,
  priorityMeta,
  statusMeta,
  type HubIdea,
  type HubProject,
  type HubTask,
  type HubTaskStatus,
} from "./hub-types";

type TaskViewProps = {
  tasks: HubTask[];
  onOpen: (task: HubTask) => void;
  onStatusChange: (id: string, status: HubTaskStatus) => void;
  onCreate: () => void;
};

export function WeekView(props: TaskViewProps) {
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 });
  const days = Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));
  const completedThisWeek = props.tasks.filter(
    (task) =>
      task.status === "DONE" &&
      task.completedAt &&
      new Date(task.completedAt) >= weekStart &&
      new Date(task.completedAt) <= weekEnd,
  );
  const overdue = props.tasks.filter(
    (task) =>
      task.dueDate &&
      !["DONE", "CANCELED"].includes(task.status) &&
      isBefore(startOfDay(new Date(task.dueDate)), startOfDay(new Date())),
  );
  const noDate = props.tasks.filter((task) => !task.dueDate && !["DONE", "CANCELED"].includes(task.status));

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-3">
        <MetricCard icon={Clock3} label="Overdue" value={overdue.length} tone="text-rose-600 dark:text-rose-300" />
        <MetricCard icon={CalendarDays} label="Due this week" value={props.tasks.filter((task) => task.dueDate && !["DONE", "CANCELED"].includes(task.status) && new Date(task.dueDate) >= weekStart && new Date(task.dueDate) <= weekEnd).length} tone="text-sky-600 dark:text-sky-300" />
        <MetricCard icon={CheckCircle2} label="Completed this week" value={completedThisWeek.length} tone="text-emerald-600 dark:text-emerald-300" />
      </div>

      {overdue.length > 0 ? (
        <TaskSection {...props} title="Overdue" count={overdue.length} tone="text-rose-600 dark:text-rose-300" tasks={overdue} />
      ) : null}

      <div className="overflow-x-auto pb-2">
        <div className="grid min-w-[980px] grid-cols-7 gap-2">
          {days.map((day) => {
            const dayTasks = props.tasks.filter((task) => {
              const activityDate =
                task.status === "DONE" && task.completedAt
                  ? task.completedAt
                  : task.dueDate;
              return activityDate && isSameDay(new Date(activityDate), day);
            });
            const today = isSameDay(day, new Date());
            return (
              <section key={day.toISOString()} className={cn("min-h-64 rounded-xl border p-2", today && "border-primary/25 bg-primary/[0.025]")}> 
                <div className="mb-2 flex items-center justify-between px-1 py-1">
                  <div>
                    <p className={cn("text-[10px] font-medium uppercase tracking-wider", today ? "text-primary" : "text-muted-foreground")}>{format(day, "EEE")}</p>
                    <p className="text-sm font-semibold">{format(day, "MMM d")}</p>
                  </div>
                  <span className="text-muted-foreground text-xs tabular-nums">{dayTasks.length}</span>
                </div>
                <div className="space-y-2">
                  {dayTasks.map((task) => <HubTaskCard key={task.id} task={task} compact onOpen={() => props.onOpen(task)} onStatusChange={(status) => props.onStatusChange(task.id, status)} />)}
                  {dayTasks.length === 0 ? <p className="text-muted-foreground py-8 text-center text-[11px]">Clear</p> : null}
                </div>
              </section>
            );
          })}
        </div>
      </div>

      {noDate.length > 0 ? (
        <TaskSection
          {...props}
          title="Unscheduled inbox"
          count={noDate.length}
          tasks={noDate}
        />
      ) : null}

    </div>
  );
}

export function ListView({ tasks, projects, ...props }: TaskViewProps & { projects: HubProject[] }) {
  const [groupBy, setGroupBy] = useState<"status" | "priority" | "project" | "none">("status");
  const groups = useMemo(() => {
    if (groupBy === "none") return [{ id: "all", title: "All tasks", tasks }];
    if (groupBy === "status") return TASK_STATUSES.map((status) => ({ id: status, title: statusMeta[status].label, tasks: tasks.filter((task) => task.status === status) }));
    if (groupBy === "priority") return TASK_PRIORITIES.map((priority) => ({ id: priority, title: priorityMeta[priority].label, tasks: tasks.filter((task) => task.priority === priority) }));
    return [
      ...projects.map((project) => ({ id: project.id, title: project.name, tasks: tasks.filter((task) => task.projectId === project.id) })),
      { id: "none", title: "No project", tasks: tasks.filter((task) => !task.projectId) },
    ];
  }, [groupBy, projects, tasks]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-muted-foreground text-sm">{tasks.length} task{tasks.length === 1 ? "" : "s"}</p>
        <div className="bg-muted flex rounded-lg p-1">
          {(["status", "priority", "project", "none"] as const).map((value) => (
            <button key={value} type="button" onClick={() => setGroupBy(value)} className={cn("rounded-md px-2.5 py-1 text-xs capitalize transition-colors", groupBy === value ? "bg-card text-foreground shadow-sm" : "text-muted-foreground")}>{value}</button>
          ))}
        </div>
      </div>
      <div className="space-y-6">
        {groups.filter((group) => group.tasks.length > 0).map((group) => (
          <TaskSection key={group.id} {...props} title={group.title} count={group.tasks.length} tasks={group.tasks} />
        ))}
        {tasks.length === 0 ? <EmptyTasks onCreate={props.onCreate} /> : null}
      </div>
    </div>
  );
}

export function BoardView(props: TaskViewProps) {
  return (
    <div className="overflow-x-auto pb-4">
      <div className="grid min-w-[1120px] grid-cols-5 gap-3">
        {BOARD_STATUSES.map((status) => {
          const tasks = props.tasks.filter((task) => task.status === status);
          return (
            <section
              key={status}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                const taskId = event.dataTransfer.getData("text/hub-task-id");
                if (taskId) props.onStatusChange(taskId, status);
              }}
              className="bg-muted/35 min-h-[520px] rounded-xl border p-2.5"
            >
              <div className="mb-3 flex items-center gap-2 px-1 py-1">
                <span className={cn("size-2 rounded-full", statusMeta[status].dot)} />
                <h3 className="text-xs font-semibold">{statusMeta[status].label}</h3>
                <span className="text-muted-foreground ml-auto text-xs tabular-nums">{tasks.length}</span>
              </div>
              <div className="space-y-2">
                {tasks.map((task) => (
                  <div key={task.id} draggable onDragStart={(event) => event.dataTransfer.setData("text/hub-task-id", task.id)}>
                    <HubTaskCard task={task} compact onOpen={() => props.onOpen(task)} onStatusChange={(next) => props.onStatusChange(task.id, next)} />
                  </div>
                ))}
                <Button variant="ghost" size="sm" className="text-muted-foreground w-full justify-start" onClick={props.onCreate}><Plus className="size-3.5" /> Add task</Button>
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

export function IdeasView({
  ideas,
  onOpen,
  onConvert,
  onCreate,
}: {
  ideas: HubIdea[];
  onOpen: (idea: HubIdea) => void;
  onConvert: (id: string) => void;
  onCreate: () => void;
}) {
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">Ideas</h2>
          <p className="text-muted-foreground text-sm">
            A lightweight place for thoughts, research, and possibilities—before they become tasks.
          </p>
        </div>
        <span className="text-muted-foreground text-sm tabular-nums">
          {ideas.length} idea{ideas.length === 1 ? "" : "s"}
        </span>
      </div>

      {ideas.length === 0 ? (
        <Card><CardContent className="flex flex-col items-center py-14 text-center"><Lightbulb className="text-muted-foreground mb-3 size-9" /><p className="font-medium">No ideas captured yet</p><p className="text-muted-foreground mt-1 max-w-sm text-sm">Start with a rough thought. The scoring model will help you decide what deserves action.</p><Button className="mt-4" onClick={onCreate}><Sparkles className="size-4" /> Capture idea</Button></CardContent></Card>
      ) : (
        <div className="overflow-hidden rounded-xl border bg-card">
          <div className="text-muted-foreground hidden grid-cols-[minmax(0,1fr)_11rem_8rem_5rem_6rem] gap-4 border-b bg-muted/30 px-4 py-2.5 text-[10px] font-medium uppercase tracking-wider lg:grid">
            <span>Idea</span>
            <span>Project / category</span>
            <span>Stage</span>
            <span>Score</span>
            <span className="text-right">Action</span>
          </div>
          <div className="divide-y">
            {ideas.map((idea) => (
              <IdeaListRow
                key={idea.id}
                idea={idea}
                onOpen={() => onOpen(idea)}
                onConvert={() => onConvert(idea.id)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function TimelineView(props: TaskViewProps) {
  const groups = useMemo(() => {
    const map = new Map<string, HubTask[]>();
    for (const task of [...props.tasks].sort((a, b) => (a.dueDate?.getTime() ?? Number.MAX_SAFE_INTEGER) - (b.dueDate?.getTime() ?? Number.MAX_SAFE_INTEGER))) {
      const key = task.dueDate ? format(new Date(task.dueDate), "yyyy-MM-dd") : "Unscheduled";
      map.set(key, [...(map.get(key) ?? []), task]);
    }
    return [...map.entries()];
  }, [props.tasks]);

  if (groups.length === 0) return <EmptyTasks onCreate={props.onCreate} />;
  return (
    <div className="relative space-y-0 before:absolute before:top-3 before:bottom-3 before:left-[6.75rem] before:w-px before:bg-border">
      {groups.map(([date, tasks]) => (
        <section key={date} className="relative grid grid-cols-[6rem_1fr] gap-6 pb-8">
          <div className="pt-1 text-right"><p className="text-xs font-medium">{date === "Unscheduled" ? date : format(new Date(`${date}T12:00:00`), "MMM d")}</p>{date !== "Unscheduled" ? <p className="text-muted-foreground text-[10px]">{format(new Date(`${date}T12:00:00`), "EEEE")}</p> : null}</div>
          <span className="bg-background border-primary absolute top-2 left-[6.45rem] z-10 size-2.5 rounded-full border-2" />
          <div className="space-y-2">{tasks.map((task) => <HubTaskCard key={task.id} task={task} onOpen={() => props.onOpen(task)} onStatusChange={(status) => props.onStatusChange(task.id, status)} />)}</div>
        </section>
      ))}
    </div>
  );
}

function TaskSection({ title, count, tasks, tone, onOpen, onStatusChange }: TaskViewProps & { title: string; count: number; tone?: string }) {
  return <section className="space-y-2.5"><div className="flex items-center gap-2"><h3 className={cn("text-xs font-semibold uppercase tracking-wider", tone)}>{title}</h3><span className="text-muted-foreground text-xs tabular-nums">{count}</span></div><div className="grid gap-2 lg:grid-cols-2">{tasks.map((task) => <HubTaskCard key={task.id} task={task} onOpen={() => onOpen(task)} onStatusChange={(status) => onStatusChange(task.id, status)} />)}</div></section>;
}

function MetricCard({ icon: Icon, label, value, tone }: { icon: typeof Clock3; label: string; value: number; tone: string }) {
  return <Card className="py-4"><CardContent className="flex items-center gap-3 px-4"><div className={cn("bg-muted flex size-9 items-center justify-center rounded-lg", tone)}><Icon className="size-4" /></div><div><p className="text-xl font-semibold tabular-nums">{value}</p><p className="text-muted-foreground text-xs">{label}</p></div></CardContent></Card>;
}

function EmptyTasks({ onCreate }: { onCreate: () => void }) {
  return <Card><CardContent className="flex flex-col items-center py-14 text-center"><CheckCircle2 className="text-muted-foreground mb-3 size-9" /><p className="font-medium">Your task list is clear</p><p className="text-muted-foreground mt-1 text-sm">Create a task or import the starter workspace.</p><Button className="mt-4" onClick={onCreate}><Plus className="size-4" /> New task</Button></CardContent></Card>;
}

function IdeaListRow({
  idea,
  onOpen,
  onConvert,
}: {
  idea: HubIdea;
  onOpen: () => void;
  onConvert: () => void;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpen();
        }
      }}
      className="hover:bg-accent/30 focus-visible:bg-accent/30 focus-visible:ring-ring grid cursor-pointer gap-3 px-4 py-4 outline-none focus-visible:ring-2 focus-visible:ring-inset lg:grid-cols-[minmax(0,1fr)_11rem_8rem_5rem_6rem] lg:items-center lg:gap-4"
    >
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground shrink-0 font-mono text-[10px]">
            {idea.identifier}
          </span>
          <p className="truncate text-sm font-medium">{idea.title}</p>
        </div>
        <p className="text-muted-foreground mt-1 line-clamp-1 text-xs leading-5">
          {idea.description || idea.notes || "No details yet"}
        </p>
        {idea.tags.length > 0 ? (
          <div className="mt-2 flex flex-wrap gap-1 lg:hidden">
            {idea.tags.slice(0, 3).map((tag) => (
              <Badge key={tag} variant="outline" className="text-[10px]">
                {tag}
              </Badge>
            ))}
          </div>
        ) : null}
      </div>

      <div className="flex min-w-0 items-center gap-2 text-xs">
        {idea.project ? (
          <>
            <span
              className="size-2 shrink-0 rounded-sm"
              style={{ background: idea.project.color }}
            />
            <span className="truncate">{idea.project.name}</span>
          </>
        ) : (
          <span className="text-muted-foreground truncate">{idea.category}</span>
        )}
      </div>

      <div>
        <Badge className={cn("h-5 border-0 text-[10px]", ideaStageMeta[idea.stage].className)}>
          {ideaStageMeta[idea.stage].label}
        </Badge>
      </div>

      <div className="flex items-center gap-2 lg:block">
        <span className="text-muted-foreground text-[10px] uppercase lg:hidden">Score</span>
        <span className="font-semibold tabular-nums">{idea.score}</span>
      </div>

      <div className="flex items-center justify-end gap-1">
        {!idea.sourceTask ? (
          <Button
            type="button"
            variant="ghost"
            size="xs"
            onClick={(event) => {
              event.stopPropagation();
              onConvert();
            }}
          >
            Convert <ArrowRight className="size-3" />
          </Button>
        ) : (
          <Badge variant="outline" className="text-[10px]">
            {idea.sourceTask.identifier}
          </Badge>
        )}
        <ChevronRight className="text-muted-foreground size-4" />
      </div>
    </div>
  );
}
