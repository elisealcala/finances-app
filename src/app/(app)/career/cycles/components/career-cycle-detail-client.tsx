"use client";

import { format } from "date-fns";
import {
  Archive,
  ArrowLeft,
  Check,
  CheckCircle2,
  ExternalLink,
  Github,
  Pencil,
  Play,
  Plus,
  RotateCcw,
  Send,
  Sparkles,
  Target,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader, PageSection, PageShell } from "@/components/page";
import {
  useAcceptCareerEvaluation,
  useCareerCycle,
  useCreateGithubRepository,
  useGradeCareerOutput,
  useSubmitCareerOutput,
  useTransitionCareerCycle,
} from "@/hooks/use-career";
import {
  PerformanceKeyResultDialog,
  PerformanceOutcomeDialog,
  PerformanceProgressDialog,
} from "@/app/(app)/performance/components/performance-form-dialogs";
import { PerformanceHealthBadge } from "@/app/(app)/performance/components/performance-outcome-card";
import type {
  CareerCycle,
  CareerEvaluation,
  CareerOutput,
  CareerOutcome,
} from "@/types/career";

type FormField = {
  id: string;
  label: string;
  type: "text" | "number" | "url" | "date" | "checkbox";
  required?: boolean;
};

function configuredFields(configuration: unknown): FormField[] {
  if (!configuration || typeof configuration !== "object") return [];
  const fields = (configuration as { fields?: unknown }).fields;
  if (!Array.isArray(fields)) return [];
  return fields.filter(
    (field): field is FormField =>
      Boolean(
        field &&
          typeof field === "object" &&
          typeof (field as FormField).id === "string" &&
          typeof (field as FormField).label === "string",
      ),
  );
}

function ProgressTimeline({ cycle }: { cycle: CareerCycle }) {
  const points = useMemo(() => {
    const existing = cycle.snapshots.map((snapshot) => ({
      progress: snapshot.progress,
      expected: snapshot.expectedProgress,
      date: snapshot.recordedAt,
    }));
    return [
      ...existing,
      {
        progress: cycle.progress,
        expected: cycle.expectedProgress,
        date: new Date(),
      },
    ].slice(-12);
  }, [cycle]);
  const width = 600;
  const height = 170;
  const x = (index: number) =>
    points.length === 1 ? 0 : (index / (points.length - 1)) * width;
  const y = (value: number) => height - (Math.max(0, Math.min(100, value)) / 100) * height;
  const actual = points.map((point, index) => `${x(index)},${y(point.progress)}`).join(" ");
  const expected = points.map((point, index) => `${x(index)},${y(point.expected)}`).join(" ");

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-4 text-xs">
        <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-indigo-500" />Actual</span>
        <span className="text-muted-foreground flex items-center gap-1.5"><span className="size-2 rounded-full bg-slate-400" />Expected</span>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="h-44 w-full overflow-visible" role="img" aria-label="Cycle progress over time">
        {[0, 25, 50, 75, 100].map((tick) => (
          <line key={tick} x1="0" x2={width} y1={y(tick)} y2={y(tick)} className="stroke-border" strokeWidth="1" />
        ))}
        <polyline points={expected} fill="none" className="stroke-slate-400" strokeWidth="2" strokeDasharray="6 6" />
        <polyline points={actual} fill="none" className="stroke-indigo-500" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        {points.map((point, index) => (
          <circle key={`${point.date.toString()}-${index}`} cx={x(index)} cy={y(point.progress)} r="4" className="fill-indigo-500" />
        ))}
      </svg>
    </div>
  );
}

