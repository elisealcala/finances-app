"use client";

import { format } from "date-fns";
import { RefreshCw, Sparkles, Target } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import {
  useCreatePerformanceCycleFromPlan,
  useCreatePerformanceKeyResult,
  useCreatePerformanceOutcome,
  useCreatePerformanceProgressUpdate,
  useDeletePerformanceKeyResult,
  useDeletePerformanceOutcome,
  useGeneratePerformancePlan,
  useUpdatePerformanceCycle,
  useUpdatePerformanceKeyResult,
  useUpdatePerformanceOutcome,
} from "@/hooks/use-performance";
import type {
  PerformanceDashboard,
  GeneratedPerformancePlan,
  PerformanceKeyResult,
  PerformanceOutcome,
} from "@/types/performance";
import type { CareerOutput } from "@/types/career";

type OpenProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function parseLocalDate(value: string): Date {
  return new Date(`${value}T12:00:00`);
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Something went wrong";
}

function rubricToText(rubric: unknown): string {
  if (!Array.isArray(rubric)) return "";
  return rubric
    .map((item) => {
      if (!item || typeof item !== "object") return "";
      const value = item as {
        criterion?: string;
        weight?: number;
        description?: string;
      };
      return `${value.criterion ?? ""} | ${value.weight ?? 0} | ${value.description ?? ""}`;
    })
    .filter(Boolean)
    .join("\n");
}

function parseRubric(value: string) {
  return value
    .split("\n")
    .map((line) => {
      const [criterion, rawWeight, ...description] = line.split("|");
      return {
        criterion: criterion?.trim() ?? "",
        weight: Number(rawWeight?.trim() ?? 0),
        description: description.join("|").trim(),
      };
    })
    .filter(
      (item) => item.criterion && item.description && Number.isFinite(item.weight),
    );
}

function formFieldsToText(configuration: unknown): string {
  if (!configuration || typeof configuration !== "object") return "";
  const fields = (configuration as { fields?: unknown }).fields;
  if (!Array.isArray(fields)) return "";
  return fields
    .map((field) => {
      const value = field as {
        label?: string;
        type?: string;
        required?: boolean;
      };
      return `${value.label ?? ""} | ${value.type ?? "text"} | ${value.required ? "required" : "optional"}`;
    })
    .join("\n");
}

function parseFormFields(value: string) {
  return value
    .split("\n")
    .map((line, index) => {
      const [label, rawType, required] = line.split("|").map((part) => part.trim());
      const type = ["text", "number", "url", "date", "checkbox"].includes(
        rawType,
      )
        ? rawType
        : "text";
      return {
        id: `field-${index + 1}`,
        label,
        type,
        required: required === "required",
      };
    })
    .filter((field) => field.label);
}

function generatedTargetLabel(
  keyResult: GeneratedPerformancePlan["outcomes"][number]["keyResults"][number],
): string {
  if (keyResult.measurementMode === "BOOLEAN") return "Not done → done";
  if (
    keyResult.measurementMode === "MILESTONE" ||
    keyResult.measurementMode === "MANUAL"
  ) {
    return `${keyResult.baseline}% → ${keyResult.target}%`;
  }
  const unit = keyResult.unit ? ` ${keyResult.unit}` : "";
  return `${keyResult.baseline} → ${keyResult.target}${unit}`;
}

