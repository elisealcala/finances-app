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
import { useCreateIncome, useUpdateIncome } from "../hooks/use-incomes";
import { useAccounts } from "../hooks/use-accounts";
import { useCategories } from "../hooks/use-categories";
import type { Income, Account, Category } from "../types";
import type { CreateIncomeInput } from "../schema";

type IncomeFormProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  income?: Income | null;
};

const INITIAL_STATE: CreateIncomeInput = {
  name: "",
  amount: 0,
  date: new Date(),
  notes: null,
  accountId: "",
  categoryId: null,
};

export function IncomeForm({ open, onOpenChange, income }: IncomeFormProps) {
  const [form, setForm] = useState<CreateIncomeInput>(INITIAL_STATE);
  const [dateStr, setDateStr] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [errors, setErrors] = useState<Record<string, string>>({});

  const createIncome = useCreateIncome();
  const updateIncome = useUpdateIncome();
  const { data: accountsData } = useAccounts({ isArchived: false });
  const { data: categoriesData } = useCategories({ isArchived: false });

  const accounts = (accountsData?.accounts ?? []) as Account[];
  const categories = (categoriesData?.categories ?? []) as Category[];

  const isEditing = !!income;
  const isPending = createIncome.isPending || updateIncome.isPending;

  useEffect(() => {
    if (income) {
      const d = new Date(income.date);
      setForm({
        name: income.name,
        amount: income.amount,
        date: d,
        notes: income.notes ?? null,
        accountId: income.accountId,
        categoryId: income.categoryId ?? null,
      });
      setDateStr(d.toISOString().split("T")[0]);
    } else {
      setForm((prev) => ({
        ...INITIAL_STATE,
        accountId: prev.accountId || "",
      }));
      setDateStr(new Date().toISOString().split("T")[0]);
    }
    setErrors({});
  }, [income, open]);

  useEffect(() => {
    if (!income && !form.accountId && accounts.length > 0) {
      setForm((prev) => ({ ...prev, accountId: accounts[0].id }));
    }
  }, [accounts, income, form.accountId]);

  function validate(): boolean {
    const newErrors: Record<string, string> = {};
    if (!form.name.trim()) newErrors.name = "Name is required";
    if (form.amount <= 0) newErrors.amount = "Amount must be positive";
    if (!form.accountId) newErrors.accountId = "Account is required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    const data = { ...form, date: new Date(`${dateStr}T00:00:00`) };

    if (isEditing && income) {
      await updateIncome.mutateAsync({ id: income.id, ...data });
    } else {
      await createIncome.mutateAsync(data);
    }
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              {isEditing ? "Edit Income" : "Add Income"}
            </DialogTitle>
            <DialogDescription>
              {isEditing ? "Update income details." : "Record a new income."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="inc-name">Name *</Label>
              <Input
                id="inc-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Monthly salary"
              />
              {errors.name && (
                <p className="text-destructive text-sm">{errors.name}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="inc-amount">Amount *</Label>
                <Input
                  id="inc-amount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.amount}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      amount: parseFloat(e.target.value) || 0,
                    })
                  }
                />
                {errors.amount && (
                  <p className="text-destructive text-sm">{errors.amount}</p>
                )}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="inc-date">Date *</Label>
                <Input
                  id="inc-date"
                  type="date"
                  value={dateStr}
                  onChange={(e) => setDateStr(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="inc-account">Account *</Label>
                <Select
                  value={form.accountId}
                  onValueChange={(v) => setForm({ ...form, accountId: v })}
                >
                  <SelectTrigger id="inc-account">
                    <SelectValue placeholder="Select account" />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.accountId && (
                  <p className="text-destructive text-sm">
                    {errors.accountId}
                  </p>
                )}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="inc-category">Category</Label>
                <Select
                  value={form.categoryId ?? "none"}
                  onValueChange={(v) =>
                    setForm({ ...form, categoryId: v === "none" ? null : v })
                  }
                >
                  <SelectTrigger id="inc-category">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="inc-notes">Notes</Label>
              <Textarea
                id="inc-notes"
                value={form.notes ?? ""}
                onChange={(e) =>
                  setForm({ ...form, notes: e.target.value || null })
                }
                rows={2}
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
                  ? "Update Income"
                  : "Add Income"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
