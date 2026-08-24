"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  CalendarRange,
  Columns3,
  Download,
  LayoutList,
  Lightbulb,
  Plus,
  Search,
  Settings2,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader, PageShell } from "@/components/page";
import { useHubMutations, useHubWorkspace } from "@/hooks/use-hub";
import { cn } from "@/lib/utils";
import { IdeaDrawer, type IdeaFormInput } from "./idea-dialog";
import { BoardView, IdeasView, ListView, TimelineView, WeekView } from "./hub-views";
import {
  priorityMeta,
  statusMeta,
  TASK_PRIORITIES,
  TASK_STATUSES,
  type HubIdea,
  type HubTask,
  type HubTaskStatus,
  type HubView,
  type HubWorkspace,
} from "./hub-types";
import { TaskDialog, type TaskFormInput } from "./task-dialog";
import { WorkspaceDialog } from "./workspace-dialog";

const emptyWorkspace: HubWorkspace = { tasks: [], ideas: [], projects: [], labels: [] };

const views: Array<{ id: HubView; label: string; icon: typeof CalendarRange }> = [
  { id: "week", label: "Week", icon: CalendarRange },
  { id: "list", label: "List", icon: LayoutList },
  { id: "board", label: "Board", icon: Columns3 },
  { id: "ideas", label: "Ideas", icon: Lightbulb },
  { id: "timeline", label: "Timeline", icon: Sparkles },
];

const viewDescriptions: Record<HubView, string> = {
  week: "Focus on what is due now and what is slipping.",
  list: "Review every task with flexible grouping and filters.",
  board: "Move work through a visual status workflow.",
  ideas: "Capture and develop ideas without turning them into tasks.",
  timeline: "See scheduled work as a chronological plan.",
};

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong";
}

