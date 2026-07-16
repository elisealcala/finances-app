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
} from "@/hooks/use-transfers";
import { useAccounts } from "@/hooks/use-accounts";
import type { Transfer, Account, Currency } from "@/types/finances";
import type { CreateTransferInput } from "@/server/trpc/schemas/finances.schema";
import {
  CurrencyConversionField,
  getCurrencyConversionRateBasis,
  getDisplayedConversionRate,
  getEffectiveConversionRate,
} from "@/app/(app)/finances/components/currency-conversion-field";

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
  currency: null,
  rate: null,
};

type TransferFormContentProps = TransferFormProps & {
  accounts: Account[];
};

function dateInputValue(date: Date) {
  return date.toISOString().split("T")[0];
}

function getInitialTransferState(
  transfer: Transfer | null | undefined,
  accounts: Account[],
) {
  if (transfer) {
    const date = new Date(transfer.date);
    let rateStr = "";

    if (transfer.rate != null) {
      const transferFromCurrency = (transfer.fromAccount?.currency ??
        "PEN") as Currency;
      const transferToCurrency = (transfer.toAccount?.currency ??
        "PEN") as Currency;
      const rateBasis = getCurrencyConversionRateBasis(
        transferFromCurrency,
        transferToCurrency,
      );
      rateStr = String(
        getDisplayedConversionRate(
          transfer.rate,
          transferFromCurrency,
          transferToCurrency,
          rateBasis,
        ),
      );
    }

    return {
      form: {
        name: transfer.name,
        amount: transfer.amount,
        date,
        notes: transfer.notes ?? null,
        fromAccountId: transfer.fromAccountId,
        toAccountId: transfer.toAccountId,
        currency: transfer.currency ?? null,
        rate: transfer.rate ?? null,
      },
      dateStr: dateInputValue(date),
      rateStr,
    };
  }

  const date = new Date();
  return {
    form: {
      ...INITIAL_STATE,
      date,
      fromAccountId: accounts[0]?.id ?? "",
      toAccountId: accounts[1]?.id ?? accounts[0]?.id ?? "",
    },
    dateStr: dateInputValue(date),
    rateStr: "",
  };
}

export function TransferForm({
  open,
  onOpenChange,
  transfer,
}: TransferFormProps) {
  const { data: accountsData } = useAccounts({ isArchived: false });
  const accounts = (accountsData?.accounts ?? []) as Account[];
  const accountKey = accounts
    .slice(0, 2)
    .map((account) => account.id)
    .join(":");
  const formKey = transfer ? `edit:${transfer.id}` : `new:${accountKey}`;

  return (
    <TransferFormContent
      key={`${open ? "open" : "closed"}:${formKey}`}
      open={open}
      onOpenChange={onOpenChange}
      transfer={transfer}
      accounts={accounts}
    />
  );
}

function TransferFormContent({
  open,
  onOpenChange,
  transfer,
  accounts,
}: TransferFormContentProps) {
  const initialState = getInitialTransferState(transfer, accounts);
  const [form, setForm] = useState<CreateTransferInput>(initialState.form);
  const [dateStr, setDateStr] = useState(initialState.dateStr);
  const [rateStr, setRateStr] = useState(initialState.rateStr);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const createTransfer = useCreateTransfer();
  const updateTransfer = useUpdateTransfer();

  const isEditing = !!transfer;
  const isPending = createTransfer.isPending || updateTransfer.isPending;

  const fromAccount = accounts.find((a) => a.id === form.fromAccountId);
  const toAccount = accounts.find((a) => a.id === form.toAccountId);
  const fromCurrency = (fromAccount?.currency ?? "PEN") as Currency;
  const toCurrency = (toAccount?.currency ?? "PEN") as Currency;
  const needsConversion =
    !!form.fromAccountId &&
    !!form.toAccountId &&
    form.fromAccountId !== form.toAccountId &&
    fromCurrency !== toCurrency;
  const rateBasis = getCurrencyConversionRateBasis(fromCurrency, toCurrency);

  function validate(): boolean {
    const newErrors: Record<string, string> = {};
    if (!form.name.trim()) newErrors.name = "Name is required";
    if (form.amount <= 0) newErrors.amount = "Amount must be positive";
    if (!form.fromAccountId)
      newErrors.fromAccountId = "From account is required";
    if (!form.toAccountId) newErrors.toAccountId = "To account is required";
    if (form.fromAccountId === form.toAccountId)
      newErrors.toAccountId = "Must be different from source";
    if (needsConversion) {
      const r = parseFloat(rateStr);
      if (isNaN(r) || r <= 0) newErrors.rate = "Exchange rate is required";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    const parsedRate = parseFloat(rateStr);
    const effectiveRate =
      needsConversion && !isNaN(parsedRate)
        ? getEffectiveConversionRate(
            parsedRate,
            fromCurrency,
            toCurrency,
            rateBasis,
          )
        : null;
    const data: CreateTransferInput = {
      ...form,
      date: new Date(`${dateStr}T00:00:00`),
      currency: needsConversion ? fromCurrency : null,
      rate: effectiveRate,
    };

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

            {needsConversion && (
              <>
                <CurrencyConversionField
                  fromCurrency={fromCurrency}
                  toCurrency={toCurrency}
                  rateFromCurrency={rateBasis.fromCurrency}
                  rateToCurrency={rateBasis.toCurrency}
                  amount={form.amount}
                  rate={rateStr}
                  onRateChange={setRateStr}
                  label={fromAccount?.name}
                />
                {errors.rate && (
                  <p className="text-destructive text-sm">{errors.rate}</p>
                )}
              </>
            )}

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
