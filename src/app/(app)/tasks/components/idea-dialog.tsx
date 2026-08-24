"use client";

import { useMemo, useState, type FormEvent } from "react";
import { ArrowRight, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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
import { MarkdownEditor } from "@/components/markdown-editor";
import { cn } from "@/lib/utils";
import {
  IDEA_CATEGORIES,
  IDEA_STAGES,
  ideaStageMeta,
  type HubIdea,
  type HubIdeaStage,
  type HubProject,
} from "./hub-types";
import { ConfirmDeleteDialog } from "./confirm-delete-dialog";

export type IdeaFormInput = {
  title: string;
  description: string;
  category: (typeof IDEA_CATEGORIES)[number];
  stage: HubIdeaStage;
  impact: number;
  effort: number;
  confidence: number;
  projectId: string | null;
  tags: string[];
  targetQuarter: string | null;
  notes: string | null;
};

export function IdeaDrawer({
  open,
  idea,
  projects,
  pending,
  onOpenChange,
  onSave,
  onDelete,
  onConvert,
}: {
  open: boolean;
  idea: HubIdea | null;
  projects: HubProject[];
  pending: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (input: IdeaFormInput) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onConvert: (id: string) => Promise<void>;
}) {
  const [title, setTitle] = useState(idea?.title ?? "");
  const [description, setDescription] = useState(idea?.description ?? "");
  const [category, setCategory] = useState<(typeof IDEA_CATEGORIES)[number]>(
    (idea?.category as (typeof IDEA_CATEGORIES)[number]) ?? "Side Project",
  );
  const [stage, setStage] = useState<HubIdeaStage>(idea?.stage ?? "RAW");
  const [impact, setImpact] = useState(idea?.impact ?? 3);
  const [effort, setEffort] = useState(idea?.effort ?? 2);
  const [confidence, setConfidence] = useState(idea?.confidence ?? 4);
  const [projectId, setProjectId] = useState(idea?.projectId ?? "none");
  const [tags, setTags] = useState(idea?.tags.join(", ") ?? "");
  const [targetQuarter, setTargetQuarter] = useState(idea?.targetQuarter ?? "");
  const [notes, setNotes] = useState(idea?.notes ?? "");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const score = useMemo(
    () => Number(((impact * confidence) / Math.max(effort, 1)).toFixed(2)),
    [impact, effort, confidence],
  );

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!title.trim()) return;
    await onSave({
      title: title.trim(),
      description: description.trim(),
      category,
      stage,
      impact,
      effort,
      confidence,
      projectId: projectId === "none" ? null : projectId,
      tags: tags.split(",").map((item) => item.trim()).filter(Boolean),
      targetQuarter: targetQuarter.trim() || null,
      notes: notes.trim() || null,
    });
  }

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="!w-full gap-0 p-0 sm:!max-w-2xl">
          <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
            <SheetHeader className="shrink-0 border-b px-6 py-5 pr-12">
              <div className="flex items-center gap-2">
                <SheetTitle>{idea ? idea.identifier : "New idea"}</SheetTitle>
                {idea ? (
                  <Badge className={cn("h-5 border-0 text-[10px]", ideaStageMeta[idea.stage].className)}>
                    {ideaStageMeta[idea.stage].label}
                  </Badge>
                ) : null}
              </div>
              <SheetDescription>
                Keep this as a free-form idea. It only becomes a task if you choose to convert it.
              </SheetDescription>
            </SheetHeader>

            <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-6 py-5">
              <div className="space-y-2">
                <Label htmlFor="hub-idea-title">Title</Label>
                <Input id="hub-idea-title" autoFocus value={title} onChange={(event) => setTitle(event.target.value)} placeholder="What is the idea?" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="hub-idea-description">Summary</Label>
                <Textarea id="hub-idea-description" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="A short summary or problem statement..." className="min-h-24" />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Stage</Label>
                  <Select value={stage} onValueChange={(value) => setStage(value as HubIdeaStage)}>
                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>{IDEA_STAGES.map((value) => <SelectItem key={value} value={value}>{ideaStageMeta[value].label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Project</Label>
                  <Select value={projectId} onValueChange={setProjectId}>
                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No project</SelectItem>
                      {projects.map((project) => <SelectItem key={project.id} value={project.id}><span className="size-2 rounded-sm" style={{ background: project.color }} />{project.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select value={category} onValueChange={(value) => setCategory(value as (typeof IDEA_CATEGORIES)[number])}>
                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>{IDEA_CATEGORIES.map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="hub-idea-quarter">Target horizon</Label>
                  <Input id="hub-idea-quarter" value={targetQuarter} onChange={(event) => setTargetQuarter(event.target.value)} placeholder="Q4 2026 or Someday" />
                </div>
              </div>

              <div className="rounded-xl border bg-gradient-to-br from-violet-500/5 to-sky-500/5 p-4">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Priority score</p>
                    <p className="text-muted-foreground text-xs">Impact × confidence ÷ effort</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-semibold tabular-nums">{score}</p>
                    <p className="text-muted-foreground text-[10px] uppercase tracking-wider">weighted</p>
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-3">
                  <ScoreField label="Impact" value={impact} onChange={setImpact} />
                  <ScoreField label="Confidence" value={confidence} onChange={setConfidence} />
                  <ScoreField label="Effort" value={effort} onChange={setEffort} />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="hub-idea-tags">Tags</Label>
                <Input id="hub-idea-tags" value={tags} onChange={(event) => setTags(event.target.value)} placeholder="AI, Automation, Mobile" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="hub-idea-notes">Markdown notes</Label>
                <MarkdownEditor
                  id="hub-idea-notes"
                  value={notes}
                  onChange={setNotes}
                  placeholder="Drop in research, rough thoughts, links, snippets, or anything else..."
                  minHeight="min-h-72"
                />
                <p className="text-muted-foreground text-xs">Write freely here—these notes never create tasks on their own.</p>
              </div>
            </div>

            <SheetFooter className="mt-0 shrink-0 border-t bg-card px-6 py-4 sm:flex-row sm:items-center">
              {idea ? (
                <Button type="button" variant="ghost" className="text-destructive sm:mr-auto" onClick={() => setDeleteDialogOpen(true)}>
                  <Trash2 className="size-4" /> Delete
                </Button>
              ) : <span className="sm:mr-auto" />}
              {idea && !idea.sourceTask ? (
                <Button type="button" variant="outline" onClick={() => onConvert(idea.id)} disabled={pending}>
                  Convert to task <ArrowRight className="size-4" />
                </Button>
              ) : null}
              <Button type="submit" disabled={pending || !title.trim()}>{pending ? "Saving..." : "Save idea"}</Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>

      {idea ? (
        <ConfirmDeleteDialog
          open={deleteDialogOpen}
          title={`Delete ${idea.identifier}?`}
          description={`“${idea.title}” will be permanently deleted. Any task already created from it will be kept.`}
          onOpenChange={setDeleteDialogOpen}
          onConfirm={() => onDelete(idea.id)}
        />
      ) : null}
    </>
  );
}

function ScoreField({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs"><span>{label}</span><span className="font-semibold tabular-nums">{value}/5</span></div>
      <input type="range" min="1" max="5" value={value} onChange={(event) => onChange(Number(event.target.value))} className="accent-primary w-full" />
    </div>
  );
}
