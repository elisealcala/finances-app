"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
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
import { Plus } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { useAccounts } from "../hooks/use-accounts";
import { useExpenses, useDeleteExpense, useMarkExpensePaid } from "../hooks/use-expenses";
import { usePeriodFilter } from "../hooks/use-period-filter";
import { MonthYearFilter } from "./month-year-filter";
import { ExpenseTable } from "./expense-table";
import { ExpenseForm } from "./expense-form";
import type { Expense } from "../types";

export function ExpensesPageClient() {
  const period = usePeriodFilter();
  const [accountId, setAccountId] = useState<string | undefined>();
  const { data: accountsData } = useAccounts();
  const { data, isLoading } = useExpenses({
    year: period.year,
    month: period.month,
    accountId,
  });
  const deleteExpense = useDeleteExpense();
  const markPaid = useMarkExpensePaid();

  const [formOpen, setFormOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [deletingExpense, setDeletingExpense] = useState<Expense | null>(null);

  const expenses = (data?.expenses ?? []) as Expense[];
  const totalsByCurrency = (data?.totalsByCurrency ?? {}) as Record<string, number>;

  function handleEdit(expense: Expense) {
    setEditingExpense(expense);
    setFormOpen(true);
  }

  function handleFormClose(open: boolean) {
    setFormOpen(open);
    if (!open) setEditingExpense(null);
  }

  async function handleDelete() {
    if (!deletingExpense) return;
    await deleteExpense.mutateAsync({ id: deletingExpense.id });
    setDeletingExpense(null);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Expenses</h2>
          <p className="text-muted-foreground">
            Track your spending. Total:{" "}
            {Object.entries(totalsByCurrency)
              .map(([currency, amount]) =>
                formatCurrency(amount, currency as "PEN" | "USD" | "EUR")
              )
              .join(" / ") || formatCurrency(0)}
          </p>
        </div>
        <Button onClick={() => setFormOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Expense
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <MonthYearFilter
          year={period.year}
          month={period.month}
          onYearChange={period.setYear}
          onMonthChange={period.setMonth}
          onPrev={period.goToPrevMonth}
          onNext={period.goToNextMonth}
          onToday={period.goToCurrentMonth}
        />
        <Select
          value={accountId ?? "all"}
          onValueChange={(v) => setAccountId(v === "all" ? undefined : v)}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All accounts" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All accounts</SelectItem>
            {accountsData?.accounts?.map((account) => (
              <SelectItem key={account.id} value={account.id}>
                {account.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <ExpenseTable
        expenses={expenses}
        isLoading={isLoading}
        onEdit={handleEdit}
        onDelete={setDeletingExpense}
        onMarkPaid={(expense) =>
          markPaid.mutate({ expenseId: expense.id, createTransfer: true })
        }
      />

      <ExpenseForm
        open={formOpen}
        onOpenChange={handleFormClose}
        expense={editingExpense}
      />

      <Dialog
        open={!!deletingExpense}
        onOpenChange={(open) => !open && setDeletingExpense(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Expense</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{deletingExpense?.name}
              &quot;? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingExpense(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteExpense.isPending}
            >
              {deleteExpense.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
