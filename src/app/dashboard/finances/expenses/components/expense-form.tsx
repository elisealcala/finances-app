"use client";

import { useState, useEffect, useMemo } from "react";
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
import { CURRENCY_LABELS } from "@/lib/utils";
import { useCreateExpense, useUpdateExpense } from "@/hooks/use-expenses";
import { useAccounts } from "@/hooks/use-accounts";
import { useCategories } from "@/hooks/use-categories";
import { useStatements } from "@/hooks/use-statements";
import type { Expense, Account, Category } from "@/types/finances";
import type { CreateExpenseInput } from "@/server/trpc/schemas/finances.schema";

type ExpenseFormProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expense?: Expense | null;
};

const INITIAL_STATE: CreateExpenseInput = {
  name: "",
  amount: 0,
  date: new Date(),
  paymentStatus: "PAID",
  currency: null,
  notes: null,
  accountId: "",
  categoryId: null,
  payingAccountId: null,
  paymentDueDate: null,
  statementId: null,
};

export function ExpenseForm({ open, onOpenChange, expense }: ExpenseFormProps) {
  const [form, setForm] = useState<CreateExpenseInput>(INITIAL_STATE);
  const [dateStr, setDateStr] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [paymentDueDateStr, setPaymentDueDateStr] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const createExpense = useCreateExpense();
  const updateExpense = useUpdateExpense();
  const { data: accountsData } = useAccounts({ isArchived: false });
  const { data: categoriesData } = useCategories({ isArchived: false });

  const accounts = (accountsData?.accounts ?? []) as Account[];
  const categories = (categoriesData?.categories ?? []) as Category[];

  const isEditing = !!expense;
  const isPending = createExpense.isPending || updateExpense.isPending;

  // Determine if the selected account is a credit card
  const selectedAccount = accounts.find((a) => a.id === form.accountId);
  const isCreditCard = selectedAccount?.type === "CREDIT_CARD";

  // Currency options for dual-currency cards
  const currencyOptions = useMemo(() => {
    if (!isCreditCard || !selectedAccount) return [];
    const options = [selectedAccount.currency];
    if (
      selectedAccount.secondaryCurrency &&
      selectedAccount.secondaryCurrency !== selectedAccount.currency
    ) {
      options.push(selectedAccount.secondaryCurrency);
    }
    return options;
  }, [isCreditCard, selectedAccount]);

  // Non-credit-card accounts for paying account selector
  const payingAccounts = accounts.filter((a) => a.type !== "CREDIT_CARD");

  // Fetch open statements for the selected credit card
  const { data: statementsData } = useStatements(
    isCreditCard && form.accountId
      ? { accountId: form.accountId, status: "OPEN" }
      : undefined,
  );
  const openStatements = statementsData?.statements ?? [];

  useEffect(() => {
    if (expense) {
      const d = new Date(expense.date);
      setForm({
        name: expense.name,
        amount: expense.amount,
        date: d,
        paymentStatus: expense.paymentStatus,
        currency: expense.currency ?? null,
        notes: expense.notes ?? null,
        accountId: expense.accountId,
        categoryId: expense.categoryId ?? null,
        payingAccountId: expense.payingAccountId ?? null,
        paymentDueDate: expense.paymentDueDate
          ? new Date(expense.paymentDueDate)
          : null,
        statementId: expense.statementId ?? null,
      });
      setDateStr(d.toISOString().split("T")[0]);
      setPaymentDueDateStr(
        expense.paymentDueDate
          ? new Date(expense.paymentDueDate).toISOString().split("T")[0]
          : "",
      );
    } else {
      setForm((prev) => ({
        ...INITIAL_STATE,
        accountId: prev.accountId || "",
      }));
      setDateStr(new Date().toISOString().split("T")[0]);
      setPaymentDueDateStr("");
    }
    setErrors({});
  }, [expense, open]);

  useEffect(() => {
    if (!expense && !form.accountId && accounts.length > 0) {
      setForm((prev) => ({ ...prev, accountId: accounts[0].id }));
    }
  }, [accounts, expense, form.accountId]);

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

    const data = {
      ...form,
      date: new Date(`${dateStr}T00:00:00`),
      paymentDueDate: paymentDueDateStr
        ? new Date(`${paymentDueDateStr}T00:00:00`)
        : null,
    };

    if (isEditing && expense) {
      await updateExpense.mutateAsync({ id: expense.id, ...data });
    } else {
      await createExpense.mutateAsync(data);
    }
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              {isEditing ? "Edit Expense" : "Add Expense"}
            </DialogTitle>
            <DialogDescription>
              {isEditing
                ? "Update expense details."
                : "Record a new expense."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="exp-name">Name *</Label>
              <Input
                id="exp-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Grocery shopping"
              />
              {errors.name && (
                <p className="text-destructive text-sm">{errors.name}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="exp-amount">Amount *</Label>
                <Input
                  id="exp-amount"
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
                <Label htmlFor="exp-date">Date *</Label>
                <Input
                  id="exp-date"
                  type="date"
                  value={dateStr}
                  onChange={(e) => setDateStr(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="exp-account">Account *</Label>
                <Select
                  value={form.accountId}
                  onValueChange={(v) =>
                    setForm({
                      ...form,
                      accountId: v,
                      // Reset CC-specific fields when changing account
                      currency: null,
                      statementId: null,
                      payingAccountId: null,
                    })
                  }
                >
                  <SelectTrigger id="exp-account">
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
                <Label htmlFor="exp-category">Category</Label>
                <Select
                  value={form.categoryId ?? "none"}
                  onValueChange={(v) =>
                    setForm({ ...form, categoryId: v === "none" ? null : v })
                  }
                >
                  <SelectTrigger id="exp-category">
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

            {/* Credit card specific fields */}
            {isCreditCard && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  {currencyOptions.length > 1 && (
                    <div className="grid gap-2">
                      <Label htmlFor="exp-currency">Currency</Label>
                      <Select
                        value={
                          form.currency ??
                          selectedAccount?.currency ??
                          "PEN"
                        }
                        onValueChange={(v) =>
                          setForm({
                            ...form,
                            currency: v as CreateExpenseInput["currency"],
                          })
                        }
                      >
                        <SelectTrigger id="exp-currency">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {currencyOptions.map((c) => (
                            <SelectItem key={c} value={c}>
                              {CURRENCY_LABELS[c as keyof typeof CURRENCY_LABELS] ?? c}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div className="grid gap-2">
                    <Label htmlFor="exp-paying-account">Paying Account</Label>
                    <Select
                      value={form.payingAccountId ?? "none"}
                      onValueChange={(v) =>
                        setForm({
                          ...form,
                          payingAccountId: v === "none" ? null : v,
                        })
                      }
                    >
                      <SelectTrigger id="exp-paying-account">
                        <SelectValue placeholder="None" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {payingAccounts.map((a) => (
                          <SelectItem key={a.id} value={a.id}>
                            {a.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="exp-statement">Statement</Label>
                    <Select
                      value={form.statementId ?? "none"}
                      onValueChange={(v) =>
                        setForm({
                          ...form,
                          statementId: v === "none" ? null : v,
                        })
                      }
                    >
                      <SelectTrigger id="exp-statement">
                        <SelectValue placeholder="None" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {openStatements.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.month}/{s.year}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {!form.statementId && (
                    <div className="grid gap-2">
                      <Label htmlFor="exp-payment-due">Payment Due Date</Label>
                      <Input
                        id="exp-payment-due"
                        type="date"
                        value={paymentDueDateStr}
                        onChange={(e) =>
                          setPaymentDueDateStr(e.target.value)
                        }
                      />
                    </div>
                  )}
                </div>
              </>
            )}

            <div className="grid gap-2">
              <Label htmlFor="exp-notes">Notes</Label>
              <Textarea
                id="exp-notes"
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
                  ? "Update Expense"
                  : "Add Expense"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
