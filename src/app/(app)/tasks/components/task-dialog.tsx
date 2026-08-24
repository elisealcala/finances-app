"use client";

import { useState, type FormEvent } from "react";
import { format } from "date-fns";
import { Check, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  priorityMeta,
  statusMeta,
  TASK_PRIORITIES,
  TASK_STATUSES,
  type HubLabel,
  type HubProject,
  type HubTask,
  type HubTaskPriority,
  type HubTaskStatus,
} from "./hub-types";
import { ConfirmDeleteDialog } from "./confirm-delete-dialog";

export type TaskFormInput = {
  title: string;
  description: string | null;
  status: HubTaskStatus;
  priority: HubTaskPriority;
  dueDate: Date | null;
  estimatePoints: number | null;
  projectId: string | null;
  labelIds: string[];
};

export function TaskDialog({
  open,
  task,
  projects,
  labels,
  pending,
  onOpenChange,
  onSave,
  onDelete,
  onCreateSubtask,
  onUpdateSubtask,
  onDeleteSubtask,
}: {
  open: boolean;
  task: HubTask | null;
  projects: HubProject[];
  labels: HubLabel[];
  pending: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (input: TaskFormInput) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onCreateSubtask: (taskId: string, title: string) => Promise<void>;
  onUpdateSubtask: (id: string, completed: boolean) => Promise<void>;
  onDeleteSubtask: (id: string) => Promise<void>;
}) {
  const [title, setTitle] = useState(task?.title ?? "");
  const [description, setDescription] = useState(task?.description ?? "");
  const [status, setStatus] = useState<HubTaskStatus>(task?.status ?? "TODO");
  const [priority, setPriority] = useState<HubTaskPriority>(task?.priority ?? "NONE");
  const [dueDate, setDueDate] = useState(
    task?.dueDate ? format(new Date(task.dueDate), "yyyy-MM-dd") : "",
  );
  const [estimatePoints, setEstimatePoints] = useState(
    task?.estimatePoints?.toString() ?? "1",
  );
  const [projectId, setProjectId] = useState(task?.projectId ?? "none");
  const [labelIds, setLabelIds] = useState<string[]>(
    task?.labels.map((label) => label.id) ?? [],
  );
  const [newSubtask, setNewSubtask] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!title.trim()) return;
    await onSave({
      title: title.trim(),
      description: description.trim() || null,
      status,
      priority,
      dueDate: dueDate ? new Date(`${dueDate}T12:00:00`) : null,
      estimatePoints: estimatePoints ? Number(estimatePoints) : null,
      projectId: projectId === "none" ? null : projectId,
      labelIds,
    });
  }

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto md:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{task ? task.identifier : "Create task"}</DialogTitle>
          <DialogDescription>
            {task ? "Update the task, ownership, and checklist." : "Capture a task and schedule it for your workspace."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="hub-task-title">Title</Label>
            <Input
              id="hub-task-title"
              autoFocus
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="What needs to get done?"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="hub-task-description">Description</Label>
            <Textarea
              id="hub-task-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Add context, notes, or links..."
              className="min-h-28"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={(value) => setStatus(value as HubTaskStatus)}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TASK_STATUSES.map((value) => (
                    <SelectItem key={value} value={value}>
                      <span className={cn("size-2 rounded-full", statusMeta[value].dot)} />
                      {statusMeta[value].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select value={priority} onValueChange={(value) => setPriority(value as HubTaskPriority)}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TASK_PRIORITIES.map((value) => (
                    <SelectItem key={value} value={value}>{priorityMeta[value].label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="hub-task-date">Due date</Label>
              <Input id="hub-task-date" type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="hub-task-estimate">Estimate points</Label>
              <Input id="hub-task-estimate" type="number" min="1" max="100" value={estimatePoints} onChange={(event) => setEstimatePoints(event.target.value)} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Project</Label>
              <Select value={projectId} onValueChange={setProjectId}>
                <SelectTrigger className="w-full"><SelectValue placeholder="No project" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No project</SelectItem>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      <span className="size-2 rounded-sm" style={{ background: project.color }} />
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {labels.length > 0 ? (
            <div className="space-y-2">
              <Label>Labels</Label>
              <div className="flex flex-wrap gap-2">
                {labels.map((label) => {
                  const selected = labelIds.includes(label.id);
                  return (
                    <button
                      key={label.id}
                      type="button"
                      onClick={() => setLabelIds((current) => selected ? current.filter((id) => id !== label.id) : [...current, label.id])}
                      className={cn(
                        "inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-xs transition-colors",
                        selected ? "border-primary/25 bg-accent" : "text-muted-foreground hover:bg-accent/50",
                      )}
                    >
                      <span className="size-2 rounded-full" style={{ background: label.color }} />
                      {label.name}
                      {selected ? <Check className="size-3" /> : null}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}

          {task ? (
            <div className="space-y-3 border-t pt-5">
              <div className="flex items-center justify-between">
                <Label>Subtasks</Label>
                <span className="text-muted-foreground text-xs">
                  {task.subtasks.filter((item) => item.completed).length}/{task.subtasks.length} complete
                </span>
              </div>
              <div className="space-y-1.5">
                {task.subtasks.map((subtask) => (
                  <div key={subtask.id} className="flex items-center gap-2 rounded-lg border px-3 py-2">
                    <button
                      type="button"
                      onClick={() => onUpdateSubtask(subtask.id, !subtask.completed)}
                      className={cn(
                        "flex size-4 items-center justify-center rounded border",
                        subtask.completed && "border-emerald-500 bg-emerald-500 text-white",
                      )}
                    >
                      {subtask.completed ? <Check className="size-3" /> : null}
                    </button>
                    <span className={cn("flex-1 text-sm", subtask.completed && "text-muted-foreground line-through")}>{subtask.title}</span>
                    <Button type="button" variant="ghost" size="icon-sm" onClick={() => onDeleteSubtask(subtask.id)}>
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  value={newSubtask}
                  onChange={(event) => setNewSubtask(event.target.value)}
                  placeholder="Add a subtask..."
                  onKeyDown={async (event) => {
                    if (event.key !== "Enter" || !newSubtask.trim()) return;
                    event.preventDefault();
                    await onCreateSubtask(task.id, newSubtask.trim());
                    setNewSubtask("");
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  disabled={!newSubtask.trim()}
                  onClick={async () => {
                    await onCreateSubtask(task.id, newSubtask.trim());
                    setNewSubtask("");
                  }}
                >
                  <Plus className="size-4" />
                </Button>
              </div>
            </div>
          ) : null}

          <DialogFooter className="border-t pt-5">
            {task ? (
              <Button
                type="button"
                variant="ghost"
                className="text-destructive mr-auto"
                onClick={() => setDeleteDialogOpen(true)}
              >
                <Trash2 className="size-4" /> Delete
              </Button>
            ) : null}
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={pending || !title.trim()}>{pending ? "Saving..." : "Save task"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
    {task ? (
      <ConfirmDeleteDialog
        open={deleteDialogOpen}
        title={`Delete ${task.identifier}?`}
        description={`“${task.title}” and its subtasks will be permanently deleted.`}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={() => onDelete(task.id)}
      />
    ) : null}
    </>
  );
}
