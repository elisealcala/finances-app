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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  useCreateTransfer,
  useUpdateTransfer,
} from "../hooks/use-transfers";
import { useAccounts } from "../hooks/use-accounts";
import type { Transfer, Account } from "../types";
import type { CreateTransferInput } from "../schema";

type TransferFormProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transfer?: Transfer | null;
};

const INITIAL_STATE: CreateTransferInput = {
  name: "",
  amount: 0,
  date: new Date(),
  notes: null,
  fromAccountId: "",
  toAccountId: "",
};

export function TransferForm({
  open,
  onOpenChange,
  transfer,
}: TransferFormProps) {
  const [form, setForm] = useState<CreateTransferInput>(INITIAL_STATE);
  const [dateStr, setDateStr] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [errors, setErrors] = useState<Record<string, string>>({});

  const createTransfer = useCreateTransfer();
  const updateTransfer = useUpdateTransfer();
  const { data: accountsData } = useAccounts({ isArchived: false });

  const accounts = (accountsData?.accounts ?? []) as Account[];

  const isEditing = !!transfer;
  const isPending = createTransfer.isPending || updateTransfer.isPending;

  useEffect(() => {
    if (transfer) {
      const d = new Date(transfer.date);
      setForm({
        name: transfer.name,
        amount: transfer.amount,
        date: d,
        notes: transfer.notes ?? null,
        fromAccountId: transfer.fromAccountId,
        toAccountId: transfer.toAccountId,
      });
      setDateStr(d.toISOString().split("T")[0]);
    } else {
      setForm((prev) => ({
        ...INITIAL_STATE,
        fromAccountId: prev.fromAccountId || "",
        toAccountId: prev.toAccountId || "",
      }));
      setDateStr(new Date().toISOString().split("T")[0]);
    }
    setErrors({});
  }, [transfer, open]);

  useEffect(() => {
    if (!transfer && !form.fromAccountId && accounts.length > 0) {
      setForm((prev) => ({
        ...prev,
        fromAccountId: accounts[0].id,
        toAccountId: accounts[1]?.id ?? accounts[0].id,
      }));
    }
  }, [accounts, transfer, form.fromAccountId]);

  function validate(): boolean {
    const newErrors: Record<string, string> = {};
    if (!form.name.trim()) newErrors.name = "Name is required";
    if (form.amount <= 0) newErrors.amount = "Amount must be positive";
    if (!form.fromAccountId) newErrors.fromAccountId = "From account is required";
    if (!form.toAccountId) newErrors.toAccountId = "To account is required";
    if (form.fromAccountId === form.toAccountId)
      newErrors.toAccountId = "Must be different from source";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    const data = { ...form, date: new Date(dateStr) };

    if (isEditing && transfer) {
      await updateTransfer.mutateAsync({ id: transfer.id, ...data });
    } else {
      await createTransfer.mutateAsync(data);
    }
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              {isEditing ? "Edit Transfer" : "Add Transfer"}
            </DialogTitle>
            <DialogDescription>
              {isEditing
                ? "Update transfer details."
                : "Move money between accounts."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="tf-name">Name *</Label>
              <Input
                id="tf-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Savings deposit"
              />
              {errors.name && (
                <p className="text-destructive text-sm">{errors.name}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="tf-amount">Amount *</Label>
                <Input
                  id="tf-amount"
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
                <Label htmlFor="tf-date">Date *</Label>
                <Input
                  id="tf-date"
                  type="date"
                  value={dateStr}
                  onChange={(e) => setDateStr(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="tf-from">From Account *</Label>
                <Select
                  value={form.fromAccountId}
                  onValueChange={(v) =>
                    setForm({ ...form, fromAccountId: v })
                  }
                >
                  <SelectTrigger id="tf-from">
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
                {errors.fromAccountId && (
                  <p className="text-destructive text-sm">
                    {errors.fromAccountId}
                  </p>
                )}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="tf-to">To Account *</Label>
                <Select
                  value={form.toAccountId}
                  onValueChange={(v) =>
                    setForm({ ...form, toAccountId: v })
                  }
                >
                  <SelectTrigger id="tf-to">
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
                {errors.toAccountId && (
                  <p className="text-destructive text-sm">
                    {errors.toAccountId}
                  </p>
                )}
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="tf-notes">Notes</Label>
              <Textarea
                id="tf-notes"
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
                  ? "Update Transfer"
                  : "Add Transfer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
