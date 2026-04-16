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
import {
  useBudgetStatus,
  useCategories,
  useUpdateCategory,
} from "@/hooks/use-categories";
import { usePeriodFilter } from "../../hooks/use-period-filter";
import { PeriodSelector } from "../../components/period-selector";
import { DataTable } from "@/components/data-table";
import { getBudgetColumns } from "./budget-columns";
import { SetBudgetDialog } from "./set-budget-dialog";
import { CategoryForm } from "../../categories/components/category-form";
import type { BudgetStatus, Category } from "@/types/finances";

export function BudgetPageClient() {
  const period = usePeriodFilter();
  const { data: budgets, isLoading } = useBudgetStatus(period.year, period.month);
  const { data: categoriesData } = useCategories();
  const updateCategory = useUpdateCategory();

  const [setBudgetOpen, setSetBudgetOpen] = useState(false);
  const [editFormOpen, setEditFormOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [archivingBudget, setArchivingBudget] = useState<BudgetStatus | null>(null);
  const [filteredBudgets, setFilteredBudgets] = useState<BudgetStatus[]>([]);

  const allBudgets = useMemo(() => budgets ?? [], [budgets]);

  const categories = useMemo(
    () => (categoriesData?.categories ?? []) as Category[],
    [categoriesData],
  );

  const budgetedCategoryIds = useMemo(
    () => new Set(allBudgets.map((b) => b.categoryId)),
    [allBudgets],
  );

  const totalBudget = useMemo(
    () => filteredBudgets.reduce((sum, b) => sum + b.budget, 0),
    [filteredBudgets],
  );
  const totalSpent = useMemo(
    () => filteredBudgets.reduce((sum, b) => sum + b.spent, 0),
    [filteredBudgets],
  );
  const totalRemaining = totalBudget - totalSpent;

  function handleEdit(budget: BudgetStatus) {
    const cat = categories.find((c) => c.id === budget.categoryId);
    if (cat) {
      setEditingCategory(cat);
      setEditFormOpen(true);
    }
  }

  function handleEditFormClose(open: boolean) {
    setEditFormOpen(open);
    if (!open) setEditingCategory(null);
  }

  async function handleArchive() {
    if (!archivingBudget) return;
    await updateCategory.mutateAsync({
      id: archivingBudget.categoryId,
      isArchived: !archivingBudget.isArchived,
    });
    setArchivingBudget(null);
  }

  const columns = useMemo(
    () =>
      getBudgetColumns({
        onEdit: handleEdit,
        onArchive: setArchivingBudget,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [categories],
  );

  const isFiltered = filteredBudgets.length !== allBudgets.length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Budget</h2>
          <p className="text-muted-foreground">
            Track spending against category budgets.
          </p>
        </div>
        <Button onClick={() => setSetBudgetOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Set Budget
        </Button>
      </div>

      <Card>
        <CardContent className="flex flex-wrap items-end gap-8 p-6">
          <div>
            <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
              {isFiltered ? "Filtered Budget" : "Total Budget"}
            </p>
            <p className="mt-1 text-4xl font-bold tabular-nums">
              {formatCurrency(totalBudget)}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
              Spent
            </p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-red-500">
              {formatCurrency(totalSpent)}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
              Remaining
            </p>
            <p
              className={`mt-1 text-2xl font-semibold tabular-nums ${
                totalRemaining >= 0 ? "text-green-600" : "text-red-500"
              }`}
            >
              {formatCurrency(totalRemaining)}
            </p>
          </div>
          <div className="ml-auto text-right">
            <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
              Categories
            </p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">
              {filteredBudgets.length}
              {isFiltered && (
                <span className="text-muted-foreground ml-1 text-sm font-normal">
                  / {allBudgets.length}
                </span>
              )}
            </p>
          </div>
        </CardContent>
      </Card>

      <PeriodSelector {...period} />

      <DataTable
        columns={columns}
        data={allBudgets}
        isLoading={isLoading}
        emptyMessage="No categories with budgets set."
        onFilteredDataChange={setFilteredBudgets}
        rowClassName={(row) =>
          row.isArchived ? "opacity-40 line-through" : undefined
        }
      />

      <SetBudgetDialog
        open={setBudgetOpen}
        onOpenChange={setSetBudgetOpen}
        categories={categories}
        budgetedCategoryIds={budgetedCategoryIds}
      />

      <CategoryForm
        open={editFormOpen}
        onOpenChange={handleEditFormClose}
        category={editingCategory}
      />

      <Dialog
        open={!!archivingBudget}
        onOpenChange={(open) => !open && setArchivingBudget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {archivingBudget?.isArchived ? "Unarchive" : "Archive"} Category
            </DialogTitle>
            <DialogDescription>
              {archivingBudget?.isArchived
                ? `Unarchive "${archivingBudget?.categoryName}"? It will appear in budget tracking again.`
                : `Archive "${archivingBudget?.categoryName}"? It will be hidden from budget tracking.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setArchivingBudget(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleArchive}
              disabled={updateCategory.isPending}
            >
              {updateCategory.isPending
                ? "Saving..."
                : archivingBudget?.isArchived
                  ? "Unarchive"
                  : "Archive"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