function EvaluationCard({ evaluation }: { evaluation: CareerEvaluation }) {
  const accept = useAcceptCareerEvaluation();

  async function handleAccept() {
    try {
      await accept.mutateAsync({ id: evaluation.id });
      toast.success("Evaluation accepted and progress updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not accept evaluation");
    }
  }

  return (
    <div className="rounded-xl border border-violet-500/20 bg-violet-500/[0.05] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 text-violet-600" />
            <span className="font-semibold">{Math.round(evaluation.score)}%</span>
            {evaluation.grade ? <Badge variant="secondary">{evaluation.grade}</Badge> : null}
            <Badge variant="outline">{evaluation.status.toLowerCase()}</Badge>
          </div>
          <p className="text-muted-foreground mt-2 text-sm leading-6">{evaluation.summary}</p>
        </div>
        {evaluation.status === "DRAFT" ? (
          <Button size="sm" onClick={handleAccept} disabled={accept.isPending}>
            <Check className="size-4" /> Accept score
          </Button>
        ) : null}
      </div>
      {evaluation.improvements.length ? (
        <div className="mt-3">
          <p className="text-xs font-medium uppercase tracking-wide">Next improvements</p>
          <ul className="text-muted-foreground mt-1 list-disc space-y-1 pl-5 text-sm">
            {evaluation.improvements.slice(0, 3).map((item) => <li key={item}>{item}</li>)}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function EvidenceDialog({
  output,
  open,
  onOpenChange,
}: {
  output: CareerOutput;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [label, setLabel] = useState("");
  const [url, setUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const [repositoryName, setRepositoryName] = useState("");
  const submit = useSubmitCareerOutput();
  const grade = useGradeCareerOutput();
  const createRepository = useCreateGithubRepository();
  const fields = configuredFields(output.configuration);
  const github = ["GITHUB_REPOSITORY", "GITHUB_PULL_REQUEST"].includes(output.outputKind);

  async function handleCreateRepository() {
    try {
      const repository = await createRepository.mutateAsync({
        name: repositoryName,
        description: output.title,
        isPrivate: true,
      });
      setUrl(repository.html_url);
      setLabel(repository.full_name);
      toast.success("GitHub repository created");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create repository");
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    try {
      const submission = await submit.mutateAsync({
        keyResultId: output.id,
        kind: output.outputKind,
        label: label || null,
        url: url || null,
        notes: notes || null,
        data: formData,
      });
      toast.success("Evidence submitted");
      onOpenChange(false);
      if (output.rubric) {
        await grade.mutateAsync({ id: submission.id });
        toast.success("AI evaluation ready for review");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not submit evidence");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <form onSubmit={handleSubmit} className="grid gap-5">
          <DialogHeader>
            <DialogTitle>Submit evidence</DialogTitle>
            <DialogDescription>
              Evidence is frozen into a submission before any AI evaluation is accepted.
            </DialogDescription>
          </DialogHeader>
          {github ? (
            <div className="bg-muted/40 grid gap-3 rounded-xl border p-4">
              <div className="flex items-center gap-2 font-medium"><Github className="size-4" /> GitHub project</div>
              <div className="flex gap-2">
                <Input value={repositoryName} onChange={(event) => setRepositoryName(event.target.value)} placeholder="new-repository-name" />
                <Button type="button" variant="outline" onClick={handleCreateRepository} disabled={!repositoryName || createRepository.isPending}>
                  Create
                </Button>
              </div>
              <p className="text-muted-foreground text-xs">Or attach an existing repository or pull request below.</p>
            </div>
          ) : null}
          <div className="grid gap-2">
            <Label htmlFor={`evidence-label-${output.id}`}>Label</Label>
            <Input id={`evidence-label-${output.id}`} value={label} onChange={(event) => setLabel(event.target.value)} placeholder="Project, review, or artifact name" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor={`evidence-url-${output.id}`}>Evidence URL</Label>
            <Input id={`evidence-url-${output.id}`} type="url" value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://github.com/…" />
          </div>
          {fields.map((field) => (
            <div key={field.id} className="grid gap-2">
              <Label htmlFor={`field-${field.id}`}>{field.label}</Label>
              {field.type === "checkbox" ? (
                <input id={`field-${field.id}`} type="checkbox" checked={Boolean(formData[field.id])} onChange={(event) => setFormData((current) => ({ ...current, [field.id]: event.target.checked }))} className="size-4" />
              ) : (
                <Input id={`field-${field.id}`} type={field.type} required={field.required} value={String(formData[field.id] ?? "")} onChange={(event) => setFormData((current) => ({ ...current, [field.id]: field.type === "number" ? Number(event.target.value) : event.target.value }))} />
              )}
            </div>
          ))}
          <div className="grid gap-2">
            <Label htmlFor={`evidence-notes-${output.id}`}>Context and reflection</Label>
            <Textarea id={`evidence-notes-${output.id}`} value={notes} onChange={(event) => setNotes(event.target.value)} className="min-h-28" placeholder="What changed, what was difficult, and what should the evaluator pay attention to?" />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={submit.isPending || grade.isPending}>
              <Send className="size-4" /> {submit.isPending ? "Submitting…" : grade.isPending ? "Evaluating…" : "Submit evidence"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function CareerOutputCard({ output, outcomeId }: { output: CareerOutput; outcomeId: string }) {
  const [editOpen, setEditOpen] = useState(false);
  const [progressOpen, setProgressOpen] = useState(false);
  const [evidenceOpen, setEvidenceOpen] = useState(false);
  const grade = useGradeCareerOutput();

  async function handleGrade(submissionId: string) {
    try {
      await grade.mutateAsync({ id: submissionId });
      toast.success("AI evaluation ready for review");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not grade evidence");
    }
  }

  return (
    <div className="rounded-xl border p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="font-medium">{output.title}</h4>
            <Badge variant="secondary">{output.outputKind.toLowerCase().replaceAll("_", " ")}</Badge>
            <PerformanceHealthBadge health={output.health} />
            <Badge variant="outline">{Math.round(output.weight)}% weight</Badge>
          </div>
          {output.weightRationale ? <p className="text-muted-foreground text-xs">{output.weightRationale}</p> : null}
          <div className="flex items-center gap-3">
            <Progress value={output.progress} className="flex-1" />
            <span className="text-sm font-semibold">{Math.round(output.progress)}%</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => setEditOpen(true)}><Pencil className="size-3.5" /> Edit</Button>
          <Button size="sm" variant="outline" onClick={() => setProgressOpen(true)}><TrendingUp className="size-3.5" /> Manual update</Button>
          <Button size="sm" onClick={() => setEvidenceOpen(true)}><Send className="size-3.5" /> Evidence</Button>
        </div>
      </div>
      {output.rubric && Array.isArray(output.rubric) ? (
        <details className="mt-4 text-sm">
          <summary className="text-muted-foreground cursor-pointer font-medium">Evaluation rubric</summary>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {(output.rubric as Array<{ criterion: string; description: string; weight: number }>).map((item) => (
              <div key={item.criterion} className="bg-muted/40 rounded-lg p-3">
                <p className="font-medium">{item.criterion} · {item.weight}%</p>
                <p className="text-muted-foreground mt-1 text-xs leading-5">{item.description}</p>
              </div>
            ))}
          </div>
        </details>
      ) : null}
      {output.submissions.length ? (
        <div className="mt-4 grid gap-3 border-t pt-4">
          {output.submissions.map((submission) => (
            <div key={submission.id} className="space-y-3 rounded-xl bg-muted/25 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-medium">{submission.label || "Evidence submission"}</p>
                  <p className="text-muted-foreground text-xs">{format(submission.submittedAt, "MMM d, yyyy · h:mm a")}</p>
                </div>
                <div className="flex gap-2">
                  {submission.url ? <Button asChild size="sm" variant="ghost"><a href={submission.url} target="_blank" rel="noreferrer">Open <ExternalLink className="size-3.5" /></a></Button> : null}
                  {!submission.evaluations.length ? <Button size="sm" variant="outline" onClick={() => handleGrade(submission.id)} disabled={grade.isPending}><Sparkles className="size-3.5" /> Grade</Button> : null}
                </div>
              </div>
              {submission.notes ? <p className="text-muted-foreground text-sm leading-6">{submission.notes}</p> : null}
              {submission.evaluations.map((evaluation) => <EvaluationCard key={evaluation.id} evaluation={evaluation} />)}
            </div>
          ))}
        </div>
      ) : null}
      <PerformanceKeyResultDialog outcomeId={outcomeId} keyResult={output} open={editOpen} onOpenChange={setEditOpen} />
      <PerformanceProgressDialog keyResult={output} open={progressOpen} onOpenChange={setProgressOpen} />
      <EvidenceDialog output={output} open={evidenceOpen} onOpenChange={setEvidenceOpen} />
    </div>
  );
}

function CareerOutcomeCard({ cycleId, outcome }: { cycleId: string; outcome: CareerOutcome }) {
  const [editOpen, setEditOpen] = useState(false);
  const [outputOpen, setOutputOpen] = useState(false);
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle className="text-lg">{outcome.title}</CardTitle>
              <PerformanceHealthBadge health={outcome.health} />
              <Badge variant="outline">{Math.round(outcome.weight)}% weight</Badge>
            </div>
            <p className="text-muted-foreground text-sm leading-6">{outcome.result}</p>
            {outcome.impact ? <p className="text-sm"><span className="text-muted-foreground">Impact:</span> {outcome.impact}</p> : null}
            {outcome.weightRationale ? <p className="text-muted-foreground text-xs">{outcome.weightRationale}</p> : null}
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setEditOpen(true)}><Pencil className="size-3.5" /> Edit</Button>
            <Button size="sm" onClick={() => setOutputOpen(true)}><Plus className="size-3.5" /> Output</Button>
          </div>
        </div>
        <div className="flex items-center gap-3 pt-2"><Progress value={outcome.progress} className="flex-1" /><span className="text-sm font-semibold">{Math.round(outcome.progress)}%</span></div>
      </CardHeader>
      <CardContent className="grid gap-3">
        {outcome.keyResults.map((output) => <CareerOutputCard key={output.id} output={output} outcomeId={outcome.id} />)}
        {!outcome.keyResults.length ? <div className="rounded-xl border border-dashed py-8 text-center"><p className="text-sm font-medium">Add the first measurable output</p></div> : null}
      </CardContent>
      <PerformanceOutcomeDialog cycleId={cycleId} outcome={outcome} open={editOpen} onOpenChange={setEditOpen} />
      <PerformanceKeyResultDialog outcomeId={outcome.id} open={outputOpen} onOpenChange={setOutputOpen} />
    </Card>
  );
}

export function CareerCycleDetailClient({ id }: { id: string }) {
  const cycleQuery = useCareerCycle(id);
  const transition = useTransitionCareerCycle();
  const [outcomeOpen, setOutcomeOpen] = useState(false);
  const cycle = cycleQuery.data;

  async function changeStatus(status: "ACTIVE" | "COMPLETED" | "ARCHIVED") {
    try {
      await transition.mutateAsync({ id, status });
      toast.success(`Cycle marked ${status.toLowerCase()}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update cycle");
    }
  }

  if (!cycle) return <PageShell><p className="text-muted-foreground text-sm">Loading cycle…</p></PageShell>;

  return (
    <PageShell>
      <Button asChild variant="ghost" size="sm" className="w-fit"><Link href="/career/cycles"><ArrowLeft className="size-4" /> All cycles</Link></Button>
      <PageHeader
        title={cycle.title || "Career cycle"}
        description={`${format(cycle.startDate, "MMM d, yyyy")} – ${format(cycle.endDate, "MMM d, yyyy")}`}
        actions={
          <>
            {["DRAFT", "UPCOMING"].includes(cycle.status) ? <Button onClick={() => changeStatus("ACTIVE")} disabled={transition.isPending}><Play className="size-4" /> Activate</Button> : null}
            {cycle.status === "ACTIVE" ? <Button onClick={() => changeStatus("COMPLETED")} disabled={transition.isPending}><CheckCircle2 className="size-4" /> Complete</Button> : null}
            {cycle.status !== "ARCHIVED" ? <Button variant="outline" onClick={() => changeStatus("ARCHIVED")} disabled={transition.isPending}><Archive className="size-4" /> Archive</Button> : null}
            {cycle.status === "ARCHIVED" ? <Button variant="outline" onClick={() => changeStatus("COMPLETED")} disabled={transition.isPending}><RotateCcw className="size-4" /> Restore</Button> : null}
          </>
        }
      />

      <Card>
        <CardContent className="grid gap-8 p-6 lg:grid-cols-[1fr_420px]">
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              <Badge>{cycle.status.toLowerCase()}</Badge>
              <PerformanceHealthBadge health={cycle.health} />
            </div>
            <div>
              <p className="text-muted-foreground text-xs font-medium uppercase tracking-[0.14em]">Desired result</p>
              <h2 className="mt-2 text-xl font-semibold leading-8">{cycle.desiredResult}</h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div><p className="text-muted-foreground text-xs">Actual</p><p className="text-2xl font-semibold">{Math.round(cycle.progress)}%</p></div>
              <div><p className="text-muted-foreground text-xs">Expected</p><p className="text-2xl font-semibold">{Math.round(cycle.expectedProgress)}%</p></div>
              <div><p className="text-muted-foreground text-xs">Days left</p><p className="text-2xl font-semibold">{cycle.daysRemaining}</p></div>
            </div>
          </div>
          <ProgressTimeline cycle={cycle} />
        </CardContent>
      </Card>

      <PageSection>
        <div className="flex items-center justify-between gap-4">
          <div><h2 className="text-lg font-semibold">Outcomes and outputs</h2><p className="text-muted-foreground text-sm">Submit evidence, review AI scores, and keep manual control over progress.</p></div>
          <Button onClick={() => setOutcomeOpen(true)}><Plus className="size-4" /> Outcome</Button>
        </div>
        <div className="grid gap-4">
          {cycle.outcomes.map((outcome) => <CareerOutcomeCard key={outcome.id} cycleId={cycle.id} outcome={outcome} />)}
          {!cycle.outcomes.length ? <Card><CardContent className="flex flex-col items-center gap-3 py-12 text-center"><Target className="text-muted-foreground size-8" /><p className="font-medium">Define the first outcome</p><Button onClick={() => setOutcomeOpen(true)}>Add outcome</Button></CardContent></Card> : null}
        </div>
      </PageSection>
      <PerformanceOutcomeDialog cycleId={cycle.id} open={outcomeOpen} onOpenChange={setOutcomeOpen} />
    </PageShell>
  );
}
