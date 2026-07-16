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
import { cn } from "@/lib/utils";
import { useCreateCategory, useUpdateCategory } from "@/hooks/use-categories";
import { FINANCE_COLOR_PALETTE } from "@/server/trpc/services/finances/colors";
import type { Category } from "@/types/finances";
import type { CreateCategoryInput } from "@/server/trpc/schemas/finances.schema";

type CategoryFormProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category?: Category | null;
};

const INITIAL_STATE: CreateCategoryInput = {
  name: "",
  monthlyBudget: null,
  color: null,
  icon: null,
  isArchived: false,
};

export function CategoryForm({
  open,
  onOpenChange,
  category,
}: CategoryFormProps) {
  const [form, setForm] = useState<CreateCategoryInput>(INITIAL_STATE);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();

  const isEditing = !!category;
  const isPending = createCategory.isPending || updateCategory.isPending;

  useEffect(() => {
    if (category) {
      setForm({
        name: category.name,
        monthlyBudget: category.monthlyBudget,
        color: category.color ?? null,
        icon: category.icon ?? null,
        isArchived: category.isArchived,
      });
    } else {
      setForm(INITIAL_STATE);
    }
    setErrors({});
  }, [category, open]);

  function validate(): boolean {
    const newErrors: Record<string, string> = {};
    if (!form.name.trim()) newErrors.name = "Name is required";
    if (form.monthlyBudget != null && form.monthlyBudget < 0)
      newErrors.monthlyBudget = "Budget must be non-negative";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    if (isEditing && category) {
      await updateCategory.mutateAsync({ id: category.id, ...form });
    } else {
      await createCategory.mutateAsync(form);
    }
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              {isEditing ? "Edit Category" : "Add Category"}
            </DialogTitle>
            <DialogDescription>
              {isEditing
                ? "Update your category details."
                : "Create a new category for your transactions."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="cat-name">Name *</Label>
              <Input
                id="cat-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Food & Dining"
              />
              {errors.name && (
                <p className="text-destructive text-sm">{errors.name}</p>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="monthlyBudget">Monthly Budget</Label>
              <Input
                id="monthlyBudget"
                type="number"
                step="0.01"
                min="0"
                value={form.monthlyBudget ?? ""}
                onChange={(e) =>
                  setForm({
                    ...form,
                    monthlyBudget: e.target.value
                      ? parseFloat(e.target.value)
                      : null,
                  })
                }
                placeholder="Optional"
              />
              {errors.monthlyBudget && (
                <p className="text-destructive text-sm">
                  {errors.monthlyBudget}
                </p>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="icon">Icon (Lucide name)</Label>
              <Input
                id="icon"
                value={form.icon ?? ""}
                onChange={(e) =>
                  setForm({ ...form, icon: e.target.value || null })
                }
                placeholder="e.g. utensils"
              />
            </div>

            <div className="grid gap-2">
              <Label>Color</Label>
              <div className="flex gap-2">
                {FINANCE_COLOR_PALETTE.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={cn(
                      "h-7 w-7 rounded-full border-2 transition-all",
                      form.color === c
                        ? "border-foreground scale-110"
                        : "border-transparent",
                    )}
                    style={{ backgroundColor: c }}
                    onClick={() => setForm({ ...form, color: c })}
                  />
                ))}
              </div>
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
                  ? "Update Category"
                  : "Add Category"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
