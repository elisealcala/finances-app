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
import { useUpdateCategory } from "@/hooks/use-categories";
import type { Category } from "@/types/finances";

type SetBudgetDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: Category[];
  budgetedCategoryIds: Set<string>;
};

export function SetBudgetDialog({
  open,
  onOpenChange,
  categories,
  budgetedCategoryIds,
}: SetBudgetDialogProps) {
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [budget, setBudget] = useState("");
  const updateCategory = useUpdateCategory();

  const availableCategories = useMemo(
    () =>
      categories.filter(
        (c) => !c.isArchived && !budgetedCategoryIds.has(c.id),
      ),
    [categories, budgetedCategoryIds],
  );

  useEffect(() => {
    if (open) {
      setSelectedCategoryId("");
      setBudget("");
    }
  }, [open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedCategoryId || !budget) return;
    await updateCategory.mutateAsync({
      id: selectedCategoryId,
      monthlyBudget: parseFloat(budget),
    });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Set Budget</DialogTitle>
            <DialogDescription>
              Assign a monthly budget to an existing category.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Category</Label>
              <Select
                value={selectedCategoryId}
                onValueChange={setSelectedCategoryId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {availableCategories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      <div className="flex items-center gap-2">
                        {cat.color && (
                          <div
                            className="h-2.5 w-2.5 rounded-full"
                            style={{ backgroundColor: cat.color }}
                          />
                        )}
                        {cat.name}
                      </div>
                    </SelectItem>
                  ))}
                  {availableCategories.length === 0 && (
                    <div className="text-muted-foreground px-2 py-4 text-center text-sm">
                      All categories already have budgets.
                    </div>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Monthly Budget</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                placeholder="e.g. 500"
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
            <Button
              type="submit"
              disabled={
                !selectedCategoryId ||
                !budget ||
                updateCategory.isPending
              }
            >
              {updateCategory.isPending ? "Saving..." : "Set Budget"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