export function TasksHubClient() {
  const { data, isLoading, error } = useHubWorkspace();
  const mutations = useHubMutations();
  const workspace: HubWorkspace = data ?? emptyWorkspace;
  const [view, setView] = useState<HubView>("week");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [projectFilter, setProjectFilter] = useState("all");
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [ideaDrawerOpen, setIdeaDrawerOpen] = useState(false);
  const [workspaceDialogOpen, setWorkspaceDialogOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [selectedIdeaId, setSelectedIdeaId] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const selectedTask = workspace.tasks.find((task) => task.id === selectedTaskId) ?? null;
  const selectedIdea = workspace.ideas.find((idea) => idea.id === selectedIdeaId) ?? null;

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement;
      const typing = ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName) || target.isContentEditable;
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchRef.current?.focus();
        return;
      }
      if (typing) return;
      if (event.key.toLowerCase() === "c") {
        event.preventDefault();
        setSelectedTaskId(null);
        setTaskDialogOpen(true);
      } else if (event.key.toLowerCase() === "i") {
        event.preventDefault();
        setSelectedIdeaId(null);
        setIdeaDrawerOpen(true);
      } else if (["1", "2", "3", "4", "5"].includes(event.key)) {
        setView(views[Number(event.key) - 1].id);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const filteredTasks = useMemo(() => {
    const query = search.trim().toLowerCase();
    return workspace.tasks.filter((task) => {
      if (query && ![task.title, task.description, task.identifier, task.project?.name, task.project?.description].filter(Boolean).some((value) => value!.toLowerCase().includes(query))) return false;
      if (statusFilter === "active" && ["DONE", "CANCELED"].includes(task.status)) return false;
      if (statusFilter === "completed" && task.status !== "DONE") return false;
      if (!["all", "active", "completed"].includes(statusFilter) && task.status !== statusFilter) return false;
      if (priorityFilter !== "all" && task.priority !== priorityFilter) return false;
      if (projectFilter !== "all" && task.projectId !== projectFilter) return false;
      return true;
    });
  }, [priorityFilter, projectFilter, search, statusFilter, workspace.tasks]);

  const filteredIdeas = useMemo(() => {
    const query = search.trim().toLowerCase();
    return workspace.ideas.filter((idea) => {
      if (query && ![idea.title, idea.description, idea.notes, idea.identifier, idea.category, idea.project?.name, idea.project?.description, ...idea.tags].filter(Boolean).some((value) => value!.toLowerCase().includes(query))) return false;
      if (projectFilter !== "all" && idea.projectId !== projectFilter) return false;
      return true;
    });
  }, [projectFilter, search, workspace.ideas]);

  const pending =
    mutations.createTask.isPending || mutations.updateTask.isPending ||
    mutations.createIdea.isPending || mutations.updateIdea.isPending ||
    mutations.convertIdea.isPending;

  function openTask(task: HubTask) {
    setSelectedTaskId(task.id);
    setTaskDialogOpen(true);
  }

  function openIdea(idea: HubIdea) {
    setSelectedIdeaId(idea.id);
    setIdeaDrawerOpen(true);
  }

  async function saveTask(input: TaskFormInput) {
    try {
      if (selectedTask) await mutations.updateTask.mutateAsync({ id: selectedTask.id, ...input });
      else await mutations.createTask.mutateAsync(input);
      setTaskDialogOpen(false);
      setSelectedTaskId(null);
      toast.success(selectedTask ? "Task updated" : "Task created");
    } catch (mutationError) {
      toast.error(errorMessage(mutationError));
    }
  }

  async function saveIdea(input: IdeaFormInput) {
    try {
      if (selectedIdea) await mutations.updateIdea.mutateAsync({ id: selectedIdea.id, ...input });
      else await mutations.createIdea.mutateAsync(input);
      setIdeaDrawerOpen(false);
      setSelectedIdeaId(null);
      toast.success(selectedIdea ? "Idea updated" : "Idea captured");
    } catch (mutationError) {
      toast.error(errorMessage(mutationError));
    }
  }

  async function convertIdea(id: string) {
    try {
      const task = await mutations.convertIdea.mutateAsync({ id });
      setIdeaDrawerOpen(false);
      setSelectedIdeaId(null);
      setView("week");
      toast.success(`${task.identifier} created from idea`);
    } catch (mutationError) {
      toast.error(errorMessage(mutationError));
    }
  }

  const taskViewProps = {
    tasks: filteredTasks,
    onOpen: openTask,
    onStatusChange: (id: string, status: HubTaskStatus) => {
      mutations.updateTask.mutate({ id, status }, { onError: (mutationError) => toast.error(errorMessage(mutationError)) });
    },
    onCreate: () => {
      setSelectedTaskId(null);
      setTaskDialogOpen(true);
    },
  };

  return (
    <PageShell width="full" className="space-y-5">
      <PageHeader
        title="Tasks & Ideas"
        description={viewDescriptions[view]}
        actions={<>
          <Button variant="outline" onClick={() => { setSelectedIdeaId(null); setIdeaDrawerOpen(true); }}><Lightbulb className="size-4" /> New idea <kbd className="text-muted-foreground ml-1 hidden text-[10px] sm:inline">I</kbd></Button>
          <Button onClick={() => { setSelectedTaskId(null); setTaskDialogOpen(true); }}><Plus className="size-4" /> New task <kbd className="text-primary-foreground/65 ml-1 hidden text-[10px] sm:inline">C</kbd></Button>
        </>}
      />

      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex max-w-full overflow-x-auto rounded-xl border bg-card p-1">
          {views.map((item, index) => (
            <button key={item.id} type="button" onClick={() => setView(item.id)} className={cn("text-muted-foreground flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition-colors", view === item.id && "bg-primary text-primary-foreground shadow-sm")}>
              <item.icon className="size-3.5" /> {item.label}<kbd className="ml-1 text-[9px] opacity-55">{index + 1}</kbd>
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-52 flex-1 sm:flex-none">
            <Search className="text-muted-foreground absolute top-1/2 left-3 size-3.5 -translate-y-1/2" />
            <Input ref={searchRef} value={search} onChange={(event) => setSearch(event.target.value)} placeholder={view === "ideas" ? "Search ideas..." : "Filter tasks..."} className="pl-9 sm:w-64" />
          </div>
          {view !== "ideas" ? <>
            <Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger size="sm"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All statuses</SelectItem><SelectItem value="active">Active</SelectItem><SelectItem value="completed">Completed</SelectItem>{TASK_STATUSES.map((status) => <SelectItem key={status} value={status}><span className={cn("size-2 rounded-full", statusMeta[status].dot)} />{statusMeta[status].label}</SelectItem>)}</SelectContent></Select>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}><SelectTrigger size="sm"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All priorities</SelectItem>{TASK_PRIORITIES.map((priority) => <SelectItem key={priority} value={priority}>{priorityMeta[priority].label}</SelectItem>)}</SelectContent></Select>
          </> : null}
          <Select value={projectFilter} onValueChange={setProjectFilter}><SelectTrigger size="sm"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All projects</SelectItem>{workspace.projects.map((project) => <SelectItem key={project.id} value={project.id}><span className="size-2 rounded-sm" style={{ background: project.color }} />{project.name}</SelectItem>)}</SelectContent></Select>
          <Button variant="outline" size="icon" onClick={() => setWorkspaceDialogOpen(true)} aria-label="Manage projects and labels"><Settings2 className="size-4" /></Button>
        </div>
      </div>

      {error ? <Card className="border-destructive/30"><CardContent className="text-destructive py-6 text-sm">Could not load Tasks & Ideas: {error.message}</CardContent></Card> : isLoading ? <HubLoading /> : <>
        {workspace.tasks.length + workspace.ideas.length + workspace.projects.length + workspace.labels.length === 0 ? (
          <div className="border-primary/15 bg-primary/[0.025] flex flex-col gap-4 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between">
            <div><p className="text-sm font-medium">Start with a clean workspace or load the attached prototype data</p><p className="text-muted-foreground mt-1 text-xs">The starter import creates the original projects, labels, tasks, subtasks, and ideas in Supabase.</p></div>
            <Button variant="outline" disabled={mutations.importStarterData.isPending} onClick={async () => {
              try { await mutations.importStarterData.mutateAsync(); toast.success("Starter workspace imported"); }
              catch (mutationError) { toast.error(errorMessage(mutationError)); }
            }}><Download className="size-4" /> {mutations.importStarterData.isPending ? "Importing..." : "Import starter data"}</Button>
          </div>
        ) : null}
        {view === "week" ? <WeekView {...taskViewProps} /> : null}
        {view === "list" ? <ListView {...taskViewProps} projects={workspace.projects} /> : null}
        {view === "board" ? <BoardView {...taskViewProps} /> : null}
        {view === "ideas" ? <IdeasView ideas={filteredIdeas} onOpen={openIdea} onConvert={convertIdea} onCreate={() => { setSelectedIdeaId(null); setIdeaDrawerOpen(true); }} /> : null}
        {view === "timeline" ? <TimelineView {...taskViewProps} /> : null}
      </>}

      <TaskDialog
        key={`task-${selectedTask?.id ?? "new"}-${taskDialogOpen ? "open" : "closed"}`}
        open={taskDialogOpen}
        task={selectedTask}
        projects={workspace.projects}
        labels={workspace.labels}
        pending={pending}
        onOpenChange={(open) => { setTaskDialogOpen(open); if (!open) setSelectedTaskId(null); }}
        onSave={saveTask}
        onDelete={async (id) => {
          try { await mutations.deleteTask.mutateAsync({ id }); setTaskDialogOpen(false); setSelectedTaskId(null); toast.success("Task deleted"); }
          catch (mutationError) { toast.error(errorMessage(mutationError)); }
        }}
        onCreateSubtask={async (taskId, title) => { try { await mutations.createSubtask.mutateAsync({ taskId, title }); } catch (mutationError) { toast.error(errorMessage(mutationError)); } }}
        onUpdateSubtask={async (id, completed) => { try { await mutations.updateSubtask.mutateAsync({ id, completed }); } catch (mutationError) { toast.error(errorMessage(mutationError)); } }}
        onDeleteSubtask={async (id) => { try { await mutations.deleteSubtask.mutateAsync({ id }); } catch (mutationError) { toast.error(errorMessage(mutationError)); } }}
      />
      <IdeaDrawer
        key={`idea-${selectedIdea?.id ?? "new"}-${ideaDrawerOpen ? "open" : "closed"}`}
        open={ideaDrawerOpen}
        idea={selectedIdea}
        projects={workspace.projects}
        pending={pending}
        onOpenChange={(open) => { setIdeaDrawerOpen(open); if (!open) setSelectedIdeaId(null); }}
        onSave={saveIdea}
        onDelete={async (id) => {
          try { await mutations.deleteIdea.mutateAsync({ id }); setIdeaDrawerOpen(false); setSelectedIdeaId(null); toast.success("Idea deleted"); }
          catch (mutationError) { toast.error(errorMessage(mutationError)); }
        }}
        onConvert={convertIdea}
      />
      <WorkspaceDialog
        open={workspaceDialogOpen}
        projects={workspace.projects}
        labels={workspace.labels}
        onOpenChange={setWorkspaceDialogOpen}
        onCreateProject={async (name, color) => { try { await mutations.createProject.mutateAsync({ name, color }); toast.success("Project created"); } catch (mutationError) { toast.error(errorMessage(mutationError)); } }}
        onUpdateProject={async (id, input) => {
          try {
            await mutations.updateProject.mutateAsync({ id, ...input });
            toast.success("Project updated");
          } catch (mutationError) {
            toast.error(errorMessage(mutationError));
            throw mutationError;
          }
        }}
        onDeleteProject={async (id) => { try { await mutations.deleteProject.mutateAsync({ id }); toast.success("Project deleted"); } catch (mutationError) { toast.error(errorMessage(mutationError)); } }}
        onCreateLabel={async (name, color) => { try { await mutations.createLabel.mutateAsync({ name, color }); toast.success("Label created"); } catch (mutationError) { toast.error(errorMessage(mutationError)); } }}
        onDeleteLabel={async (id) => { try { await mutations.deleteLabel.mutateAsync({ id }); toast.success("Label deleted"); } catch (mutationError) { toast.error(errorMessage(mutationError)); } }}
      />
    </PageShell>
  );
}

function HubLoading() {
  return <div className="space-y-3"><div className="grid gap-3 sm:grid-cols-3">{[1, 2, 3].map((item) => <Skeleton key={item} className="h-20 rounded-xl" />)}</div>{[1, 2, 3, 4].map((item) => <Skeleton key={item} className="h-24 rounded-xl" />)}</div>;
}
