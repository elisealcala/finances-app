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
import { useIncomes, useDeleteIncome } from "../hooks/use-incomes";
import { usePeriodFilter } from "../hooks/use-period-filter";
import { MonthYearFilter } from "./month-year-filter";
import { IncomeTable } from "./income-table";
import { IncomeForm } from "./income-form";
import type { Income } from "../types";

export function IncomesPageClient() {
  const period = usePeriodFilter();
  const { data, isLoading } = useIncomes({
    year: period.year,
    month: period.month,
  });
  const deleteIncome = useDeleteIncome();

  const [formOpen, setFormOpen] = useState(false);
  const [editingIncome, setEditingIncome] = useState<Income | null>(null);
  const [deletingIncome, setDeletingIncome] = useState<Income | null>(null);

  const incomes = (data?.incomes ?? []) as Income[];
  const total = data?.total ?? 0;

  function handleEdit(income: Income) {
    setEditingIncome(income);
    setFormOpen(true);
  }

  function handleFormClose(open: boolean) {
    setFormOpen(open);
    if (!open) setEditingIncome(null);
  }

  async function handleDelete() {
    if (!deletingIncome) return;
    await deleteIncome.mutateAsync({ id: deletingIncome.id });
    setDeletingIncome(null);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Income</h2>
          <p className="text-muted-foreground">
            Track your earnings. Total: {formatCurrency(total)}
          </p>
        </div>
        <Button onClick={() => setFormOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Income
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

      <IncomeTable
        incomes={incomes}
        isLoading={isLoading}
        onEdit={handleEdit}
        onDelete={setDeletingIncome}
      />

      <IncomeForm
        open={formOpen}
        onOpenChange={handleFormClose}
        income={editingIncome}
      />

      <Dialog
        open={!!deletingIncome}
        onOpenChange={(open) => !open && setDeletingIncome(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Income</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{deletingIncome?.name}
              &quot;? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingIncome(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteIncome.isPending}
            >
              {deleteIncome.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
