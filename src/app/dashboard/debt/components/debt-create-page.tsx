"use client";

import { useState, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Download, Plus, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { cn, formatCurrency, DEBT_TYPE_LABELS } from "@/lib/utils";
import { useCreateDebt } from "@/hooks/use-debts";
import { useAccounts } from "@/hooks/use-accounts";
import { DEBT_COLOR_PALETTE } from "@/server/trpc/services/debt/colors";
import { generateEqualPaymentSchedule } from "@/server/trpc/services/debt/schedule";
import { EditableScheduleTable, type ScheduleRow } from "./schedule-table";
import type { CreateDebtInput } from "@/server/trpc/schemas/debt.schema";
import type { DebtFee } from "@/types/debt";
import {
  generateScheduleTemplate,
  scheduleRowsToCsv,
  parseCsvToScheduleRows,
  downloadCsv,
} from "@/lib/csv";

type ScheduleMode = "none" | "equal" | "custom";

type FeeRow = {
  tempId: string;
  name: string;
  amount: number;
};

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: currentYear - 2020 + 2 }, (_, i) => 2020 + i);

export function DebtCreatePage() {
  const router = useRouter();
  const createDebt = useCreateDebt();
  const { data: accountsData } = useAccounts();

  // Debt details
  const [name, setName] = useState("");
  const [type, setType] = useState<CreateDebtInput["type"]>("PERSONAL_LOAN");
  const [balance, setBalance] = useState(0);
  const [interestRate, setInterestRate] = useState(0);
  const [dueDate, setDueDate] = useState<number | null>(null);
  const [lender, setLender] = useState("");
  const [notes, setNotes] = useState("");
  const [color, setColor] = useState<string | null>(null);
  const [startedMonth, setStartedMonth] = useState("");
  const [startedYear, setStartedYear] = useState("");

  // Funding account
  const [fundingAccountId, setFundingAccountId] = useState<string | null>(null);

  // Schedule
  const [scheduleMode, setScheduleMode] = useState<ScheduleMode>("none");
  const [termMonths, setTermMonths] = useState(12);
  const [installments, setInstallments] = useState<ScheduleRow[]>([]);

  // Fees (optional, become columns in the schedule table)
  const [fees, setFees] = useState<FeeRow[]>([]);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [csvError, setCsvError] = useState<string | null>(null);
  const csvInputRef = useRef<HTMLInputElement>(null);

  const startedAt = useMemo(() => {
    if (startedMonth !== "" && startedYear !== "") {
      return new Date(parseInt(startedYear), parseInt(startedMonth), 1);
    }
    return null;
  }, [startedMonth, startedYear]);

  const feesForCalc: DebtFee[] = useMemo(
    () => fees.filter((f) => f.name.trim() && f.amount > 0).map((f) => ({ name: f.name, amount: f.amount })),
    [fees],
  );

  const scheduleTotals = useMemo(() => {
    if (installments.length === 0) return { capital: 0, interest: 0, fees: 0, total: 0 };
    return installments.reduce(
      (acc, r) => ({
        capital: acc.capital + r.capital,
        interest: acc.interest + r.interest,
        fees: acc.fees + r.fees.reduce((sum, f) => sum + f.amount, 0),
        total: acc.total + r.totalAmount,
      }),
      { capital: 0, interest: 0, fees: 0, total: 0 },
    );
  }, [installments]);

  function handleDownloadTemplate() {
    const feeNamesForTemplate = feesForCalc.map((f) => f.name);
    const csv = installments.length > 0
      ? scheduleRowsToCsv(installments)
      : generateScheduleTemplate(feeNamesForTemplate);
    downloadCsv(csv, "payment-schedule-template.csv");
  }

  function handleCsvImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setCsvError(null);
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const { rows, feeNames } = parseCsvToScheduleRows(text);
        setInstallments(rows);

        // Sync fee definitions with imported fee columns
        if (feeNames.length > 0) {
          setFees(
            feeNames.map((name) => ({
              tempId: crypto.randomUUID(),
              name,
              amount: rows[0]?.fees.find((f) => f.name === name)?.amount ?? 0,
            })),
          );
        }

        // Switch to custom mode if currently set to none
        if (scheduleMode === "none") {
          setScheduleMode("custom");
        }
      } catch (err) {
        setCsvError(
          err instanceof Error ? err.message : "Failed to parse CSV file.",
        );
      }
    };
    reader.readAsText(file);

    // Reset input so the same file can be re-imported
    e.target.value = "";
  }

  function handleGenerate() {
    if (balance <= 0 || interestRate <= 0 || termMonths <= 0) return;
    const schedule = generateEqualPaymentSchedule({
      balance,
      interestRate,
      termMonths,
      startDate: startedAt ?? new Date(),
      dueDay: dueDate ?? 1,
      fees: feesForCalc.length > 0 ? feesForCalc : undefined,
    });
    setInstallments(schedule);
  }

  function handleAddCustomRow() {
    if (installments.length === 0) {
      const row: ScheduleRow = {
        installmentNumber: 1,
        dueDate: startedAt ? new Date(startedAt.getFullYear(), startedAt.getMonth() + 1, dueDate ?? 1) : new Date(),
        capital: 0,
        interest: 0,
        fees: feesForCalc.map((f) => ({ name: f.name, amount: 0 })),
        totalAmount: 0,
      };
      setInstallments([row]);
    }
  }

  function validate(): boolean {
    const newErrors: Record<string, string> = {};
    if (!name.trim()) newErrors.name = "Name is required";
    if (balance <= 0) newErrors.balance = "Balance must be greater than 0";
    if (interestRate < 0 || interestRate > 100) newErrors.interestRate = "Rate must be 0-100";
    if (dueDate !== null && (dueDate < 1 || dueDate > 31)) newErrors.dueDate = "Day must be 1-31";

    if (scheduleMode !== "none" && installments.length === 0) {
      newErrors.schedule = "At least one installment is required";
    }

    for (const f of fees) {
      if (f.name.trim() && f.amount <= 0) {
        newErrors.fees = "All fee amounts must be greater than 0";
        break;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    const hasSchedule = scheduleMode !== "none" && installments.length > 0;
    const feesPayload = feesForCalc.length > 0 ? feesForCalc : undefined;

    const data: CreateDebtInput = {
      name,
      type,
      balance,
      interestRate,
      monthlyCapital: hasSchedule ? installments[0].capital : 0,
      monthlyInterest: hasSchedule ? installments[0].interest : 0,
      dueDate: dueDate ?? null,
      lender: lender || null,
      notes: notes || null,
      color,
      startedAt: startedAt ?? null,
      status: "ACTIVE",
      fees: feesPayload,
      fundingAccountId,
      hasSchedule,
      termMonths: hasSchedule ? installments.length : null,
      installments: hasSchedule
        ? installments.map((inst) => ({
            installmentNumber: inst.installmentNumber,
            dueDate: inst.dueDate,
            capital: inst.capital,
            interest: inst.interest,
            fees: inst.fees.filter((f) => f.amount > 0).length > 0
              ? inst.fees.filter((f) => f.amount > 0)
              : undefined,
          }))
        : undefined,
    };

    await createDebt.mutateAsync(data);
    router.push("/dashboard/debt");
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => router.push("/dashboard/debt")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-semibold">Add Debt</h1>
        </div>
        <Button type="submit" disabled={createDebt.isPending}>
          {createDebt.isPending ? "Saving..." : "Save"}
        </Button>
      </div>

      <Separator />

      {/* Section 1: Debt Details */}
      <Card>
        <CardHeader>
          <CardTitle>Debt Details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. BBVA Personal Loan"
              />
              {errors.name && <p className="text-destructive text-sm">{errors.name}</p>}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="type">Type *</Label>
              <Select value={type} onValueChange={(v) => setType(v as CreateDebtInput["type"])}>
                <SelectTrigger id="type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(DEBT_TYPE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="balance">Total Balance *</Label>
              <Input
                id="balance"
                type="number"
                step="0.01"
                min="0"
                value={balance || ""}
                onChange={(e) => setBalance(parseFloat(e.target.value) || 0)}
              />
              {errors.balance && <p className="text-destructive text-sm">{errors.balance}</p>}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="rate">Interest Rate (TEA %) *</Label>
              <Input
                id="rate"
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={interestRate || ""}
                onChange={(e) => setInterestRate(parseFloat(e.target.value) || 0)}
              />
              {errors.interestRate && <p className="text-destructive text-sm">{errors.interestRate}</p>}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="lender">Lender</Label>
              <Input
                id="lender"
                value={lender}
                onChange={(e) => setLender(e.target.value)}
                placeholder="e.g. BBVA"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="dueDay">Due Day</Label>
              <Input
                id="dueDay"
                type="number"
                min="1"
                max="31"
                value={dueDate ?? ""}
                onChange={(e) => setDueDate(e.target.value ? parseInt(e.target.value) : null)}
              />
              {errors.dueDate && <p className="text-destructive text-sm">{errors.dueDate}</p>}
            </div>
            <div className="grid gap-2">
              <Label>Started</Label>
              <div className="flex gap-2">
                <Select value={startedMonth} onValueChange={setStartedMonth}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Month" />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTHS.map((m, i) => (
                      <SelectItem key={i} value={i.toString()}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={startedYear} onValueChange={setStartedYear}>
                  <SelectTrigger className="w-24">
                    <SelectValue placeholder="Year" />
                  </SelectTrigger>
                  <SelectContent>
                    {YEARS.map((y) => (
                      <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Color</Label>
              <div className="flex flex-wrap gap-1.5">
                {DEBT_COLOR_PALETTE.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={cn(
                      "h-6 w-6 rounded-full border-2 transition-all",
                      color === c ? "border-foreground scale-110" : "border-transparent",
                    )}
                    style={{ backgroundColor: c }}
                    onClick={() => setColor(c === color ? null : c)}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes..."
              rows={2}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="fundingAccount">Funding Account</Label>
            <p className="text-muted-foreground text-xs">
              Which account will fund payments for this debt?
            </p>
            <Select
              value={fundingAccountId ?? "none"}
              onValueChange={(v) => setFundingAccountId(v === "none" ? null : v)}
            >
              <SelectTrigger id="fundingAccount">
                <SelectValue placeholder="None (set up later)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {accountsData?.accounts?.map((acc) => (
                  <SelectItem key={acc.id} value={acc.id}>
                    {acc.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Section 2: Payment Schedule */}
      <Card>
        <CardHeader>
          <CardTitle>Payment Schedule</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            {(["none", "equal", "custom"] as ScheduleMode[]).map((mode) => (
              <label
                key={mode}
                className={cn(
                  "flex cursor-pointer items-center gap-2 rounded-lg border px-4 py-2.5 text-sm transition-colors",
                  scheduleMode === mode
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-muted hover:border-muted-foreground/30",
                )}
              >
                <input
                  type="radio"
                  name="scheduleMode"
                  value={mode}
                  checked={scheduleMode === mode}
                  onChange={() => {
                    setScheduleMode(mode);
                    if (mode === "none") setInstallments([]);
                  }}
                  className="sr-only"
                />
                <span className={cn(
                  "h-4 w-4 rounded-full border-2 flex items-center justify-center",
                  scheduleMode === mode ? "border-primary" : "border-muted-foreground/40",
                )}>
                  {scheduleMode === mode && (
                    <span className="h-2 w-2 rounded-full bg-primary" />
                  )}
                </span>
                {mode === "none" && "No schedule"}
                {mode === "equal" && "Equal payments"}
                {mode === "custom" && "Custom schedule"}
              </label>
            ))}
          </div>

          {scheduleMode !== "none" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm">Fees</Label>
                  <p className="text-muted-foreground text-xs">
                    Recurring charges (insurance, admin) that don&apos;t reduce principal
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setFees((prev) => [...prev, { tempId: crypto.randomUUID(), name: "", amount: 0 }])}
                >
                  <Plus className="mr-1 h-3 w-3" />
                  Add Fee
                </Button>
              </div>
              {fees.map((fee) => (
                <div key={fee.tempId} className="flex items-center gap-2">
                  <Input
                    placeholder="Fee name"
                    value={fee.name}
                    onChange={(e) =>
                      setFees((prev) =>
                        prev.map((f) =>
                          f.tempId === fee.tempId ? { ...f, name: e.target.value } : f,
                        ),
                      )
                    }
                    className="flex-1"
                  />
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="Amount"
                    value={fee.amount || ""}
                    onChange={(e) =>
                      setFees((prev) =>
                        prev.map((f) =>
                          f.tempId === fee.tempId
                            ? { ...f, amount: parseFloat(e.target.value) || 0 }
                            : f,
                        ),
                      )
                    }
                    className="w-32"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setFees((prev) => prev.filter((f) => f.tempId !== fee.tempId))}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              {errors.fees && <p className="text-destructive text-sm">{errors.fees}</p>}
            </div>
          )}

          {scheduleMode === "equal" && (
            <div className="space-y-4">
              <div className="flex items-end gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="term">Term (months)</Label>
                  <Input
                    id="term"
                    type="number"
                    min="1"
                    max="360"
                    value={termMonths}
                    onChange={(e) => setTermMonths(parseInt(e.target.value) || 12)}
                    className="w-32"
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleGenerate}
                  disabled={balance <= 0 || interestRate <= 0}
                >
                  Generate Schedule
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadTemplate}
                >
                  <Download className="mr-1 h-3.5 w-3.5" />
                  {installments.length > 0 ? "Download CSV" : "Download Template"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => csvInputRef.current?.click()}
                >
                  <Upload className="mr-1 h-3.5 w-3.5" />
                  Import CSV
                </Button>
              </div>
              {csvError && <p className="text-destructive text-sm">{csvError}</p>}
              {installments.length > 0 && (
                <EditableScheduleTable rows={installments} onChange={setInstallments} />
              )}
            </div>
          )}

          {scheduleMode === "custom" && (
            <div className="space-y-4">
              {installments.length === 0 ? (
                <div className="text-center py-8 border rounded-md border-dashed space-y-3">
                  <p className="text-muted-foreground text-sm">
                    Add installments manually or import from a CSV file.
                  </p>
                  <div className="flex items-center justify-center gap-2">
                    <Button type="button" variant="outline" onClick={handleAddCustomRow}>
                      + Add First Installment
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => csvInputRef.current?.click()}
                    >
                      <Upload className="mr-1 h-3.5 w-3.5" />
                      Import CSV
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleDownloadTemplate}
                    >
                      <Download className="mr-1 h-3.5 w-3.5" />
                      Download Template
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleDownloadTemplate}
                    >
                      <Download className="mr-1 h-3.5 w-3.5" />
                      Download CSV
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => csvInputRef.current?.click()}
                    >
                      <Upload className="mr-1 h-3.5 w-3.5" />
                      Import CSV
                    </Button>
                  </div>
                  <EditableScheduleTable rows={installments} onChange={setInstallments} />
                </>
              )}
              {csvError && <p className="text-destructive text-sm">{csvError}</p>}
            </div>
          )}

          <input
            ref={csvInputRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={handleCsvImport}
          />

          {errors.schedule && <p className="text-destructive text-sm">{errors.schedule}</p>}

          {installments.length > 0 && (
            <div className="bg-muted/50 rounded-md p-3 text-sm space-y-1">
              <p><span className="font-medium">Installments:</span> {installments.length}</p>
              <p><span className="font-medium">Total Capital:</span> {formatCurrency(scheduleTotals.capital)}</p>
              <p><span className="font-medium">Total Interest:</span> {formatCurrency(scheduleTotals.interest)}</p>
              {scheduleTotals.fees > 0 && (
                <p><span className="font-medium">Total Fees:</span> {formatCurrency(scheduleTotals.fees)}</p>
              )}
              <p><span className="font-medium">Grand Total:</span> {formatCurrency(scheduleTotals.total)}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Footer */}
      <div className="flex justify-end gap-3 pb-6">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/dashboard/debt")}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={createDebt.isPending}>
          {createDebt.isPending ? "Saving..." : "Save Debt"}
        </Button>
      </div>
    </form>
  );
}
