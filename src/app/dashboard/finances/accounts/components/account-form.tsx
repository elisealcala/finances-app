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
import { cn, ACCOUNT_TYPE_LABELS, CURRENCY_LABELS } from "@/lib/utils";
import { useCreateAccount, useUpdateAccount, useAccounts } from "@/hooks/use-accounts";
import { FINANCE_COLOR_PALETTE } from "@/server/trpc/services/finances/colors";
import type { Account } from "@/types/finances";
import type { CreateAccountInput } from "@/server/trpc/schemas/finances.schema";

type AccountFormProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account?: Account | null;
};

const INITIAL_STATE: CreateAccountInput = {
  name: "",
  type: "BANK",
  opening: 0,
  currency: "PEN",
  color: null,
  notes: null,
  isArchived: false,
  creditLimit: null,
  apr: null,
  billingDay: null,
  paymentDueDay: null,
  secondaryCurrency: null,
  defaultPayingAccountId: null,
  linkToDebt: false,
};

export function AccountForm({ open, onOpenChange, account }: AccountFormProps) {
  const [form, setForm] = useState<CreateAccountInput>(INITIAL_STATE);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const createAccount = useCreateAccount();
  const updateAccount = useUpdateAccount();
  const { data: accountsData } = useAccounts({ isArchived: false });
  const allAccounts = (accountsData?.accounts ?? []) as Account[];
  const payingAccountOptions = allAccounts.filter(
    (a) => a.type !== "CREDIT_CARD" && a.id !== account?.id,
  );

  const isEditing = !!account;
  const isPending = createAccount.isPending || updateAccount.isPending;
  const isCreditCard = form.type === "CREDIT_CARD";

  useEffect(() => {
    if (account) {
      setForm({
        name: account.name,
        type: account.type,
        opening: account.opening,
        currency: account.currency,
        color: account.color ?? null,
        notes: account.notes ?? null,
        isArchived: account.isArchived,
        creditLimit: account.creditLimit,
        apr: account.apr,
        billingDay: account.billingDay,
        paymentDueDay: account.paymentDueDay,
        secondaryCurrency: account.secondaryCurrency ?? null,
        defaultPayingAccountId: account.defaultPayingAccountId ?? null,
        linkToDebt: false,
      });
    } else {
      setForm(INITIAL_STATE);
    }
    setErrors({});
  }, [account, open]);

  function validate(): boolean {
    const newErrors: Record<string, string> = {};
    if (!form.name.trim()) newErrors.name = "Name is required";
    if (isCreditCard && form.creditLimit != null && form.creditLimit < 0)
      newErrors.creditLimit = "Credit limit must be non-negative";
    if (isCreditCard && form.apr != null && (form.apr < 0 || form.apr > 100))
      newErrors.apr = "APR must be 0-100";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    if (isEditing && account) {
      await updateAccount.mutateAsync({ id: account.id, ...form });
    } else {
      await createAccount.mutateAsync(form);
    }
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              {isEditing ? "Edit Account" : "Add Account"}
            </DialogTitle>
            <DialogDescription>
              {isEditing
                ? "Update your account details below."
                : "Enter the details for your new account."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. BCP Savings"
              />
              {errors.name && (
                <p className="text-destructive text-sm">{errors.name}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="type">Type *</Label>
                <Select
                  value={form.type}
                  onValueChange={(value) =>
                    setForm({
                      ...form,
                      type: value as CreateAccountInput["type"],
                    })
                  }
                >
                  <SelectTrigger id="type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(ACCOUNT_TYPE_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="currency">Currency</Label>
                <Select
                  value={form.currency}
                  onValueChange={(value) =>
                    setForm({
                      ...form,
                      currency: value as CreateAccountInput["currency"],
                    })
                  }
                >
                  <SelectTrigger id="currency">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(CURRENCY_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="opening">Opening Balance</Label>
              <Input
                id="opening"
                type="number"
                step="0.01"
                value={form.opening}
                onChange={(e) =>
                  setForm({ ...form, opening: parseFloat(e.target.value) || 0 })
                }
              />
            </div>

            {isCreditCard && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="creditLimit">Credit Limit</Label>
                    <Input
                      id="creditLimit"
                      type="number"
                      step="0.01"
                      min="0"
                      value={form.creditLimit ?? ""}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          creditLimit: e.target.value
                            ? parseFloat(e.target.value)
                            : null,
                        })
                      }
                    />
                    {errors.creditLimit && (
                      <p className="text-destructive text-sm">
                        {errors.creditLimit}
                      </p>
                    )}
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="apr">APR (%)</Label>
                    <Input
                      id="apr"
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={form.apr ?? ""}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          apr: e.target.value
                            ? parseFloat(e.target.value)
                            : null,
                        })
                      }
                    />
                    {errors.apr && (
                      <p className="text-destructive text-sm">{errors.apr}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="billingDay">Billing Day</Label>
                    <Input
                      id="billingDay"
                      type="number"
                      min="1"
                      max="31"
                      value={form.billingDay ?? ""}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          billingDay: e.target.value
                            ? parseInt(e.target.value)
                            : null,
                        })
                      }
                      placeholder="1-31"
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="paymentDueDay">Payment Due Day</Label>
                    <Input
                      id="paymentDueDay"
                      type="number"
                      min="1"
                      max="31"
                      value={form.paymentDueDay ?? ""}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          paymentDueDay: e.target.value
                            ? parseInt(e.target.value)
                            : null,
                        })
                      }
                      placeholder="1-31"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="secondaryCurrency">Secondary Currency</Label>
                    <Select
                      value={form.secondaryCurrency ?? "none"}
                      onValueChange={(v) =>
                        setForm({
                          ...form,
                          secondaryCurrency:
                            v === "none"
                              ? null
                              : (v as CreateAccountInput["currency"]),
                        })
                      }
                    >
                      <SelectTrigger id="secondaryCurrency">
                        <SelectValue placeholder="None" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {Object.entries(CURRENCY_LABELS)
                          .filter(([key]) => key !== form.currency)
                          .map(([key, label]) => (
                            <SelectItem key={key} value={key}>
                              {label}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="defaultPayingAccount">Default Paying Account</Label>
                    <Select
                      value={form.defaultPayingAccountId ?? "none"}
                      onValueChange={(v) =>
                        setForm({
                          ...form,
                          defaultPayingAccountId: v === "none" ? null : v,
                        })
                      }
                    >
                      <SelectTrigger id="defaultPayingAccount">
                        <SelectValue placeholder="None" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {payingAccountOptions.map((a) => (
                          <SelectItem key={a.id} value={a.id}>
                            {a.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {!isEditing && (
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="linkToDebt"
                      checked={form.linkToDebt}
                      onChange={(e) =>
                        setForm({ ...form, linkToDebt: e.target.checked })
                      }
                      className="h-4 w-4"
                    />
                    <Label htmlFor="linkToDebt">
                      Create linked Debt record for payoff tracking
                    </Label>
                  </div>
                )}
              </>
            )}

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

            <div className="grid gap-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={form.notes ?? ""}
                onChange={(e) =>
                  setForm({ ...form, notes: e.target.value || null })
                }
                placeholder="Any additional notes..."
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
                  ? "Update Account"
                  : "Add Account"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
