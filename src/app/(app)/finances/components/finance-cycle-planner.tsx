"use client";

import { useMemo, useState, type FormEvent } from "react";
import { format, parseISO } from "date-fns";
import {
  Archive,
  ArrowRight,
  CalendarRange,
  CheckCircle2,
  Clock3,
  Loader2,
  Pencil,
  Plus,
  ReceiptText,
  Save,
  Sparkles,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  useCloseFinanceCycle,
  useCreateFinanceCycle,
  useFinanceCycleDefaults,
  useFinanceCycles,
  useUpdateFinanceCycle,
} from "@/hooks/use-finance-cycles";
import { useStatements } from "@/hooks/use-statements";
import {
  FINANCE_CURRENCIES,
  calculateFinanceForecast,
  convertFinanceCurrency,
  deriveFinanceCycleEndDate,
  type FinanceCurrency,
  type FinanceCycleForecastInput,
  type FinanceCycleKind,
  type FinanceGoalPriority,
  type FinanceGoalStatus,
  type FinanceScenario,
  type FinanceStatementPaymentInput,
} from "@/lib/finance-cycle";
import { CURRENCY_LABELS, cn, formatCurrency } from "@/lib/utils";
import { FinanceCycleChart } from "./finance-cycle-chart";

type GoalForm = {
  key: string;
  name: string;
  amount: number;
  currency: FinanceCurrency;
  priority: FinanceGoalPriority;
  status: FinanceGoalStatus;
};

type CycleForm = {
  title: string;
  kind: FinanceCycleKind;
  status: "DRAFT" | "ACTIVE" | "CLOSED" | "ARCHIVED";
  startDate: string;
  endDate: string;
  displayCurrency: FinanceCurrency;
  openingAmount: number;
  openingCurrency: FinanceCurrency;
  monthlyIncome: number;
  incomeCurrency: FinanceCurrency;
  incomeDayOfMonth: number;
  monthlyHousehold: number;
  householdCurrency: FinanceCurrency;
  householdDayOfMonth: number;
  monthlyFlexible: number;
  flexibleCurrency: FinanceCurrency;
  flexibleDayOfMonth: number;
  monthlyDebt: number;
  debtCurrency: FinanceCurrency;
  debtDayOfMonth: number;
  emergencyFloor: number;
  emergencyCurrency: FinanceCurrency;
  incomeVariance: number;
  penPerUsd: number;
  usdPerEur: number;
  carryPrevious: boolean;
  previousCycleId: string | null;
  goals: GoalForm[];
};

type PersistedGoal = {
  id: string;
  name: string;
  amount: number;
  currency: FinanceCurrency;
  priority: FinanceGoalPriority;
  status: FinanceGoalStatus;
};

type PersistedCycle = Omit<CycleForm, "startDate" | "endDate" | "goals"> & {
  id: string;
  startDate: Date;
  endDate: Date;
  closingAmount: number | null;
  closingCurrency: FinanceCurrency | null;
  goals: PersistedGoal[];
};

type FinanceCycleDefaults = NonNullable<
  ReturnType<typeof useFinanceCycleDefaults>["data"]
>;

type StatementPaymentRow = {
  id: string;
  month: number;
  year: number;
  status: "OPEN" | "CLOSED" | "PAID";
  paymentDueDate: Date;
  account: { name: string; currency: string };
  outstandingByCurrency: Record<string, number>;
};

const CYCLE_LABELS: Record<FinanceCycleKind, string> = {
  WEEK: "Week",
  THREE_MONTHS: "3 months",
  SIX_MONTHS: "6 months",
  CUSTOM: "Custom",
};

const PRIORITY_LABELS: Record<FinanceGoalPriority, string> = {
  HIGH: "High",
  MEDIUM: "Medium",
  LOW: "Low",
};

const CYCLE_STATUS_CONFIG: Record<
  CycleForm["status"],
  {
    label: string;
    icon: typeof Sparkles;
    className: string;
  }
> = {
  ACTIVE: {
    label: "Active",
    icon: Sparkles,
    className: "bg-emerald-600 text-white",
  },
  DRAFT: {
    label: "Draft",
    icon: Clock3,
    className: "bg-slate-500 text-white",
  },
  CLOSED: {
    label: "Closed",
    icon: CheckCircle2,
    className: "bg-sky-700 text-white",
  },
  ARCHIVED: {
    label: "Archived",
    icon: Archive,
    className: "",
  },
};

function dateInput(date: Date) {
  return format(date, "yyyy-MM-dd");
}

