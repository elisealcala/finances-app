"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import { useAccounts } from "../hooks/use-accounts";
import {
  useCategories,
  useDeleteCategory,
  useCategorySummary,
} from "../hooks/use-categories";
import { usePeriodFilter } from "../hooks/use-period-filter";
import { PeriodSelector } from "./period-selector";
import { CategoryForm } from "./category-form";
import type { Category } from "../types";

export function CategoriesPageClient() {
  const { data, isLoading } = useCategories();
  const deleteCategory = useDeleteCategory();

  const period = usePeriodFilter();
  const [accountId, setAccountId] = useState<string | undefined>();
  const { data: accountsData } = useAccounts();
  const { data: summaryData } = useCategorySummary({
    year: period.year,
    month: period.month,
    accountId,
  });

  const summaryMap = new Map(
    (summaryData?.items ?? []).map((item) => [item.categoryId, item]),
  );

  const [formOpen, setFormOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(
    null,
  );

  const categories = data?.categories ?? [];

  function handleEdit(category: Category) {
    setEditingCategory(category);
    setFormOpen(true);
  }

  function handleFormClose(open: boolean) {
    setFormOpen(open);
    if (!open) setEditingCategory(null);
  }

  async function handleDelete() {
    if (!deletingCategory) return;
    await deleteCategory.mutateAsync({ id: deletingCategory.id });
    setDeletingCategory(null);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Categories</h2>
          <p className="text-muted-foreground">
            Organize your transactions with categories and budgets.
          </p>
        </div>
        <Button onClick={() => setFormOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Category
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

      {isLoading ? (
        <div className="text-muted-foreground py-12 text-center">
          Loading categories...
        </div>
      ) : categories.length === 0 ? (
        <div className="text-muted-foreground py-12 text-center">
          No categories yet. Add your first category to get started.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {categories.map((category: Category) => {
            const summary = summaryMap.get(category.id);
            const spent = summary?.spent ?? 0;
            const spentByCurrency = (summary?.spentByCurrency ?? {}) as Record<string, number>;
            return (
              <Card key={category.id}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="flex items-center gap-2 text-sm font-medium">
                    {category.color && (
                      <div
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: category.color }}
                      />
                    )}
                    {category.name}
                  </CardTitle>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleEdit(category)}>
                        <Pencil className="mr-2 h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => setDeletingCategory(category)}
                        className="text-destructive"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="text-2xl font-bold">
                      {Object.keys(spentByCurrency).length > 0
                        ? Object.entries(spentByCurrency)
                            .map(([cur, amt]) =>
                              formatCurrency(amt, cur as "PEN" | "USD" | "EUR"),
                            )
                            .join(" / ")
                        : formatCurrency(0)}
                    </div>
                    <p className="text-muted-foreground text-xs">
                      spent this {period.isYearMode ? "year" : "month"}
                    </p>
                    {category.monthlyBudget != null ? (
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <Badge variant="outline">
                            Budget: {formatCurrency(category.monthlyBudget)}
                          </Badge>
                          <span
                            className={
                              (summary?.percentUsed ?? 0) > 100
                                ? "text-destructive font-medium"
                                : "text-muted-foreground"
                            }
                          >
                            {(summary?.percentUsed ?? 0).toFixed(0)}%
                          </span>
                        </div>
                        <div className="bg-secondary h-2 w-full rounded-full">
                          <div
                            className={cn(
                              "h-2 rounded-full",
                              (summary?.percentUsed ?? 0) > 100
                                ? "bg-destructive"
                                : (summary?.percentUsed ?? 0) > 80
                                  ? "bg-yellow-500"
                                  : "bg-primary",
                            )}
                            style={{
                              width: `${Math.min(summary?.percentUsed ?? 0, 100)}%`,
                            }}
                          />
                        </div>
                        <p className="text-muted-foreground text-xs">
                          {formatCurrency(summary?.remaining ?? 0)} remaining
                        </p>
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-sm">
                        No budget set
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <CategoryForm
        open={formOpen}
        onOpenChange={handleFormClose}
        category={editingCategory}
      />

      <Dialog
        open={!!deletingCategory}
        onOpenChange={(open) => !open && setDeletingCategory(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Category</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{deletingCategory?.name}
              &quot;? Transactions using this category will have their category
              removed.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeletingCategory(null)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteCategory.isPending}
            >
              {deleteCategory.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
