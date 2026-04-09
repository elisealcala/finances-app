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
import { useAccounts } from "@/hooks/use-accounts";
import { useIncomes, useDeleteIncome } from "@/hooks/use-incomes";
import { usePeriodFilter } from "../../hooks/use-period-filter";
import { PeriodSelector } from "../../components/period-selector";
import { IncomeTable } from "./income-table";
import { IncomeForm } from "./income-form";
import type { Income } from "@/types/finances";

export function IncomesPageClient() {
  const period = usePeriodFilter();
  const [accountId, setAccountId] = useState<string | undefined>();
  const { data: accountsData } = useAccounts();
  const { data, isLoading } = useIncomes({
    year: period.year,
    month: period.month,
    accountId,
  });
  const deleteIncome = useDeleteIncome();

  const [formOpen, setFormOpen] = useState(false);
  const [editingIncome, setEditingIncome] = useState<Income | null>(null);
  const [deletingIncome, setDeletingIncome] = useState<Income | null>(null);

  const incomes = (data?.incomes ?? []) as Income[];
  const totalsByCurrency = (data?.totalsByCurrency ?? {}) as Record<string, number>;

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
            Track your earnings. Total:{" "}
            {Object.entries(totalsByCurrency)
              .map(([currency, amount]) =>
                formatCurrency(amount, currency as "PEN" | "USD" | "EUR")
              )
              .join(" / ") || formatCurrency(0)}
          </p>
        </div>
        <Button onClick={() => setFormOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Income
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <PeriodSelector {...period} />
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
