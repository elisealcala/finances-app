"use client";

import { useState, useMemo } from "react";
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
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { cn, formatCurrency } from "@/lib/utils";
import { useAddScheduleCapitalPayment } from "../hooks/use-installments";
import { generateEqualPaymentSchedule } from "../utils/schedule";
import { computeScheduleBalance } from "../utils/balance";
import { EditableScheduleTable, type ScheduleRow } from "./schedule-table";
import type { Debt } from "../types";

type CapitalPaymentDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  debt: Debt;
};

type TermOption = "reduce_payment" | "reduce_term";

export function CapitalPaymentDialog({
  open,
  onOpenChange,
  debt,
}: CapitalPaymentDialogProps) {
  const mutation = useAddScheduleCapitalPayment();

  const [amount, setAmount] = useState(0);
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");
  const [termOption, setTermOption] = useState<TermOption>("reduce_payment");
  const [newTermMonths, setNewTermMonths] = useState(0);
  const [installments, setInstallments] = useState<ScheduleRow[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const debtInstallments = debt.installments ?? [];
  const paidInstallments = debtInstallments.filter((i) => i.status === "PAID");
  const pendingInstallments = debtInstallments.filter((i) => i.status === "PENDING");
  const lastPaidNumber =
    paidInstallments.length > 0
      ? Math.max(...paidInstallments.map((i) => i.installmentNumber))
      : 0;

  const remainingBalance = useMemo(
    () =>
      computeScheduleBalance(
        debtInstallments.map((i) => ({
          capital: i.capital,
          status: i.status,
        })),
      ),
    [debtInstallments],
  );

  const newBalance = useMemo(
    () => Math.max(Math.round((remainingBalance - amount) * 100) / 100, 0),
    [remainingBalance, amount],
  );

  function handleGenerate() {
    if (amount <= 0 || newBalance <= 0) return;

    const firstPending = pendingInstallments[0];
    if (!firstPending) return;

    const dueDate = new Date(firstPending.dueDate);
    const dueDay = dueDate.getDate();
    const fees = debt.fees;
    const remainingMonths =
      termOption === "reduce_payment"
        ? pendingInstallments.length
        : newTermMonths || pendingInstallments.length;

    if (remainingMonths <= 0) return;

    const startDate = new Date(
      dueDate.getFullYear(),
      dueDate.getMonth() - 1,
      dueDay,
    );

    const schedule = generateEqualPaymentSchedule({
      balance: newBalance,
      interestRate: debt.interestRate,
      termMonths: remainingMonths,
      startDate,
      dueDay,
      fees: fees.length > 0 ? fees : undefined,
    });

    setInstallments(
      schedule.map((inst, idx) => ({
        ...inst,
        installmentNumber: lastPaidNumber + 1 + idx,
      })),
    );
  }

  function handleAddCustomRow() {
    if (installments.length === 0) {
      const firstPending = pendingInstallments[0];
      const dueDate = firstPending
        ? new Date(firstPending.dueDate)
        : new Date();
      const row: ScheduleRow = {
        installmentNumber: lastPaidNumber + 1,
        dueDate,
        capital: 0,
        interest: 0,
        fees: debt.fees.map((f) => ({ name: f.name, amount: 0 })),
        totalAmount: 0,
      };
      setInstallments([row]);
    }
  }

  function validate(): boolean {
    const newErrors: Record<string, string> = {};
    if (amount <= 0) newErrors.amount = "Amount must be greater than 0";
    if (amount > remainingBalance)
      newErrors.amount = "Amount cannot exceed the remaining balance";
    if (newBalance > 0 && installments.length === 0) {
      newErrors.schedule = "Generate or add installments for the new schedule";
    }
    if (termOption === "reduce_term" && newTermMonths <= 0 && installments.length === 0) {
      newErrors.newTermMonths = "Must be at least 1 month";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit() {
    if (!validate()) return;

    const payload =
      newBalance <= 0
        ? {
            debtId: debt.id,
            amount,
            date: new Date(date),
            notes: notes || null,
            mode: "auto" as const,
            termOption: "reduce_term" as const,
            newTermMonths: 1,
          }
        : {
            debtId: debt.id,
            amount,
            date: new Date(date),
            notes: notes || null,
            mode: "custom" as const,
            customInstallments: installments.map((inst) => ({
              installmentNumber: inst.installmentNumber,
              dueDate: inst.dueDate,
              capital: inst.capital,
              interest: inst.interest,
              fees:
                inst.fees.filter((f) => f.amount > 0).length > 0
                  ? inst.fees.filter((f) => f.amount > 0)
                  : undefined,
            })),
          };

    await mutation.mutateAsync(payload);

    // Reset and close
    setAmount(0);
    setNotes("");
    setInstallments([]);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle>Capital Payment</DialogTitle>
          <DialogDescription>
            Record a capital payment and regenerate the remaining installments.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          {/* Payment Details */}
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="cp-amount">Amount *</Label>
              <Input
                id="cp-amount"
                type="number"
                step="0.01"
                min="0"
                value={amount || ""}
                onChange={(e) =>
                  setAmount(parseFloat(e.target.value) || 0)
                }
              />
              {errors.amount && (
                <p className="text-destructive text-sm">{errors.amount}</p>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="cp-date">Date *</Label>
              <Input
                id="cp-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="cp-notes">Notes</Label>
            <Textarea
              id="cp-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes..."
              rows={2}
            />
          </div>

          {/* Balance summary */}
          {amount > 0 && (
            <div className="bg-muted/50 flex items-center justify-between rounded-md p-3 text-sm">
              <div>
                <span className="text-muted-foreground">Remaining:</span>{" "}
                <span className="font-medium">
                  {formatCurrency(remainingBalance)}
                </span>
              </div>
              <span className="text-muted-foreground">&rarr;</span>
              <div>
                <span className="text-muted-foreground">New balance:</span>{" "}
                <span className="font-medium">
                  {formatCurrency(newBalance)}
                </span>
              </div>
            </div>
          )}

          <Separator />

          {/* Schedule regeneration */}
          <div className="space-y-3">
            <Label>Schedule Regeneration</Label>

            {newBalance <= 0 && amount > 0 ? (
              <p className="text-sm text-green-600">
                This payment covers the entire remaining balance. The debt
                will be marked as paid off.
              </p>
            ) : (
              <>
                {/* Term options + generate */}
                <div className="space-y-3">
                  <div className="flex gap-3">
                    <label
                      className={cn(
                        "flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors",
                        termOption === "reduce_payment"
                          ? "border-primary bg-primary/5 text-primary"
                          : "border-muted hover:border-muted-foreground/30",
                      )}
                    >
                      <input
                        type="radio"
                        name="termOption"
                        checked={termOption === "reduce_payment"}
                        onChange={() => setTermOption("reduce_payment")}
                        className="sr-only"
                      />
                      <span
                        className={cn(
                          "flex h-4 w-4 items-center justify-center rounded-full border-2",
                          termOption === "reduce_payment"
                            ? "border-primary"
                            : "border-muted-foreground/40",
                        )}
                      >
                        {termOption === "reduce_payment" && (
                          <span className="bg-primary h-2 w-2 rounded-full" />
                        )}
                      </span>
                      Reduce payment ({pendingInstallments.length} months)
                    </label>
                    <label
                      className={cn(
                        "flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors",
                        termOption === "reduce_term"
                          ? "border-primary bg-primary/5 text-primary"
                          : "border-muted hover:border-muted-foreground/30",
                      )}
                    >
                      <input
                        type="radio"
                        name="termOption"
                        checked={termOption === "reduce_term"}
                        onChange={() => setTermOption("reduce_term")}
                        className="sr-only"
                      />
                      <span
                        className={cn(
                          "flex h-4 w-4 items-center justify-center rounded-full border-2",
                          termOption === "reduce_term"
                            ? "border-primary"
                            : "border-muted-foreground/40",
                        )}
                      >
                        {termOption === "reduce_term" && (
                          <span className="bg-primary h-2 w-2 rounded-full" />
                        )}
                      </span>
                      Reduce term
                    </label>
                  </div>

                  {termOption === "reduce_term" && (
                    <div className="grid gap-2">
                      <Label htmlFor="cp-term">New remaining months</Label>
                      <Input
                        id="cp-term"
                        type="number"
                        min="1"
                        max="360"
                        value={newTermMonths || ""}
                        onChange={(e) =>
                          setNewTermMonths(parseInt(e.target.value) || 0)
                        }
                        className="w-32"
                      />
                      {errors.newTermMonths && (
                        <p className="text-destructive text-sm">
                          {errors.newTermMonths}
                        </p>
                      )}
                    </div>
                  )}

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleGenerate}
                    disabled={amount <= 0 || newBalance <= 0}
                  >
                    Generate Schedule
                  </Button>
                </div>

                {/* Editable schedule table */}
                {installments.length > 0 ? (
                  <EditableScheduleTable
                    rows={installments}
                    onChange={setInstallments}
                  />
                ) : (
                  <div className="rounded-md border border-dashed py-6 text-center">
                    <p className="text-muted-foreground mb-3 text-sm">
                      Generate a schedule above or enter one manually.
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleAddCustomRow}
                    >
                      + Add First Installment
                    </Button>
                  </div>
                )}
                {errors.schedule && (
                  <p className="text-destructive text-sm">{errors.schedule}</p>
                )}
              </>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={mutation.isPending}>
            {mutation.isPending ? "Applying..." : "Apply Payment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
