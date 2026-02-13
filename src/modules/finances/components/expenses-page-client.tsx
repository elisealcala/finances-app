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
import { Plus } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { useExpenses, useDeleteExpense } from "../hooks/use-expenses";
import { usePeriodFilter } from "../hooks/use-period-filter";
import { MonthYearFilter } from "./month-year-filter";
import { ExpenseTable } from "./expense-table";
import { ExpenseForm } from "./expense-form";
import type { Expense } from "../types";

export function ExpensesPageClient() {
  const period = usePeriodFilter();
  const { data, isLoading } = useExpenses({
    year: period.year,
    month: period.month,
  });
  const deleteExpense = useDeleteExpense();

  const [formOpen, setFormOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [deletingExpense, setDeletingExpense] = useState<Expense | null>(null);

  const expenses = (data?.expenses ?? []) as Expense[];
  const total = data?.total ?? 0;

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
            Track your spending. Total: {formatCurrency(total)}
          </p>
        </div>
        <Button onClick={() => setFormOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Expense
        </Button>
      </div>

      <MonthYearFilter
        year={period.year}
        month={period.month}
        onYearChange={period.setYear}
        onMonthChange={period.setMonth}
        onPrev={period.goToPrevMonth}
        onNext={period.goToNextMonth}
        onToday={period.goToCurrentMonth}
      />

      <ExpenseTable
        expenses={expenses}
        isLoading={isLoading}
        onEdit={handleEdit}
        onDelete={setDeletingExpense}
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