function dateFromInput(value: string) {
  const parsed = parseISO(value);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

function roundMoney(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function validDayOfMonth(value: number | undefined) {
  if (!Number.isFinite(value)) return 1;
  return Math.min(31, Math.max(1, Math.trunc(value ?? 1)));
}

function cycleTitle(kind: FinanceCycleKind, startDate: Date) {
  return `${CYCLE_LABELS[kind]} plan · ${format(startDate, "MMM yyyy")}`;
}

function emptyCycleForm(now = new Date()): CycleForm {
  const kind: FinanceCycleKind = "THREE_MONTHS";
  return {
    title: cycleTitle(kind, now),
    kind,
    status: "ACTIVE",
    startDate: dateInput(now),
    endDate: dateInput(deriveFinanceCycleEndDate(now, kind)),
    displayCurrency: "PEN",
    openingAmount: 0,
    openingCurrency: "PEN",
    monthlyIncome: 0,
    incomeCurrency: "PEN",
    incomeDayOfMonth: 1,
    monthlyHousehold: 0,
    householdCurrency: "PEN",
    householdDayOfMonth: 1,
    monthlyFlexible: 0,
    flexibleCurrency: "PEN",
    flexibleDayOfMonth: 1,
    monthlyDebt: 0,
    debtCurrency: "PEN",
    debtDayOfMonth: 1,
    emergencyFloor: 0,
    emergencyCurrency: "PEN",
    incomeVariance: 10,
    penPerUsd: 3.72,
    usdPerEur: 1.15,
    carryPrevious: true,
    previousCycleId: null,
    goals: [],
  };
}

function formFromCycle(cycle: PersistedCycle): CycleForm {
  return {
    title: cycle.title,
    kind: cycle.kind,
    status: cycle.status,
    startDate: dateInput(cycle.startDate),
    endDate: dateInput(cycle.endDate),
    displayCurrency: cycle.displayCurrency,
    openingAmount: roundMoney(cycle.openingAmount),
    openingCurrency: cycle.openingCurrency,
    monthlyIncome: roundMoney(cycle.monthlyIncome),
    incomeCurrency: cycle.incomeCurrency,
    incomeDayOfMonth: validDayOfMonth(cycle.incomeDayOfMonth),
    monthlyHousehold: roundMoney(cycle.monthlyHousehold),
    householdCurrency: cycle.householdCurrency,
    householdDayOfMonth: validDayOfMonth(cycle.householdDayOfMonth),
    monthlyFlexible: roundMoney(cycle.monthlyFlexible),
    flexibleCurrency: cycle.flexibleCurrency,
    flexibleDayOfMonth: validDayOfMonth(cycle.flexibleDayOfMonth),
    monthlyDebt: roundMoney(cycle.monthlyDebt),
    debtCurrency: cycle.debtCurrency,
    debtDayOfMonth: validDayOfMonth(cycle.debtDayOfMonth),
    emergencyFloor: roundMoney(cycle.emergencyFloor),
    emergencyCurrency: cycle.emergencyCurrency,
    incomeVariance: cycle.incomeVariance,
    penPerUsd: cycle.penPerUsd,
    usdPerEur: cycle.usdPerEur,
    carryPrevious: cycle.carryPrevious,
    previousCycleId: cycle.previousCycleId,
    goals: cycle.goals.map((goal) => ({
      ...goal,
      amount: roundMoney(goal.amount),
      key: goal.id,
    })),
  };
}

function forecastInput(
  form: CycleForm,
  statementPayments: FinanceStatementPaymentInput[] = [],
): FinanceCycleForecastInput {
  return {
    kind: form.kind,
    startDate: dateFromInput(form.startDate),
    endDate: dateFromInput(form.endDate),
    displayCurrency: form.displayCurrency,
    openingAmount: roundMoney(form.openingAmount),
    openingCurrency: form.openingCurrency,
    monthlyIncome: roundMoney(form.monthlyIncome),
    incomeCurrency: form.incomeCurrency,
    incomeDayOfMonth: form.incomeDayOfMonth,
    monthlyHousehold: roundMoney(form.monthlyHousehold),
    householdCurrency: form.householdCurrency,
    householdDayOfMonth: form.householdDayOfMonth,
    monthlyFlexible: roundMoney(form.monthlyFlexible),
    flexibleCurrency: form.flexibleCurrency,
    flexibleDayOfMonth: form.flexibleDayOfMonth,
    monthlyDebt: roundMoney(form.monthlyDebt),
    debtCurrency: form.debtCurrency,
    debtDayOfMonth: form.debtDayOfMonth,
    emergencyFloor: roundMoney(form.emergencyFloor),
    emergencyCurrency: form.emergencyCurrency,
    incomeVariance: form.incomeVariance,
    penPerUsd: form.penPerUsd,
    usdPerEur: form.usdPerEur,
    goals: form.goals
      .filter((goal) => goal.name.trim().length > 0 && goal.amount > 0)
      .map((goal, position) => ({
        id: goal.key,
        name: goal.name,
        amount: roundMoney(goal.amount),
        currency: goal.currency,
        priority: goal.priority,
        status: goal.status,
        position,
      })),
    statementPayments,
  };
}

function statementPaymentsFromRows(
  statements: StatementPaymentRow[],
): FinanceStatementPaymentInput[] {
  return statements.flatMap((statement) => {
    if (statement.status === "PAID") return [];

    const amounts = FINANCE_CURRENCIES.flatMap((currency) => {
      const amount = statement.outstandingByCurrency[currency] ?? 0;
      return amount > 0 ? [{ amount, currency }] : [];
    });
    if (amounts.length === 0) return [];

    return [
      {
        id: statement.id,
        label: `${statement.account.name} · ${format(
          new Date(statement.year, statement.month - 1, 1),
          "MMM yyyy",
        )}`,
        dueDate: new Date(statement.paymentDueDate),
        amounts,
      },
    ];
  });
}

function paymentsInsideCycle(
  payments: FinanceStatementPaymentInput[],
  form: CycleForm,
) {
  const start = dateFromInput(form.startDate).getTime();
  const end = dateFromInput(form.endDate).getTime();
  return payments.filter((payment) => {
    const dueDate = new Date(payment.dueDate).getTime();
    return dueDate >= start && dueDate <= end;
  });
}

function mutationInput(form: CycleForm) {
  return {
    title: form.title,
    kind: form.kind,
    status: form.status,
    startDate: dateFromInput(form.startDate),
    endDate: dateFromInput(form.endDate),
    displayCurrency: form.displayCurrency,
    openingAmount: roundMoney(form.openingAmount),
    openingCurrency: form.openingCurrency,
    monthlyIncome: roundMoney(form.monthlyIncome),
    incomeCurrency: form.incomeCurrency,
    incomeDayOfMonth: form.incomeDayOfMonth,
    monthlyHousehold: roundMoney(form.monthlyHousehold),
    householdCurrency: form.householdCurrency,
    householdDayOfMonth: form.householdDayOfMonth,
    monthlyFlexible: roundMoney(form.monthlyFlexible),
    flexibleCurrency: form.flexibleCurrency,
    flexibleDayOfMonth: form.flexibleDayOfMonth,
    monthlyDebt: roundMoney(form.monthlyDebt),
    debtCurrency: form.debtCurrency,
    debtDayOfMonth: form.debtDayOfMonth,
    emergencyFloor: roundMoney(form.emergencyFloor),
    emergencyCurrency: form.emergencyCurrency,
    incomeVariance: form.incomeVariance,
    penPerUsd: form.penPerUsd,
    usdPerEur: form.usdPerEur,
    carryPrevious: form.carryPrevious,
    previousCycleId: form.previousCycleId,
    goals: form.goals.map((goal, position) => ({
      name: goal.name,
      amount: roundMoney(goal.amount),
      currency: goal.currency,
      priority: goal.priority,
      status: goal.status,
      position,
    })),
  };
}

function sumBuckets(
  buckets: Record<FinanceCurrency, number>,
  to: FinanceCurrency,
  penPerUsd: number,
  usdPerEur: number,
) {
  const total = FINANCE_CURRENCIES.reduce(
    (sum, currency) =>
      sum +
      convertFinanceCurrency(buckets[currency] ?? 0, currency, to, {
        penPerUsd,
        usdPerEur,
      }),
    0,
  );
  return roundMoney(total);
}

function initialCycleForm(
  cycles: PersistedCycle[],
  defaults?: FinanceCycleDefaults,
) {
  if (cycles.length > 0) return formFromCycle(cycles[0]);

  const next = emptyCycleForm();
  if (!defaults) return next;

  next.openingAmount = sumBuckets(
    defaults.openingByCurrency,
    "PEN",
    next.penPerUsd,
    next.usdPerEur,
  );
  next.monthlyIncome = sumBuckets(
    defaults.monthlyIncomeByCurrency,
    "PEN",
    next.penPerUsd,
    next.usdPerEur,
  );
  next.monthlyHousehold = sumBuckets(
    defaults.monthlyHouseholdByCurrency,
    "PEN",
    next.penPerUsd,
    next.usdPerEur,
  );
  next.monthlyDebt = sumBuckets(
    defaults.monthlyDebtByCurrency,
    "PEN",
    next.penPerUsd,
    next.usdPerEur,
  );
  return next;
}

function MoneyField({
  label,
  amount,
  currency,
  onAmountChange,
  onCurrencyChange,
  dayOfMonth,
  dayLabel,
  onDayOfMonthChange,
}: {
  label: string;
  amount: number;
  currency: FinanceCurrency;
  onAmountChange: (amount: number) => void;
  onCurrencyChange: (currency: FinanceCurrency) => void;
  dayOfMonth?: number;
  dayLabel?: string;
  onDayOfMonthChange?: (day: number) => void;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex gap-2">
        <Input
          min={0}
          step="0.01"
          type="number"
          value={roundMoney(amount)}
          onChange={(event) =>
            onAmountChange(roundMoney(Number(event.target.value) || 0))
          }
        />
        <Select
          value={currency}
          onValueChange={(value) => onCurrencyChange(value as FinanceCurrency)}
        >
          <SelectTrigger className="w-24">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FINANCE_CURRENCIES.map((option) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {onDayOfMonthChange ? (
        <div className="flex items-center gap-2">
          <Label className="text-muted-foreground text-xs">
            {dayLabel ?? "Scheduled on day"}
          </Label>
          <Input
            aria-label={`${label} day of month`}
            className="h-8 w-16"
            max={31}
            min={1}
            step={1}
            type="number"
            value={validDayOfMonth(dayOfMonth)}
            onChange={(event) =>
              onDayOfMonthChange(validDayOfMonth(Number(event.target.value)))
            }
          />
          <span className="text-muted-foreground text-xs">of each month</span>
        </div>
      ) : null}
    </div>
  );
}

function CycleSummaryCard({
  cycle,
  statementPayments,
  isSelected,
  onSelect,
}: {
  cycle: PersistedCycle;
  statementPayments: FinanceStatementPaymentInput[];
  isSelected: boolean;
  onSelect: (id: string) => void;
}) {
  const config = CYCLE_STATUS_CONFIG[cycle.status];
  const StatusIcon = config.icon;
  const expectedClosing =
    cycle.closingAmount ??
    (() => {
      const forecast = calculateFinanceForecast(
        forecastInput(formFromCycle(cycle), statementPayments),
      );
      return forecast.results.expected.finalBalance - forecast.results.expected.goalSpend;
    })();

  return (
    <Card
      className={cn(
        "h-full gap-4 py-4 transition-colors",
        isSelected
          ? "border-primary bg-primary/[0.025] ring-primary/15 ring-2"
          : "hover:border-primary/40",
      )}
    >
      <CardHeader className="px-4 sm:px-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge
            className={config.className}
            variant={cycle.status === "ARCHIVED" ? "outline" : "default"}
          >
            <StatusIcon className="size-3" /> {config.label}
          </Badge>
          <span className="text-muted-foreground text-xs">
            {CYCLE_LABELS[cycle.kind]}
          </span>
        </div>
        <CardTitle className="mt-2 text-base leading-5">
          <button
            type="button"
            className="hover:text-primary text-left transition-colors"
            onClick={() => onSelect(cycle.id)}
          >
            {cycle.title}
          </button>
        </CardTitle>
        <CardAction>
          <Button
            type="button"
            size="sm"
            variant={isSelected ? "default" : "ghost"}
            aria-label={`Edit ${cycle.title}`}
            onClick={() => onSelect(cycle.id)}
          >
            <Pencil className="size-3.5" />
            {isSelected ? "Editing" : "Edit"}
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-3 px-4 sm:px-4">
        <div className="text-muted-foreground flex flex-wrap items-center justify-between gap-2 text-xs">
          <span>
            {format(cycle.startDate, "MMM d, yyyy")} – {format(cycle.endDate, "MMM d, yyyy")}
          </span>
          <span>
            {cycle.goals.length} {cycle.goals.length === 1 ? "goal" : "goals"}
          </span>
        </div>
        <div className="flex items-end justify-between gap-3 border-t pt-3">
          <span className="text-muted-foreground text-xs">
            {cycle.status === "CLOSED" ? "Closing cash" : "Expected cash"}
          </span>
          <span className="text-sm font-semibold tabular-nums">
            {formatCurrency(
              expectedClosing,
              cycle.closingCurrency ?? cycle.displayCurrency,
            )}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

function CycleGroup({
  title,
  cycles,
  statementPayments,
  selectedCycleId,
  onSelect,
}: {
  title: string;
  cycles: PersistedCycle[];
  statementPayments: FinanceStatementPaymentInput[];
  selectedCycleId: string | null;
  onSelect: (id: string) => void;
}) {
  if (cycles.length === 0) return null;

  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <h3 className="text-sm font-semibold">{title}</h3>
        <Badge variant="secondary">{cycles.length}</Badge>
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {cycles.map((cycle) => (
          <CycleSummaryCard
            key={cycle.id}
            cycle={cycle}
            statementPayments={statementPayments}
            isSelected={cycle.id === selectedCycleId}
            onSelect={onSelect}
          />
        ))}
      </div>
    </section>
  );
}

export function FinanceCyclePlanner() {
  const { data: cycleData, isLoading: cyclesLoading } = useFinanceCycles();
  const { data: defaults, isLoading: defaultsLoading } =
    useFinanceCycleDefaults();
  const { data: statementData, isLoading: statementsLoading } = useStatements();
  const cycles = useMemo(
    () => (cycleData?.cycles ?? []) as PersistedCycle[],
    [cycleData?.cycles],
  );
  const statementPayments = useMemo(
    () =>
      statementPaymentsFromRows(
        (statementData?.statements ?? []) as StatementPaymentRow[],
      ),
    [statementData?.statements],
  );

  if (cyclesLoading || defaultsLoading || statementsLoading) {
    return (
      <Card>
        <CardContent className="text-muted-foreground flex items-center gap-2 py-8 text-sm">
          <Loader2 className="size-4 animate-spin" /> Loading finance cycles…
        </CardContent>
      </Card>
    );
  }

  return (
    <FinanceCyclePlannerContent
      key={cycles[0]?.id ?? "new-cycle"}
      cycles={cycles}
      defaults={defaults}
      statementPayments={statementPayments}
    />
  );
}

function FinanceCyclePlannerContent({
  cycles,
  defaults,
  statementPayments,
}: {
  cycles: PersistedCycle[];
  defaults?: FinanceCycleDefaults;
  statementPayments: FinanceStatementPaymentInput[];
}) {
  const createCycle = useCreateFinanceCycle();
  const updateCycle = useUpdateFinanceCycle();
  const closeCycle = useCloseFinanceCycle();
  const [selectedCycleId, setSelectedCycleId] = useState<string | null>(
    () => cycles[0]?.id ?? null,
  );
  const [scenario, setScenario] = useState<FinanceScenario>("expected");
  const [form, setForm] = useState<CycleForm>(() =>
    initialCycleForm(cycles, defaults),
  );

  const forecast = useMemo(
    () => calculateFinanceForecast(forecastInput(form, statementPayments)),
    [form, statementPayments],
  );
  const includedStatementPayments = useMemo(
    () => paymentsInsideCycle(statementPayments, form),
    [form, statementPayments],
  );
  const result = forecast.results[scenario];
  const selectedCycle = cycles.find((cycle) => cycle.id === selectedCycleId);
  const previousCycle = cycles.find(
    (cycle) => cycle.id === form.previousCycleId,
  );
  const isPending = createCycle.isPending || updateCycle.isPending;
  const activeCycles = cycles.filter((cycle) => cycle.status === "ACTIVE");
  const draftCycles = cycles.filter((cycle) => cycle.status === "DRAFT");
  const historyCycles = cycles.filter((cycle) =>
    ["CLOSED", "ARCHIVED"].includes(cycle.status),
  );

  function patchForm(patch: Partial<CycleForm>) {
    setForm((current) => ({ ...current, ...patch }));
  }

  function scrollToEditor() {
    window.requestAnimationFrame(() => {
      document
        .getElementById("cycle-editor")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  function selectKind(kind: FinanceCycleKind) {
    const startDate = dateFromInput(form.startDate);
    const endDate = deriveFinanceCycleEndDate(
      startDate,
      kind,
      kind === "CUSTOM" ? dateFromInput(form.endDate) : undefined,
    );
    patchForm({
      kind,
      endDate: dateInput(endDate),
      title: cycleTitle(kind, startDate),
    });
  }

  function changeStartDate(value: string) {
    const startDate = dateFromInput(value);
    const endDate = deriveFinanceCycleEndDate(
      startDate,
      form.kind,
      form.kind === "CUSTOM" ? dateFromInput(form.endDate) : undefined,
    );
    patchForm({
      startDate: value,
      endDate: dateInput(endDate),
      title: cycleTitle(form.kind, startDate),
    });
  }

  function loadCycle(id: string) {
    const cycle = cycles.find((candidate) => candidate.id === id);
    if (!cycle) return;
    setSelectedCycleId(id);
    setForm(formFromCycle(cycle));
    scrollToEditor();
  }

  function startNewCycle() {
    const previous =
      selectedCycle ??
      activeCycles[0] ??
      historyCycles.find((cycle) => cycle.status === "CLOSED") ??
      cycles[0];
    if (!previous) {
      setSelectedCycleId(null);
      setForm(emptyCycleForm());
      scrollToEditor();
      return;
    }
    const previousForecast = calculateFinanceForecast(
      forecastInput(formFromCycle(previous), statementPayments),
    );
    const startDate = previous.endDate;
    const kind: FinanceCycleKind = "THREE_MONTHS";
    setSelectedCycleId(null);
    setForm({
      ...formFromCycle(previous),
      title: cycleTitle(kind, startDate),
      kind,
      status: "ACTIVE",
      startDate: dateInput(startDate),
      endDate: dateInput(deriveFinanceCycleEndDate(startDate, kind)),
      openingAmount: roundMoney(
        previous.closingAmount ??
          previousForecast.results.expected.finalBalance -
            previousForecast.results.expected.goalSpend,
      ),
      openingCurrency:
        previous.closingCurrency ?? previous.displayCurrency,
      carryPrevious: true,
      previousCycleId: previous.id,
      goals: previous.goals
        .filter((goal) => goal.status !== "FUNDED")
        .map((goal) => ({ ...goal, key: `${goal.id}-carry` })),
    });
    scrollToEditor();
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    if (form.goals.some((goal) => !goal.name.trim() || goal.amount <= 0)) {
      toast.error("Every goal needs a name and an amount greater than zero.");
      return;
    }

    try {
      if (selectedCycleId) {
        const updated = await updateCycle.mutateAsync({
          id: selectedCycleId,
          ...mutationInput(form),
        });
        setForm(formFromCycle(updated as PersistedCycle));
        toast.success("Finance cycle updated");
      } else {
        const created = await createCycle.mutateAsync(mutationInput(form));
        setSelectedCycleId(created.id);
        setForm(formFromCycle(created as PersistedCycle));
        toast.success("Finance cycle created");
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not save the cycle",
      );
    }
  }

  async function closeSelectedCycle() {
    if (!selectedCycleId) return;
    if (!window.confirm(
      "Close this cycle, record any fully funded goal purchases, and carry the remaining cash forward?",
    )) {
      return;
    }
    try {
      const closed = await closeCycle.mutateAsync({ id: selectedCycleId });
      setForm(formFromCycle(closed as PersistedCycle));
      toast.success("Cycle closed. Its ending balance can now seed the next cycle.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not close the cycle",
      );
    }
  }

  function updateGoal(key: string, patch: Partial<GoalForm>) {
    patchForm({
      goals: form.goals.map((goal) =>
        goal.key === key ? { ...goal, ...patch } : goal,
      ),
    });
  }

  function addGoal() {
    patchForm({
      goals: [
        ...form.goals,
        {
          key: `new-${Date.now()}`,
          name: "",
          amount: 0,
          currency: form.displayCurrency,
          priority: "MEDIUM",
          status: "ACTIVE",
        },
      ],
    });
  }

  function removeGoal(key: string) {
    patchForm({ goals: form.goals.filter((goal) => goal.key !== key) });
  }

  const affordableNames = form.goals
    .filter((goal) => result.affordableGoalIds.includes(goal.key))
    .map((goal) => goal.name)
    .filter(Boolean);
  const deferredNames = form.goals
    .filter((goal) => result.deferredGoalIds.includes(goal.key))
    .map((goal) => goal.name)
    .filter(Boolean);
  const periodLabel = form.kind === "WEEK" ? "week" : "month";
  const recommendation =
    form.goals.length === 0
      ? "Add a purchase goal to see whether it fits inside this cycle."
      : result.goalGap <= 0
        ? `All selected goals fit by ${format(forecast.endDate, "MMM d")} while preserving the emergency floor.`
        : result.periodRoom <= 0
          ? "This scenario has no room for goal purchases. Preserve cash first, then adjust spending or income assumptions."
          : `${affordableNames.length ? `Fund ${affordableNames.join(" and ")}. ` : ""}${deferredNames.length ? `Delay ${deferredNames.join(" and ")}, ` : ""}or free up ${formatCurrency(result.extraPerPeriod, form.displayCurrency)} per ${periodLabel} to close the gap.`;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarRange className="size-5" /> Your savings cycles
          </CardTitle>
          <CardDescription>
            Choose any cycle to review or edit its dates, assumptions, and
            purchase goals.
          </CardDescription>
          <CardAction>
            <Button type="button" onClick={startNewCycle}>
              <Plus /> {cycles.length === 0 ? "Create first cycle" : "New cycle"}
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent className="space-y-6">
          {cycles.length === 0 ? (
            <div className="text-muted-foreground rounded-lg border border-dashed p-8 text-center text-sm">
              No saved cycles yet. Start with a week, three-month, six-month, or
              custom plan.
            </div>
          ) : (
            <>
              <CycleGroup
                title="Current"
                cycles={activeCycles}
                statementPayments={statementPayments}
                selectedCycleId={selectedCycleId}
                onSelect={loadCycle}
              />
              <CycleGroup
                title="Drafts"
                cycles={draftCycles}
                statementPayments={statementPayments}
                selectedCycleId={selectedCycleId}
                onSelect={loadCycle}
              />
              <CycleGroup
                title="History"
                cycles={historyCycles}
                statementPayments={statementPayments}
                selectedCycleId={selectedCycleId}
                onSelect={loadCycle}
              />
            </>
          )}
        </CardContent>
      </Card>

      <form className="space-y-6" onSubmit={save}>
        <Card id="cycle-editor" className="scroll-mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Pencil className="size-5" />
              {selectedCycleId ? "Edit cycle" : "Create a cycle"}
            </CardTitle>
            <CardDescription>
              Build a week, three-month, six-month, or custom plan. Previous
              cycles can carry one closing balance forward, while transactions
              remain counted once by date.
            </CardDescription>
            <CardAction>
              <Badge variant="outline">
                {selectedCycleId ? "Saved cycle" : "Not saved yet"}
              </Badge>
            </CardAction>
          </CardHeader>
          <CardContent className="space-y-5">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="space-y-2">
              <Label>Cycle length</Label>
              <div className="flex flex-wrap gap-2">
                {(Object.keys(CYCLE_LABELS) as FinanceCycleKind[]).map(
                  (kind) => (
                    <Button
                      key={kind}
                      type="button"
                      size="sm"
                      variant={form.kind === kind ? "default" : "outline"}
                      aria-pressed={form.kind === kind}
                      onClick={() => selectKind(kind)}
                    >
                      {CYCLE_LABELS[kind]}
                    </Button>
                  ),
                )}
              </div>
            </div>
            <div className="grid w-full gap-3 sm:w-auto sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="cycle-start">Starts</Label>
                <Input
                  id="cycle-start"
                  type="date"
                  value={form.startDate}
                  onChange={(event) => changeStartDate(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cycle-end">Ends</Label>
                <Input
                  id="cycle-end"
                  type="date"
                  disabled={form.kind !== "CUSTOM"}
                  value={form.endDate}
                  onChange={(event) => patchForm({ endDate: event.target.value })}
                />
              </div>
            </div>
          </div>

          <div className="grid items-center gap-3 rounded-xl border bg-muted/30 p-3 md:grid-cols-[1fr_auto_1fr]">
            <div>
              <div className="text-sm font-medium">
                {previousCycle?.title ?? "No previous cycle"}
              </div>
              <div className="text-muted-foreground text-xs">
                {previousCycle
                  ? `${format(previousCycle.startDate, "MMM d")}–${format(previousCycle.endDate, "MMM d")} · ${previousCycle.status.toLowerCase()}`
                  : "This cycle starts from the opening balance below"}
              </div>
            </div>
            <div className="text-primary flex items-center justify-center gap-2 text-xs">
              <ArrowRight className="size-4" />
              {form.carryPrevious && previousCycle
                ? "closing balance + unfinished goals"
                : "history only"}
            </div>
            <div className="md:text-right">
              <div className="flex items-center gap-2 md:justify-end">
                <span className="text-sm font-medium">{form.title}</span>
                <Badge variant="outline">{form.status.toLowerCase()}</Badge>
              </div>
              <div className="text-muted-foreground text-xs">
                {format(dateFromInput(form.startDate), "MMM d, yyyy")}–
                {format(dateFromInput(form.endDate), "MMM d, yyyy")}
              </div>
            </div>
          </div>
          <div className="text-muted-foreground text-xs">
            {form.kind === "WEEK"
              ? "This weekly check-in rolls into the active three-month plan."
              : form.kind === "SIX_MONTHS"
                ? "This cycle can contain two three-month reviews and roughly 26 weekly check-ins."
                : "Weekly check-ins can roll up into this cycle without duplicating transactions."}
          </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ReceiptText className="size-5" /> Scheduled statement payments
            </CardTitle>
            <CardDescription>
              Live unpaid statement balances due inside this cycle. Amounts and
              due dates refresh automatically when statements or linked expenses
              change.
            </CardDescription>
            <CardAction className="flex items-center gap-2">
              <Badge variant="secondary">
                {includedStatementPayments.length}{" "}
                {includedStatementPayments.length === 1
                  ? "statement"
                  : "statements"}
              </Badge>
              <span className="text-sm font-semibold tabular-nums">
                {formatCurrency(
                  forecast.statementPaymentTotal,
                  form.displayCurrency,
                )}
              </span>
            </CardAction>
          </CardHeader>
          <CardContent>
            {includedStatementPayments.length === 0 ? (
              <div className="text-muted-foreground rounded-lg border border-dashed p-6 text-center text-sm">
                No unpaid statements are due between{" "}
                {format(forecast.startDate, "MMM d")} and{" "}
                {format(forecast.endDate, "MMM d, yyyy")}.
              </div>
            ) : (
              <div className="divide-y rounded-lg border">
                {includedStatementPayments.map((payment) => (
                  <div
                    key={payment.id}
                    className="flex flex-wrap items-center justify-between gap-3 p-3"
                  >
                    <div>
                      <div className="text-sm font-medium">{payment.label}</div>
                      <div className="text-muted-foreground text-xs">
                        Due {format(payment.dueDate, "MMM d, yyyy")}
                      </div>
                    </div>
                    <div className="text-right text-sm font-semibold tabular-nums">
                      {payment.amounts.map((item) => (
                        <div key={item.currency}>
                          {formatCurrency(item.amount, item.currency)}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div
            className="flex flex-wrap gap-2"
            role="group"
            aria-label="Forecast scenario"
          >
            {(["conservative", "expected", "optimistic"] as const).map(
              (option) => (
                <Button
                  key={option}
                  type="button"
                  size="sm"
                  variant={scenario === option ? "default" : "outline"}
                  aria-pressed={scenario === option}
                  className="capitalize"
                  onClick={() => setScenario(option)}
                >
                  {option}
                </Button>
              ),
            )}
          </div>
          <span className="text-muted-foreground text-xs">
            {scenario === "expected"
              ? "Uses your usual income"
              : `Uses income ${scenario === "conservative" ? "below" : "above"} plan by ${form.incomeVariance}%`}
          </span>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader>
            <CardDescription>
              Cash after whole goal purchases on {format(forecast.endDate, "MMM d")}
            </CardDescription>
            <CardTitle className="text-2xl tabular-nums">
              {formatCurrency(
                result.finalBalance - result.goalSpend,
                form.displayCurrency,
              )}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Statements due in this cycle</CardDescription>
            <CardTitle className="text-2xl tabular-nums">
              {formatCurrency(
                forecast.statementPaymentTotal,
                form.displayCurrency,
              )}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>
              {form.kind === "WEEK" ? "Weekly" : "Monthly"} room
            </CardDescription>
            <CardTitle className="text-2xl tabular-nums">
              {formatCurrency(result.periodRoom, form.displayCurrency)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Goal shortfall</CardDescription>
            <CardTitle className="text-2xl tabular-nums">
              {result.goalGap > 0
                ? formatCurrency(result.goalGap, form.displayCurrency)
                : "Fully funded"}
            </CardTitle>
          </CardHeader>
        </Card>
        </div>

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(360px,0.75fr)]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Projected cash runway</CardTitle>
              <CardDescription>
                Statement payments are deducted on their due dates and marked
                with red diamonds. The solid line includes goals this plan can
                fund at the end of the cycle.
              </CardDescription>
              <CardAction>
                <Badge variant="outline" className="capitalize">
                  {scenario}
                </Badge>
              </CardAction>
            </CardHeader>
            <CardContent>
              <FinanceCycleChart
                points={result.points}
                currency={form.displayCurrency}
                emergencyFloor={forecast.emergencyFloor}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Purchase goals</CardTitle>
              <CardDescription>
                Goals are funded by priority and carry forward until funded or
                removed.
              </CardDescription>
              <CardAction className="text-sm font-medium tabular-nums">
                {formatCurrency(forecast.goalTotal, form.displayCurrency)}
              </CardAction>
            </CardHeader>
            <CardContent className="space-y-4">
              {form.goals.length === 0 ? (
                <div className="text-muted-foreground rounded-lg border border-dashed p-6 text-center text-sm">
                  No purchase goals yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {form.goals.map((goal) => (
                    <div
                      key={goal.key}
                      className="grid gap-2 rounded-lg border p-3 sm:grid-cols-[minmax(0,1fr)_130px_100px_110px_auto]"
                    >
                      <Input
                        aria-label="Goal name"
                        placeholder="What do you want to buy?"
                        value={goal.name}
                        onChange={(event) =>
                          updateGoal(goal.key, { name: event.target.value })
                        }
                      />
                      <Input
                        aria-label={`${goal.name || "Goal"} amount`}
                        min={0}
                        step="0.01"
                        type="number"
                        value={roundMoney(goal.amount)}
                        onChange={(event) =>
                          updateGoal(goal.key, {
                            amount: roundMoney(
                              Number(event.target.value) || 0,
                            ),
                          })
                        }
                      />
                      <Select
                        value={goal.currency}
                        onValueChange={(currency) =>
                          updateGoal(goal.key, {
                            currency: currency as FinanceCurrency,
                          })
                        }
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {FINANCE_CURRENCIES.map((currency) => (
                            <SelectItem key={currency} value={currency}>
                              {currency}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select
                        value={goal.priority}
                        onValueChange={(priority) =>
                          updateGoal(goal.key, {
                            priority: priority as FinanceGoalPriority,
                          })
                        }
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {(Object.keys(PRIORITY_LABELS) as FinanceGoalPriority[]).map(
                            (priority) => (
                              <SelectItem key={priority} value={priority}>
                                {PRIORITY_LABELS[priority]}
                              </SelectItem>
                            ),
                          )}
                        </SelectContent>
                      </Select>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        aria-label={`Remove ${goal.name || "goal"}`}
                        onClick={() => removeGoal(goal.key)}
                      >
                        <Trash2 />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              <Button type="button" variant="outline" size="sm" onClick={addGoal}>
                <Plus /> Add goal
              </Button>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>
                    {formatCurrency(
                      result.availableForGoals,
                      form.displayCurrency,
                    )}{" "}
                    available above emergency floor
                  </span>
                  <span className="text-muted-foreground">
                    {result.fundedPercent.toFixed(0)}% funded
                  </span>
                </div>
                <Progress value={result.fundedPercent} />
                <p className="text-muted-foreground text-xs">
                  {formatCurrency(result.availableForGoals, form.displayCurrency)} is
                  reserved toward your goals. {formatCurrency(
                    result.goalSpend,
                    form.displayCurrency,
                  )} in whole goals can be purchased, leaving {formatCurrency(
                    result.finalBalance - result.goalSpend,
                    form.displayCurrency,
                  )} in cash after those purchases.
                </p>
                {forecast.goalTotal > 0 && result.goalSpend === 0 ? (
                  <p className="text-muted-foreground text-xs">
                    No whole goal is funded yet, so both chart lines are the
                    same. The next goal stays pending until its full amount is
                    available.
                  </p>
                ) : null}
              </div>

              <div className="border-chart-1/30 bg-chart-1/5 rounded-xl border p-4">
                <div className="text-chart-1 flex items-center gap-2 text-sm font-medium">
                  <Sparkles className="size-4" /> Deterministic suggestion
                </div>
                <p className="mt-2 text-sm leading-6">{recommendation}</p>
                <p className="text-muted-foreground mt-2 text-xs">
                  An optional LLM can explain this result later, but it does not
                  calculate or change these numbers.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Forecast assumptions</CardTitle>
            <CardDescription>
              Choose when each non-card monthly amount lands. Credit-card
              statements are pulled in automatically above, and every amount
              is converted only for display.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="cycle-title">Cycle name</Label>
              <Input
                id="cycle-title"
                value={form.title}
                onChange={(event) => patchForm({ title: event.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Report totals in</Label>
              <Select
                value={form.displayCurrency}
                onValueChange={(displayCurrency) =>
                  patchForm({
                    displayCurrency: displayCurrency as FinanceCurrency,
                  })
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FINANCE_CURRENCIES.map((currency) => (
                    <SelectItem key={currency} value={currency}>
                      {CURRENCY_LABELS[currency]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
              <MoneyField
                label="Opening cash"
                amount={form.openingAmount}
                currency={form.openingCurrency}
                onAmountChange={(openingAmount) => patchForm({ openingAmount })}
                onCurrencyChange={(openingCurrency) =>
                  patchForm({ openingCurrency })
                }
              />
              <MoneyField
                label="Monthly take-home"
                amount={form.monthlyIncome}
                currency={form.incomeCurrency}
                onAmountChange={(monthlyIncome) => patchForm({ monthlyIncome })}
                onCurrencyChange={(incomeCurrency) =>
                  patchForm({ incomeCurrency })
                }
                dayOfMonth={form.incomeDayOfMonth}
                dayLabel="Received on day"
                onDayOfMonthChange={(incomeDayOfMonth) =>
                  patchForm({ incomeDayOfMonth })
                }
              />
              <MoneyField
                label="Non-card household spending"
                amount={form.monthlyHousehold}
                currency={form.householdCurrency}
                onAmountChange={(monthlyHousehold) =>
                  patchForm({ monthlyHousehold })
                }
                onCurrencyChange={(householdCurrency) =>
                  patchForm({ householdCurrency })
                }
                dayOfMonth={form.householdDayOfMonth}
                dayLabel="Paid on day"
                onDayOfMonthChange={(householdDayOfMonth) =>
                  patchForm({ householdDayOfMonth })
                }
              />
              <MoneyField
                label="Non-card flexible spending"
                amount={form.monthlyFlexible}
                currency={form.flexibleCurrency}
                onAmountChange={(monthlyFlexible) =>
                  patchForm({ monthlyFlexible })
                }
                onCurrencyChange={(flexibleCurrency) =>
                  patchForm({ flexibleCurrency })
                }
                dayOfMonth={form.flexibleDayOfMonth}
                dayLabel="Paid on day"
                onDayOfMonthChange={(flexibleDayOfMonth) =>
                  patchForm({ flexibleDayOfMonth })
                }
              />
              <MoneyField
                label="Other debt payments"
                amount={form.monthlyDebt}
                currency={form.debtCurrency}
                onAmountChange={(monthlyDebt) => patchForm({ monthlyDebt })}
                onCurrencyChange={(debtCurrency) =>
                  patchForm({ debtCurrency })
                }
                dayOfMonth={form.debtDayOfMonth}
                dayLabel="Paid on day"
                onDayOfMonthChange={(debtDayOfMonth) =>
                  patchForm({ debtDayOfMonth })
                }
              />
              <MoneyField
                label="Emergency floor"
                amount={form.emergencyFloor}
                currency={form.emergencyCurrency}
                onAmountChange={(emergencyFloor) =>
                  patchForm({ emergencyFloor })
                }
                onCurrencyChange={(emergencyCurrency) =>
                  patchForm({ emergencyCurrency })
                }
              />
            </div>

            <p className="text-muted-foreground text-xs">
              Day 29–31 automatically uses the last day of shorter months.
            </p>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="income-variance">Income can vary</Label>
                <span className="text-sm font-medium">±{form.incomeVariance}%</span>
              </div>
              <input
                id="income-variance"
                className="accent-primary w-full"
                max={40}
                min={0}
                step={5}
                type="range"
                value={form.incomeVariance}
                onChange={(event) =>
                  patchForm({ incomeVariance: Number(event.target.value) })
                }
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="pen-per-usd">PEN per USD</Label>
                <Input
                  id="pen-per-usd"
                  min={0.01}
                  step="0.01"
                  type="number"
                  value={form.penPerUsd}
                  onChange={(event) =>
                    patchForm({ penPerUsd: Number(event.target.value) || 0 })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="usd-per-eur">USD per EUR</Label>
                <Input
                  id="usd-per-eur"
                  min={0.01}
                  step="0.01"
                  type="number"
                  value={form.usdPerEur}
                  onChange={(event) =>
                    patchForm({ usdPerEur: Number(event.target.value) || 0 })
                  }
                />
              </div>
            </div>
            <p className="text-muted-foreground text-xs leading-5">
              Historical transactions keep their recorded currency. These rates
              are assumptions for future amounts inside this cycle.
            </p>

            <div className="flex items-start gap-3 rounded-lg border p-3">
              <Switch
                id="carry-previous"
                checked={form.carryPrevious}
                disabled={!form.previousCycleId}
                onCheckedChange={(carryPrevious) =>
                  patchForm({ carryPrevious })
                }
              />
              <Label htmlFor="carry-previous" className="leading-5">
                Carry the previous cycle&apos;s closing balance and unfinished
                goals into this cycle
              </Label>
            </div>

            <div className="flex flex-wrap gap-2 border-t pt-5">
              <Button type="submit" disabled={isPending}>
                {isPending ? <Loader2 className="animate-spin" /> : <Save />}
                {selectedCycleId ? "Save changes" : "Create cycle"}
              </Button>
              {selectedCycleId && form.status !== "CLOSED" ? (
                <Button
                  type="button"
                  variant="outline"
                  disabled={closeCycle.isPending}
                  onClick={closeSelectedCycle}
                >
                  {closeCycle.isPending ? (
                    <Loader2 className="animate-spin" />
                  ) : (
                    <CheckCircle2 />
                  )}
                  Close cycle
                </Button>
              ) : null}
            </div>
          </CardContent>
        </Card>
      </div>
      </form>
    </div>
  );
}
