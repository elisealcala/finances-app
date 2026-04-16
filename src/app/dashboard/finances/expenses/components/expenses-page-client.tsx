"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { useExpenses, useDeleteExpense, useMarkExpensePaid } from "@/hooks/use-expenses";
import { useIncomes } from "@/hooks/use-incomes";
import { usePeriodFilter } from "../../hooks/use-period-filter";
import { PeriodSelector } from "../../components/period-selector";
import { DataTable } from "@/components/data-table";
import { getExpenseColumns } from "./expense-columns";
import { ExpenseForm } from "./expense-form";
import type { Expense } from "@/types/finances";

export function ExpensesPageClient() {
  const period = usePeriodFilter();
  const { data, isLoading } = useExpenses({
    year: period.year,
    month: period.month,
  });
  const { data: incomeData } = useIncomes({
    year: period.year,
    month: period.month,
  });
  const deleteExpense = useDeleteExpense();
  const markPaid = useMarkExpensePaid();

  const [formOpen, setFormOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [deletingExpense, setDeletingExpense] = useState<Expense | null>(null);
  const [filteredExpenses, setFilteredExpenses] = useState<Expense[]>([]);

  const expenses = useMemo(
    () => (data?.expenses ?? []) as Expense[],
    [data?.expenses],
  );

  const totalsByCurrency = useMemo(() => {
    const totals: Record<string, number> = {};
    for (const expense of filteredExpenses) {
      const currency = expense.currency ?? expense.account?.currency ?? "PEN";
      totals[currency] = (totals[currency] ?? 0) + Number(expense.amount);
    }
    return totals;
  }, [filteredExpenses]);

  const totalEntries = Object.entries(totalsByCurrency);
  const isFiltered = filteredExpenses.length !== expenses.length;

  const incomes = useMemo(
    () => (incomeData?.incomes ?? []) as Array<{ amount: number; category?: { name: string } | null }>,
    [incomeData],
  );

  const totalIncome = useMemo(
    () => incomes.reduce((sum, i) => sum + Number(i.amount), 0),
    [incomes],
  );

  const totalExpenses = useMemo(
    () => filteredExpenses.reduce((sum, e) => sum + Number(e.amount), 0),
    [filteredExpenses],
  );

  const categoryBreakdown = useMemo(() => {
    const map = new Map<string, { name: string; spent: number; income: number; count: number; budget: number | null }>();
    for (const expense of filteredExpenses) {
      const name = expense.category?.name ?? "Uncategorized";
      const budget = expense.category?.monthlyBudget ?? null;
      const entry = map.get(name) ?? { name, spent: 0, income: 0, count: 0, budget };
      entry.spent += Number(expense.amount);
      entry.count += 1;
      map.set(name, entry);
    }
    for (const inc of incomes) {
      const name = (inc as { category?: { name: string } | null }).category?.name;
      if (!name) continue;
      const entry = map.get(name);
      if (entry) {
        entry.income += Number(inc.amount);
      }
    }
    return [...map.values()]
      .map((cat) => ({ ...cat, total: Math.max(cat.spent - cat.income, 0) }))
      .sort((a, b) => b.total - a.total);
  }, [filteredExpenses, incomes]);

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

  const columns = useMemo(
    () =>
      getExpenseColumns({
        onEdit: handleEdit,
        onDelete: setDeletingExpense,
        onMarkPaid: (expense) =>
          markPaid.mutate({ expenseId: expense.id, createTransfer: true }),
      }),
    [markPaid],
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Expenses</h2>
          <p className="text-muted-foreground">Track your spending.</p>
        </div>
        <Button onClick={() => setFormOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Expense
        </Button>
      </div>

      <Card>
        <CardContent className="flex flex-wrap items-end gap-8 p-6">
          <div className="flex-1">
            <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
              {isFiltered ? "Filtered Total" : "Total Spent"}
            </p>
            {totalEntries.length === 0 ? (
              <p className="mt-1 text-4xl font-bold tabular-nums">
                {formatCurrency(0)}
              </p>
            ) : (
              <div className="mt-1 flex flex-wrap items-baseline gap-x-6 gap-y-1">
                {totalEntries.map(([currency, amount]) => (
                  <p key={currency} className="text-4xl font-bold tabular-nums">
                    {formatCurrency(amount, currency as "PEN" | "USD" | "EUR")}
                  </p>
                ))}
              </div>
            )}
          </div>
          <div className="text-right">
            <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
              Count
            </p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">
              {filteredExpenses.length}
              {isFiltered && (
                <span className="text-muted-foreground ml-1 text-sm font-normal">
                  / {expenses.length}
                </span>
              )}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Income vs Expenses summary */}
            <div className="space-y-3">
              <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
                Income vs Expenses
              </p>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Income</span>
                  <span className="font-mono text-sm font-semibold text-green-600 tabular-nums">
                    {formatCurrency(totalIncome)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Expenses</span>
                  <span className="font-mono text-sm font-semibold text-red-500 tabular-nums">
                    {formatCurrency(totalExpenses)}
                  </span>
                </div>
                <div className="border-border flex items-center justify-between border-t pt-2">
                  <span className="text-sm font-semibold">Balance</span>
                  <span
                    className={`font-mono text-sm font-bold tabular-nums ${
                      totalIncome - totalExpenses >= 0 ? "text-green-600" : "text-red-500"
                    }`}
                  >
                    {formatCurrency(totalIncome - totalExpenses)}
                  </span>
                </div>
              </div>
            </div>

            {/* Category breakdown */}
            <div className="space-y-3">
              <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
                Spending by Category
              </p>
              <div className="max-h-[200px] space-y-1.5 overflow-y-auto">
                {categoryBreakdown.map((cat) => (
                  <div key={cat.name} className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2 overflow-hidden">
                      <span className="truncate text-sm">{cat.name}</span>
                      <span className="text-muted-foreground text-xs tabular-nums">
                        ({cat.count})
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      {cat.budget != null && cat.budget > 0 ? (
                        <div className="bg-muted h-1.5 w-20 overflow-hidden rounded-full">
                          <div
                            className={`h-full rounded-full ${
                              cat.total > cat.budget ? "bg-red-500" : "bg-green-500"
                            }`}
                            style={{
                              width: `${Math.min((cat.total / cat.budget) * 100, 100)}%`,
                            }}
                          />
                        </div>
                      ) : (
                        <div className="bg-muted h-1.5 w-20 rounded-full" />
                      )}
                      <span className="font-mono text-sm font-medium tabular-nums">
                        {formatCurrency(cat.total)}
                        {cat.budget != null && cat.budget > 0 && (
                          <span className="text-muted-foreground text-xs">
                            {" "}/ {formatCurrency(cat.budget)}
                          </span>
                        )}
                      </span>
                    </div>
                  </div>
                ))}
                {categoryBreakdown.length === 0 && (
                  <p className="text-muted-foreground text-sm">No expenses.</p>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <PeriodSelector {...period} />

      <DataTable
        columns={columns}
        data={expenses}
        isLoading={isLoading}
        emptyMessage="No expenses for this period."
        onFilteredDataChange={setFilteredExpenses}
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
