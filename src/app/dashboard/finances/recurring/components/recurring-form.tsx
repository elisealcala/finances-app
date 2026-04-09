"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAccounts } from "@/hooks/use-accounts";
import { useCreateRecurring, useUpdateRecurring } from "@/hooks/use-recurring";
import type { RecurringTransaction } from "@/types/prediction";

const FREQUENCY_LABELS: Record<string, string> = {
  MONTHLY: "Monthly",
  BIWEEKLY: "Biweekly",
  WEEKLY: "Weekly",
  QUARTERLY: "Quarterly",
  YEARLY: "Yearly",
};

const TYPE_LABELS: Record<string, string> = {
  INCOME: "Income",
  EXPENSE: "Expense",
};

type RecurringFormProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editItem?: RecurringTransaction | null;
};

export function RecurringForm({
  open,
  onOpenChange,
  editItem,
}: RecurringFormProps) {
  const isEditing = !!editItem;
  const { data: accountsData } = useAccounts();
  const createRecurring = useCreateRecurring();
  const updateRecurring = useUpdateRecurring();

  const [name, setName] = useState(editItem?.name ?? "");
  const [amount, setAmount] = useState(editItem?.amount ?? 0);
  const [type, setType] = useState<"INCOME" | "EXPENSE">(
    editItem?.type ?? "EXPENSE",
  );
  const [frequency, setFrequency] = useState(
    editItem?.frequency ?? "MONTHLY",
  );
  const [dayOfMonth, setDayOfMonth] = useState<number | null>(
    editItem?.dayOfMonth ?? null,
  );
  const [accountId, setAccountId] = useState(editItem?.accountId ?? "");
  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate(): boolean {
    const newErrors: Record<string, string> = {};
    if (!name.trim()) newErrors.name = "Name is required";
    if (amount <= 0) newErrors.amount = "Amount must be positive";
    if (!accountId) newErrors.accountId = "Account is required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    if (isEditing) {
      await updateRecurring.mutateAsync({
        id: editItem.id,
        name,
        amount,
        type,
        frequency: frequency as "MONTHLY" | "BIWEEKLY" | "WEEKLY" | "QUARTERLY" | "YEARLY",
        dayOfMonth,
        accountId,
      });
    } else {
      await createRecurring.mutateAsync({
        name,
        amount,
        type,
        frequency: frequency as "MONTHLY" | "BIWEEKLY" | "WEEKLY" | "QUARTERLY" | "YEARLY",
        dayOfMonth,
        startDate: new Date(),
        accountId,
      });
    }

    onOpenChange(false);
  }

  const isPending = createRecurring.isPending || updateRecurring.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              {isEditing ? "Edit Recurring Transaction" : "New Recurring Transaction"}
            </DialogTitle>
            <DialogDescription>
              {isEditing
                ? "Update this recurring income or expense."
                : "Add a predictable repeating income or expense."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="rt-name">Name</Label>
              <Input
                id="rt-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Rent, Salary, Netflix"
              />
              {errors.name && (
                <p className="text-destructive text-sm">{errors.name}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="rt-amount">Amount</Label>
                <Input
                  id="rt-amount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={amount || ""}
                  onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                />
                {errors.amount && (
                  <p className="text-destructive text-sm">{errors.amount}</p>
                )}
              </div>
              <div className="grid gap-2">
                <Label>Type</Label>
                <Select value={type} onValueChange={(v) => setType(v as "INCOME" | "EXPENSE")}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(TYPE_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Frequency</Label>
                <Select value={frequency} onValueChange={(v) => setFrequency(v as typeof frequency)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(FREQUENCY_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="rt-day">Day of Month</Label>
                <Input
                  id="rt-day"
                  type="number"
                  min="1"
                  max="31"
                  value={dayOfMonth ?? ""}
                  onChange={(e) =>
                    setDayOfMonth(
                      e.target.value ? parseInt(e.target.value) : null,
                    )
                  }
                  placeholder="e.g. 1, 15"
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Account</Label>
              <Select value={accountId} onValueChange={setAccountId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select account" />
                </SelectTrigger>
                <SelectContent>
                  {accountsData?.accounts?.map((acc) => (
                    <SelectItem key={acc.id} value={acc.id}>
                      {acc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.accountId && (
                <p className="text-destructive text-sm">{errors.accountId}</p>
              )}
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
              {isPending ? "Saving..." : isEditing ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
