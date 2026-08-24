"use client";

import { useState, type FormEvent } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { MarkdownEditor } from "@/components/markdown-editor";
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
import type { HubLabel, HubProject } from "./hub-types";
import { ConfirmDeleteDialog } from "./confirm-delete-dialog";

type DeleteTarget = {
  kind: "project" | "label";
  id: string;
  name: string;
};

export function WorkspaceDialog({
  open,
  projects,
  labels,
  onOpenChange,
  onCreateProject,
  onUpdateProject,
  onDeleteProject,
  onCreateLabel,
  onDeleteLabel,
}: {
  open: boolean;
  projects: HubProject[];
  labels: HubLabel[];
  onOpenChange: (open: boolean) => void;
  onCreateProject: (name: string, color: string) => Promise<void>;
  onUpdateProject: (
    id: string,
    input: { name: string; color: string; description: string | null },
  ) => Promise<void>;
  onDeleteProject: (id: string) => Promise<void>;
  onCreateLabel: (name: string, color: string) => Promise<void>;
  onDeleteLabel: (id: string) => Promise<void>;
}) {
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [projectToEdit, setProjectToEdit] = useState<HubProject | null>(null);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto md:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Workspace organization</DialogTitle>
            <DialogDescription>
              Projects hold free-form context and connect related work. Labels add a flexible classification layer.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-7 md:grid-cols-2">
            <CollectionEditor
              title="Projects"
              items={projects}
              defaultColor="#6366f1"
              onCreate={onCreateProject}
              onEdit={setProjectToEdit}
              onDelete={(item) => setDeleteTarget({ kind: "project", ...item })}
            />
            <CollectionEditor
              title="Labels"
              items={labels}
              defaultColor="#10b981"
              onCreate={onCreateLabel}
              onDelete={(item) => setDeleteTarget({ kind: "label", ...item })}
            />
          </div>
        </DialogContent>
      </Dialog>

      <ProjectEditorDialog
        key={projectToEdit?.id ?? "no-project"}
        project={projectToEdit}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) setProjectToEdit(null);
        }}
        onSave={onUpdateProject}
      />

      <ConfirmDeleteDialog
        key={`${deleteTarget?.kind ?? "none"}-${deleteTarget?.id ?? "none"}`}
        open={deleteTarget !== null}
        title={`Delete ${deleteTarget?.kind ?? "item"}?`}
        description={
          deleteTarget?.kind === "project"
            ? `“${deleteTarget.name}” will be removed. Linked tasks and ideas will be kept without a project.`
            : `“${deleteTarget?.name ?? "This label"}” will be removed from every linked task.`
        }
        onOpenChange={(nextOpen) => {
          if (!nextOpen) setDeleteTarget(null);
        }}
        onConfirm={async () => {
          if (!deleteTarget) return;
          if (deleteTarget.kind === "project") {
            await onDeleteProject(deleteTarget.id);
          } else {
            await onDeleteLabel(deleteTarget.id);
          }
        }}
      />
    </>
  );
}

function CollectionEditor({
  title,
  items,
  defaultColor,
  onCreate,
  onEdit,
  onDelete,
}: {
  title: string;
  items: Array<{ id: string; name: string; color: string; description?: string | null }>;
  defaultColor: string;
  onCreate: (name: string, color: string) => Promise<void>;
  onEdit?: (item: HubProject) => void;
  onDelete: (item: { id: string; name: string }) => void;
}) {
  const [name, setName] = useState("");
  const [color, setColor] = useState(defaultColor);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) return;
    await onCreate(name.trim(), color);
    setName("");
  }

  return (
    <section className="space-y-3">
      <Label>{title}</Label>
      <div className="space-y-1.5">
        {items.length === 0 ? <p className="text-muted-foreground rounded-lg border border-dashed p-3 text-xs">No {title.toLowerCase()} yet.</p> : null}
        {items.map((item) => (
          <div key={item.id} className="flex items-center gap-2 rounded-lg border px-3 py-2">
            <span className="size-2.5 rounded-full" style={{ background: item.color }} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm">{item.name}</p>
              {item.description ? <p className="text-muted-foreground truncate text-[11px]">{item.description.replace(/[#*_>`\[\]]/g, "")}</p> : null}
            </div>
            {onEdit ? (
              <Button type="button" variant="ghost" size="icon-sm" aria-label={`Edit ${item.name}`} onClick={() => onEdit(item as HubProject)}>
                <Pencil className="size-3.5" />
              </Button>
            ) : null}
            <Button type="button" variant="ghost" size="icon-sm" onClick={() => onDelete({ id: item.id, name: item.name })}>
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        ))}
      </div>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <Input type="color" aria-label={`${title} color`} value={color} onChange={(event) => setColor(event.target.value)} className="w-11 shrink-0 px-1" />
        <Input value={name} onChange={(event) => setName(event.target.value)} placeholder={`New ${title.toLowerCase().slice(0, -1)}`} />
        <Button type="submit" size="icon" variant="outline" disabled={!name.trim()}><Plus className="size-4" /></Button>
      </form>
    </section>
  );
}

function ProjectEditorDialog({
  project,
  onOpenChange,
  onSave,
}: {
  project: HubProject | null;
  onOpenChange: (open: boolean) => void;
  onSave: (
    id: string,
    input: { name: string; color: string; description: string | null },
  ) => Promise<void>;
}) {
  const [name, setName] = useState(project?.name ?? "");
  const [color, setColor] = useState(project?.color ?? "#6366f1");
  const [description, setDescription] = useState(project?.description ?? "");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!project || !name.trim()) return;
    setSaving(true);
    try {
      await onSave(project.id, {
        name: name.trim(),
        color,
        description: description.trim() || null,
      });
      onOpenChange(false);
    } catch {
      // The caller surfaces the mutation error and the editor stays open.
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={project !== null} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto md:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Edit project</DialogTitle>
          <DialogDescription>
            Keep free-form context, research, decisions, and links with the project—no tasks required.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-[5rem_1fr]">
            <div className="space-y-2">
              <Label htmlFor="hub-project-color">Color</Label>
              <Input
                id="hub-project-color"
                type="color"
                value={color}
                onChange={(event) => setColor(event.target.value)}
                className="w-full px-1"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="hub-project-name">Name</Label>
              <Input
                id="hub-project-name"
                autoFocus
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="hub-project-notes">Project notes</Label>
            <MarkdownEditor
              id="hub-project-notes"
              value={description}
              onChange={setDescription}
              placeholder="Drop in context, research, links, meeting notes, snippets, or whatever belongs here..."
              minHeight="min-h-80"
            />
          </div>
          <DialogFooter className="border-t pt-5">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving || !name.trim()}>
              {saving ? "Saving..." : "Save project"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