export function PerformanceCycleSetup({
  defaultStartDate,
  defaultEndDate,
}: {
  defaultStartDate: string;
  defaultEndDate: string;
}) {
  const [context, setContext] = useState("");
  const [startDate, setStartDate] = useState(defaultStartDate);
  const [endDate, setEndDate] = useState(defaultEndDate);
  const [draft, setDraft] = useState<GeneratedPerformancePlan | null>(null);
  const [desiredResult, setDesiredResult] = useState("");
  const generatePlan = useGeneratePerformancePlan();
  const createCycle = useCreatePerformanceCycleFromPlan();

  async function handleGenerate(event?: React.SyntheticEvent) {
    event?.preventDefault();
    try {
      const plan = await generatePlan.mutateAsync({
        context: context || undefined,
        startDate: parseLocalDate(startDate),
        endDate: parseLocalDate(endDate),
      });
      setDraft(plan);
      setDesiredResult(plan.desiredResult);
      toast.success("Career cycle generated");
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }

  async function handleStartCycle() {
    if (!draft) return;
    try {
      await createCycle.mutateAsync({
        ...draft,
        desiredResult,
        startDate: parseLocalDate(startDate),
        endDate: parseLocalDate(endDate),
      });
      toast.success("Generated performance cycle started");
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }

  function invalidateDraft() {
    if (draft) setDraft(null);
  }

  return (
    <div className="grid gap-6">
      <form onSubmit={handleGenerate} className="grid gap-5">
        <div className="grid gap-2">
          <Label htmlFor="generation-context">Generation brief</Label>
          <Textarea
            id="generation-context"
            value={context}
            onChange={(event) => {
              setContext(event.target.value);
              invalidateDraft();
            }}
            placeholder="Optional: describe the scope, impact, strengths, or gaps this cycle should prioritize."
            className="min-h-28"
          />
          <p className="text-muted-foreground text-xs">
            The brief is sent to OpenAI to generate measurable outcomes and key
            results.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="cycle-start">Start date</Label>
            <Input
              id="cycle-start"
              type="date"
              value={startDate}
              onChange={(event) => {
                setStartDate(event.target.value);
                invalidateDraft();
              }}
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="cycle-end">End date</Label>
            <Input
              id="cycle-end"
              type="date"
              value={endDate}
              onChange={(event) => {
                setEndDate(event.target.value);
                invalidateDraft();
              }}
              required
            />
          </div>
        </div>
        <Button type="submit" disabled={generatePlan.isPending} className="w-fit">
          {generatePlan.isPending ? (
            <>
              <RefreshCw className="size-4 animate-spin" /> Generating cycle...
            </>
          ) : (
            <>
              <Sparkles className="size-4" /> Generate cycle
            </>
          )}
        </Button>
      </form>

      {draft ? (
        <div className="border-primary/20 bg-primary/[0.025] grid gap-5 rounded-2xl border p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Badge className="bg-violet-600 text-white">
                <Sparkles className="size-3" /> AI draft
              </Badge>
              <span className="text-muted-foreground text-xs">
                Review before starting the cycle
              </span>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setDraft(null)}>
              Change brief
            </Button>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="generated-result">Generated cycle result</Label>
            <Textarea
              id="generated-result"
              value={desiredResult}
              onChange={(event) => setDesiredResult(event.target.value)}
              className="min-h-24 bg-card"
            />
          </div>

          <div className="grid gap-3">
            {draft.outcomes.map((outcome, outcomeIndex) => (
              <div
                key={`${outcome.title}-${outcomeIndex}`}
                className="bg-card rounded-xl border p-4"
              >
                <div className="flex items-start gap-3">
                  <div className="bg-primary/10 text-primary mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg">
                    <Target className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-medium">{outcome.title}</h3>
                    <p className="text-muted-foreground mt-1 text-sm leading-6">
                      {outcome.result}
                    </p>
                    <p className="mt-2 text-xs leading-5">
                      <span className="text-muted-foreground">Impact:</span>{" "}
                      {outcome.impact}
                    </p>
                    <div className="mt-3 grid gap-2">
                      {outcome.keyResults.map((keyResult, keyResultIndex) => (
                        <div
                          key={`${keyResult.title}-${keyResultIndex}`}
                          className="bg-muted/50 flex flex-col gap-1 rounded-lg px-3 py-2 text-sm sm:flex-row sm:items-center sm:justify-between"
                        >
                          <span>
                            {keyResult.title}
                            <span className="text-muted-foreground ml-2 text-[10px] uppercase">
                              {keyResult.outputKind.replaceAll("_", " ")} · {Math.round(keyResult.weight)}%
                            </span>
                          </span>
                          <span className="text-muted-foreground shrink-0 text-xs">
                            {generatedTargetLabel(keyResult)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="outline" onClick={handleGenerate} disabled={generatePlan.isPending}>
              <RefreshCw className="size-4" /> Regenerate
            </Button>
            <Button onClick={handleStartCycle} disabled={createCycle.isPending}>
              {createCycle.isPending ? "Creating cycle..." : "Start generated cycle"}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function EditPerformanceCycleDialog({
  cycle,
  open,
  onOpenChange,
}: OpenProps & { cycle: PerformanceDashboard }) {
  const [desiredResult, setDesiredResult] = useState(cycle.desiredResult);
  const [startDate, setStartDate] = useState(
    format(cycle.startDate, "yyyy-MM-dd"),
  );
  const [endDate, setEndDate] = useState(
    format(cycle.endDate, "yyyy-MM-dd"),
  );
  const updateCycle = useUpdatePerformanceCycle();

  /* eslint-disable react-hooks/set-state-in-effect -- reset controlled dialog fields */
  useEffect(() => {
    if (!open) return;
    setDesiredResult(cycle.desiredResult);
    setStartDate(format(cycle.startDate, "yyyy-MM-dd"));
    setEndDate(format(cycle.endDate, "yyyy-MM-dd"));
  }, [cycle, open]);
  /* eslint-enable react-hooks/set-state-in-effect */

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    try {
      await updateCycle.mutateAsync({
        id: cycle.id,
        desiredResult,
        startDate: parseLocalDate(startDate),
        endDate: parseLocalDate(endDate),
      });
      toast.success("Cycle updated");
      onOpenChange(false);
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit} className="grid gap-5">
          <DialogHeader>
            <DialogTitle>Edit performance cycle</DialogTitle>
            <DialogDescription>
              Keep the desired result observable and tied to the deadline.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <Label htmlFor="edit-desired-result">Desired result</Label>
            <Textarea
              id="edit-desired-result"
              value={desiredResult}
              onChange={(event) => setDesiredResult(event.target.value)}
              className="min-h-28"
              required
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="edit-cycle-start">Start</Label>
              <Input
                id="edit-cycle-start"
                type="date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-cycle-end">End</Label>
              <Input
                id="edit-cycle-end"
                type="date"
                value={endDate}
                onChange={(event) => setEndDate(event.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={updateCycle.isPending}>
              {updateCycle.isPending ? "Saving..." : "Save cycle"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function PerformanceOutcomeDialog({
  cycleId,
  outcome,
  open,
  onOpenChange,
}: OpenProps & { cycleId: string; outcome?: PerformanceOutcome }) {
  const [title, setTitle] = useState("");
  const [result, setResult] = useState("");
  const [impact, setImpact] = useState("");
  const [weight, setWeight] = useState("1");
  const [weightRationale, setWeightRationale] = useState("");
  const createOutcome = useCreatePerformanceOutcome();
  const updateOutcome = useUpdatePerformanceOutcome();
  const deleteOutcome = useDeletePerformanceOutcome();

  /* eslint-disable react-hooks/set-state-in-effect -- reset controlled dialog fields */
  useEffect(() => {
    if (!open) return;
    const enrichedOutcome = outcome as
      | (PerformanceOutcome & { weightRationale?: string | null })
      | undefined;
    setTitle(outcome?.title ?? "");
    setResult(outcome?.result ?? "");
    setImpact(outcome?.impact ?? "");
    setWeight(String(outcome?.weight ?? 1));
    setWeightRationale(enrichedOutcome?.weightRationale ?? "");
  }, [open, outcome]);
  /* eslint-enable react-hooks/set-state-in-effect */

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    try {
      const values = {
        title,
        result,
        impact: impact || null,
        weight: Number(weight),
        weightRationale: weightRationale || null,
      };
      if (outcome) {
        await updateOutcome.mutateAsync({ id: outcome.id, ...values });
        toast.success("Outcome updated");
      } else {
        await createOutcome.mutateAsync({ cycleId, ...values });
        toast.success("Outcome added");
      }
      onOpenChange(false);
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }

  async function handleDelete() {
    if (!outcome || !confirm(`Delete “${outcome.title}” and all of its progress?`)) {
      return;
    }
    try {
      await deleteOutcome.mutateAsync({ id: outcome.id });
      toast.success("Outcome deleted");
      onOpenChange(false);
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }

  const pending = createOutcome.isPending || updateOutcome.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit} className="grid gap-5">
          <DialogHeader>
            <DialogTitle>{outcome ? "Edit outcome" : "Add outcome"}</DialogTitle>
            <DialogDescription>
              Write a result that should be observably true by the end of the cycle.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <Label htmlFor="outcome-title">Short name</Label>
            <Input
              id="outcome-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Cross-system impact"
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="outcome-result">Observable result</Label>
            <Textarea
              id="outcome-result"
              value={result}
              onChange={(event) => setResult(event.target.value)}
              placeholder="What will be different when this outcome is achieved?"
              className="min-h-24"
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="outcome-impact">Why it matters</Label>
            <Textarea
              id="outcome-impact"
              value={impact}
              onChange={(event) => setImpact(event.target.value)}
              placeholder="Team, product, customer, or career impact"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="outcome-weight">Relative weight</Label>
            <Input
              id="outcome-weight"
              type="number"
              min="0.01"
              step="0.01"
              value={weight}
              onChange={(event) => setWeight(event.target.value)}
              required
            />
            <p className="text-muted-foreground text-xs">
              Outcomes with equal weights contribute equally to total progress.
            </p>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="outcome-weight-rationale">Why this weight?</Label>
            <Input
              id="outcome-weight-rationale"
              value={weightRationale}
              onChange={(event) => setWeightRationale(event.target.value)}
              placeholder="Higher weight because this is the primary career impact"
            />
          </div>
          <DialogFooter className="sm:justify-between">
            <div>
              {outcome ? (
                <Button type="button" variant="ghost" onClick={handleDelete}>
                  Delete
                </Button>
              ) : null}
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? "Saving..." : outcome ? "Save outcome" : "Add outcome"}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function PerformanceKeyResultDialog({
  outcomeId,
  keyResult,
  open,
  onOpenChange,
}: OpenProps & {
  outcomeId: string;
  keyResult?: PerformanceKeyResult | CareerOutput;
}) {
  const [title, setTitle] = useState("");
  const [measurementMode, setMeasurementMode] =
    useState<PerformanceKeyResult["measurementMode"]>("NUMBER");
  const [baseline, setBaseline] = useState("0");
  const [target, setTarget] = useState("1");
  const [unit, setUnit] = useState("");
  const [weight, setWeight] = useState("1");
  const [weightRationale, setWeightRationale] = useState("");
  const [outputKind, setOutputKind] =
    useState<CareerOutput["outputKind"]>("METRIC");
  const [rubric, setRubric] = useState("");
  const [formFields, setFormFields] = useState("");
  const createKeyResult = useCreatePerformanceKeyResult();
  const updateKeyResult = useUpdatePerformanceKeyResult();
  const deleteKeyResult = useDeletePerformanceKeyResult();

  /* eslint-disable react-hooks/set-state-in-effect -- reset controlled dialog fields */
  useEffect(() => {
    if (!open) return;
    setTitle(keyResult?.title ?? "");
    setMeasurementMode(keyResult?.measurementMode ?? "NUMBER");
    setBaseline(String(keyResult?.baseline ?? 0));
    setTarget(String(keyResult?.target ?? 1));
    setUnit(keyResult?.unit ?? "");
    setWeight(String(keyResult?.weight ?? 1));
    const enriched = keyResult as CareerOutput | undefined;
    setWeightRationale(enriched?.weightRationale ?? "");
    setOutputKind(enriched?.outputKind ?? "METRIC");
    setRubric(rubricToText(enriched?.rubric));
    setFormFields(formFieldsToText(enriched?.configuration));
  }, [keyResult, open]);
  /* eslint-enable react-hooks/set-state-in-effect */

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    try {
      const effectiveMeasurement =
        outputKind === "METRIC"
          ? measurementMode
          : outputKind === "MILESTONE"
            ? "MILESTONE"
            : "MANUAL";
      const usesPercentProgress =
        effectiveMeasurement === "MILESTONE" || effectiveMeasurement === "MANUAL";
      const values = {
        title,
        measurementMode: effectiveMeasurement,
        baseline: usesPercentProgress ? 0 : Number(baseline),
        target:
          effectiveMeasurement === "BOOLEAN"
            ? 1
            : usesPercentProgress
              ? 100
              : Number(target),
        unit:
          usesPercentProgress || effectiveMeasurement === "PERCENTAGE"
            ? unit || "%"
            : unit || null,
        weight: Number(weight),
        weightRationale: weightRationale || null,
        outputKind,
        rubric: parseRubric(rubric),
        configuration:
          outputKind === "FORM" ? { fields: parseFormFields(formFields) } : null,
      };
      if (keyResult) {
        await updateKeyResult.mutateAsync({ id: keyResult.id, ...values });
        toast.success("Key result updated");
      } else {
        await createKeyResult.mutateAsync({ outcomeId, ...values });
        toast.success("Key result added");
      }
      onOpenChange(false);
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }

  async function handleDelete() {
    if (!keyResult || !confirm(`Delete “${keyResult.title}” and its update history?`)) {
      return;
    }
    try {
      await deleteKeyResult.mutateAsync({ id: keyResult.id });
      toast.success("Key result deleted");
      onOpenChange(false);
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }

  const measured =
    outputKind === "METRIC" &&
    (measurementMode === "NUMBER" || measurementMode === "PERCENTAGE");
  const pending = createKeyResult.isPending || updateKeyResult.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit} className="grid gap-5">
          <DialogHeader>
            <DialogTitle>{keyResult ? "Edit key result" : "Add key result"}</DialogTitle>
            <DialogDescription>
              Define how this outcome will be measured.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <Label htmlFor="key-result-title">Key result</Label>
            <Input
              id="key-result-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Lead two adopted architecture reviews"
              required
            />
          </div>
          <div className="grid gap-2">
            <Label>Output type</Label>
            <Select
              value={outputKind}
              onValueChange={(value) =>
                setOutputKind(value as CareerOutput["outputKind"])
              }
            >
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="METRIC">Measured metric</SelectItem>
                <SelectItem value="MILESTONE">Milestone</SelectItem>
                <SelectItem value="FORM">Custom form</SelectItem>
                <SelectItem value="GITHUB_REPOSITORY">GitHub repository</SelectItem>
                <SelectItem value="GITHUB_PULL_REQUEST">GitHub pull request</SelectItem>
                <SelectItem value="LINK">External link</SelectItem>
                <SelectItem value="FILE">File or artifact</SelectItem>
                <SelectItem value="MANUAL">Manual review</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {outputKind === "METRIC" ? (
          <div className="grid gap-2">
            <Label>Measurement</Label>
            <Select
              value={measurementMode}
              onValueChange={(value) =>
                setMeasurementMode(value as PerformanceKeyResult["measurementMode"])
              }
              disabled={Boolean(keyResult?.updates.length)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="NUMBER">Number</SelectItem>
                <SelectItem value="PERCENTAGE">Percentage</SelectItem>
                <SelectItem value="MILESTONE">Milestone progress</SelectItem>
                <SelectItem value="BOOLEAN">Done / not done</SelectItem>
                <SelectItem value="MANUAL">Manual qualitative progress</SelectItem>
              </SelectContent>
            </Select>
            {keyResult?.updates.length ? (
              <p className="text-muted-foreground text-xs">
                Measurement mode is locked after the first progress update.
              </p>
            ) : null}
          </div>
          ) : null}
          {measured ? (
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="grid gap-2">
                <Label htmlFor="key-result-baseline">Baseline</Label>
                <Input
                  id="key-result-baseline"
                  type="number"
                  step="any"
                  value={baseline}
                  onChange={(event) => setBaseline(event.target.value)}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="key-result-target">Target</Label>
                <Input
                  id="key-result-target"
                  type="number"
                  step="any"
                  value={target}
                  onChange={(event) => setTarget(event.target.value)}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="key-result-unit">Unit</Label>
                <Input
                  id="key-result-unit"
                  value={unit}
                  onChange={(event) => setUnit(event.target.value)}
                  placeholder={measurementMode === "PERCENTAGE" ? "%" : "reviews"}
                />
              </div>
            </div>
          ) : null}
          {outputKind === "FORM" ? (
            <div className="grid gap-2">
              <Label htmlFor="output-form-fields">Form fields</Label>
              <Textarea
                id="output-form-fields"
                value={formFields}
                onChange={(event) => setFormFields(event.target.value)}
                placeholder={"Stakeholder rating | number | required\nReview URL | url | optional\nApproved | checkbox | required"}
                className="min-h-28 font-mono text-xs"
              />
              <p className="text-muted-foreground text-xs">One field per line: label | text, number, url, date, or checkbox | required or optional.</p>
            </div>
          ) : null}
          <div className="grid gap-2">
            <Label htmlFor="output-rubric">Evaluation rubric</Label>
            <Textarea
              id="output-rubric"
              value={rubric}
              onChange={(event) => setRubric(event.target.value)}
              placeholder={"Completeness | 40 | Satisfies the requested scope\nQuality | 40 | Clear, maintainable, and fit for purpose\nEvidence | 20 | Claims are directly verifiable"}
              className="min-h-28 font-mono text-xs"
            />
            <p className="text-muted-foreground text-xs">One criterion per line: name | weight | observable description.</p>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="key-result-weight">Relative weight</Label>
            <Input
              id="key-result-weight"
              type="number"
              min="0.01"
              step="0.01"
              value={weight}
              onChange={(event) => setWeight(event.target.value)}
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="key-result-weight-rationale">Why this weight?</Label>
            <Input
              id="key-result-weight-rationale"
              value={weightRationale}
              onChange={(event) => setWeightRationale(event.target.value)}
              placeholder="This output is the strongest proof of the outcome"
            />
          </div>
          <DialogFooter className="sm:justify-between">
            <div>
              {keyResult ? (
                <Button type="button" variant="ghost" onClick={handleDelete}>
                  Delete
                </Button>
              ) : null}
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? "Saving..." : keyResult ? "Save key result" : "Add key result"}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function PerformanceProgressDialog({
  keyResult,
  open,
  onOpenChange,
}: OpenProps & { keyResult: PerformanceKeyResult }) {
  const [recordedAt, setRecordedAt] = useState(format(new Date(), "yyyy-MM-dd"));
  const [value, setValue] = useState("");
  const [progressPercent, setProgressPercent] = useState("");
  const [confidence, setConfidence] =
    useState<"LOW" | "MEDIUM" | "HIGH">("MEDIUM");
  const [summary, setSummary] = useState("");
  const [blocker, setBlocker] = useState("");
  const [nextAction, setNextAction] = useState("");
  const [evidenceLabel, setEvidenceLabel] = useState("");
  const [evidenceUrl, setEvidenceUrl] = useState("");
  const createUpdate = useCreatePerformanceProgressUpdate();

  const usesMeasuredValue =
    keyResult.measurementMode === "NUMBER" ||
    keyResult.measurementMode === "PERCENTAGE" ||
    keyResult.measurementMode === "BOOLEAN";

  /* eslint-disable react-hooks/set-state-in-effect -- reset controlled dialog fields */
  useEffect(() => {
    if (!open) return;
    setRecordedAt(format(new Date(), "yyyy-MM-dd"));
    setValue(String(keyResult.currentValue));
    setProgressPercent(String(Math.round(keyResult.progress)));
    setConfidence(keyResult.latestUpdate?.confidence ?? "MEDIUM");
    setSummary("");
    setBlocker(keyResult.latestUpdate?.blocker ?? "");
    setNextAction(keyResult.latestUpdate?.nextAction ?? "");
    setEvidenceLabel("");
    setEvidenceUrl("");
  }, [keyResult, open]);
  /* eslint-enable react-hooks/set-state-in-effect */

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    try {
      await createUpdate.mutateAsync({
        keyResultId: keyResult.id,
        recordedAt: parseLocalDate(recordedAt),
        value: usesMeasuredValue ? Number(value) : null,
        progressPercent: usesMeasuredValue ? null : Number(progressPercent),
        confidence,
        summary,
        blocker: blocker || null,
        nextAction: nextAction || null,
        evidenceLabel: evidenceLabel || null,
        evidenceUrl: evidenceUrl || null,
      });
      toast.success("Progress updated");
      onOpenChange(false);
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="md:max-w-2xl">
        <form onSubmit={handleSubmit} className="grid gap-5">
          <DialogHeader>
            <DialogTitle>Update progress</DialogTitle>
            <DialogDescription>{keyResult.title}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="progress-date">Update date</Label>
              <Input
                id="progress-date"
                type="date"
                value={recordedAt}
                onChange={(event) => setRecordedAt(event.target.value)}
                required
              />
            </div>
            {keyResult.measurementMode === "BOOLEAN" ? (
              <div className="grid gap-2">
                <Label>Current state</Label>
                <Select value={value} onValueChange={setValue}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Not complete</SelectItem>
                    <SelectItem value="1">Complete</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            ) : usesMeasuredValue ? (
              <div className="grid gap-2">
                <Label htmlFor="progress-value">Current value</Label>
                <Input
                  id="progress-value"
                  type="number"
                  step="any"
                  value={value}
                  onChange={(event) => setValue(event.target.value)}
                  required
                />
              </div>
            ) : (
              <div className="grid gap-2">
                <Label htmlFor="progress-percent">Progress</Label>
                <div className="relative">
                  <Input
                    id="progress-percent"
                    type="number"
                    min="0"
                    max="100"
                    value={progressPercent}
                    onChange={(event) => setProgressPercent(event.target.value)}
                    className="pr-8"
                    required
                  />
                  <span className="text-muted-foreground absolute top-2 right-3 text-sm">%</span>
                </div>
              </div>
            )}
          </div>
          <div className="grid gap-2">
            <Label>Confidence</Label>
            <Select
              value={confidence}
              onValueChange={(next) => setConfidence(next as typeof confidence)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="HIGH">High — directly measured</SelectItem>
                <SelectItem value="MEDIUM">Medium — good signal</SelectItem>
                <SelectItem value="LOW">Low — estimate or incomplete evidence</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="progress-summary">What changed?</Label>
            <Textarea
              id="progress-summary"
              value={summary}
              onChange={(event) => setSummary(event.target.value)}
              placeholder="Describe the result or learning behind this update."
              required
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="progress-blocker">Blocker</Label>
              <Textarea
                id="progress-blocker"
                value={blocker}
                onChange={(event) => setBlocker(event.target.value)}
                placeholder="What could stop the outcome?"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="progress-next-action">Next action</Label>
              <Textarea
                id="progress-next-action"
                value={nextAction}
                onChange={(event) => setNextAction(event.target.value)}
                placeholder="The next concrete move"
              />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="evidence-label">Evidence label</Label>
              <Input
                id="evidence-label"
                value={evidenceLabel}
                onChange={(event) => setEvidenceLabel(event.target.value)}
                placeholder="RFC, PR, dashboard..."
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="evidence-url">Evidence URL</Label>
              <Input
                id="evidence-url"
                type="url"
                value={evidenceUrl}
                onChange={(event) => setEvidenceUrl(event.target.value)}
                placeholder="https://..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createUpdate.isPending}>
              {createUpdate.isPending ? "Saving..." : "Save progress update"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
