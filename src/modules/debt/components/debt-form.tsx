"use client";

import { useState, useEffect } from "react";
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
import { cn, DEBT_TYPE_LABELS } from "@/lib/utils";
import { useCreateDebt, useUpdateDebt } from "../hooks/use-debts";
import { DEBT_COLOR_PALETTE } from "../lib/colors";
import type { Debt } from "../types";
import type { CreateDebtInput } from "../schema";

type DebtFormProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  debt?: Debt | null;
};

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: currentYear - 2020 + 2 }, (_, i) => 2020 + i);

const INITIAL_STATE: CreateDebtInput = {
  name: "",
  type: "CREDIT_CARD",
  balance: 0,
  interestRate: 0,
  minimumPayment: 0,
  dueDate: null,
  lender: null,
  notes: null,
  color: null,
  startedAt: null,
  status: "ACTIVE",
};

export function DebtForm({ open, onOpenChange, debt }: DebtFormProps) {
  const [form, setForm] = useState<CreateDebtInput>(INITIAL_STATE);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [startedMonth, setStartedMonth] = useState("");
  const [startedYear, setStartedYear] = useState("");

  const createDebt = useCreateDebt();
  const updateDebt = useUpdateDebt();

  const isEditing = !!debt;
  const isPending = createDebt.isPending || updateDebt.isPending;

  useEffect(() => {
    if (debt) {
      setForm({
        name: debt.name,
        type: debt.type,
        balance: Number(debt.balance),
        interestRate: Number(debt.interestRate),
        minimumPayment: Number(debt.minimumPayment),
        dueDate: debt.dueDate,
        lender: debt.lender,
        notes: debt.notes,
        color: debt.color ?? null,
        startedAt: debt.startedAt ? new Date(debt.startedAt) : null,
        status: debt.status,
      });
      if (debt.startedAt) {
        const d = new Date(debt.startedAt);
        setStartedMonth(d.getMonth().toString());
        setStartedYear(d.getFullYear().toString());
      } else {
        setStartedMonth("");
        setStartedYear("");
      }
    } else {
      setForm(INITIAL_STATE);
      setStartedMonth("");
      setStartedYear("");
    }
    setErrors({});
  }, [debt, open]);

  useEffect(() => {
    if (startedMonth !== "" && startedYear !== "") {
      setForm((prev) => ({
        ...prev,
        startedAt: new Date(parseInt(startedYear), parseInt(startedMonth), 1),
      }));
    } else {
      setForm((prev) => ({ ...prev, startedAt: null }));
    }
  }, [startedMonth, startedYear]);

  function validate(): boolean {
    const newErrors: Record<string, string> = {};
    if (!form.name.trim()) newErrors.name = "Name is required";
    if (form.balance < 0) newErrors.balance = "Balance must be non-negative";
    if (form.interestRate < 0 || form.interestRate > 100)
      newErrors.interestRate = "Rate must be 0-100";
    if (form.minimumPayment < 0)
      newErrors.minimumPayment = "Must be non-negative";
    if (form.dueDate !== null && form.dueDate !== undefined) {
      if (form.dueDate < 1 || form.dueDate > 31)
        newErrors.dueDate = "Day must be 1-31";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    if (isEditing && debt) {
      await updateDebt.mutateAsync({ id: debt.id, ...form });
    } else {
      await createDebt.mutateAsync(form);
    }
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{isEditing ? "Edit Debt" : "Add Debt"}</DialogTitle>
            <DialogDescription>
              {isEditing
                ? "Update your debt details below."
                : "Enter the details for your new debt."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Chase Visa"
              />
              {errors.name && (
                <p className="text-destructive text-sm">{errors.name}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="type">Type *</Label>
                <Select
                  value={form.type}
                  onValueChange={(value) =>
                    setForm({
                      ...form,
                      type: value as CreateDebtInput["type"],
                    })
                  }
                >
                  <SelectTrigger id="type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(DEBT_TYPE_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={form.status}
                  onValueChange={(value) =>
                    setForm({
                      ...form,
                      status: value as CreateDebtInput["status"],
                    })
                  }
                >
                  <SelectTrigger id="status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ACTIVE">Active</SelectItem>
                    <SelectItem value="PAID_OFF">Paid Off</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="balance">Balance (S/.) *</Label>
                <Input
                  id="balance"
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.balance}
                  onChange={(e) =>
                    setForm({ ...form, balance: parseFloat(e.target.value) || 0 })
                  }
                />
                {errors.balance && (
                  <p className="text-destructive text-sm">{errors.balance}</p>
                )}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="interestRate">Rate (%) *</Label>
                <Input
                  id="interestRate"
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={form.interestRate}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      interestRate: parseFloat(e.target.value) || 0,
                    })
                  }
                />
                {errors.interestRate && (
                  <p className="text-destructive text-sm">
                    {errors.interestRate}
                  </p>
                )}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="minimumPayment">Min Payment (S/.) *</Label>
                <Input
                  id="minimumPayment"
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.minimumPayment}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      minimumPayment: parseFloat(e.target.value) || 0,
                    })
                  }
                />
                {errors.minimumPayment && (
                  <p className="text-destructive text-sm">
                    {errors.minimumPayment}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Started (Month)</Label>
                <Select
                  value={startedMonth}
                  onValueChange={setStartedMonth}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Month" />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTHS.map((m, i) => (
                      <SelectItem key={i} value={String(i)}>
                        {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label>Started (Year)</Label>
                <Select
                  value={startedYear}
                  onValueChange={setStartedYear}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Year" />
                  </SelectTrigger>
                  <SelectContent>
                    {YEARS.map((y) => (
                      <SelectItem key={y} value={String(y)}>
                        {y}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="dueDate">Due Date (day of month)</Label>
                <Input
                  id="dueDate"
                  type="number"
                  min="1"
                  max="31"
                  value={form.dueDate ?? ""}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      dueDate: e.target.value
                        ? parseInt(e.target.value)
                        : null,
                    })
                  }
                  placeholder="1-31"
                />
                {errors.dueDate && (
                  <p className="text-destructive text-sm">{errors.dueDate}</p>
                )}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="lender">Lender</Label>
                <Input
                  id="lender"
                  value={form.lender ?? ""}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      lender: e.target.value || null,
                    })
                  }
                  placeholder="e.g. Interbank"
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Color</Label>
              <div className="flex gap-2">
                {DEBT_COLOR_PALETTE.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={cn(
                      "h-7 w-7 rounded-full border-2 transition-all",
                      form.color === c
                        ? "border-foreground scale-110"
                        : "border-transparent",
                    )}
                    style={{ backgroundColor: c }}
                    onClick={() => setForm({ ...form, color: c })}
                  />
                ))}
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={form.notes ?? ""}
                onChange={(e) =>
                  setForm({ ...form, notes: e.target.value || null })
                }
                placeholder="Any additional notes..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending
                ? "Saving..."
                : isEditing
                  ? "Update Debt"
                  : "Add Debt"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
