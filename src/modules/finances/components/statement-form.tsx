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
import { useCreateStatement, useUpdateStatement } from "../hooks/use-statements";
import { useAccounts } from "../hooks/use-accounts";
import type { Account, CreditCardStatement } from "../types";
import type { CreateStatementInput } from "../schema";

type StatementFormProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  statement?: CreditCardStatement | null;
  defaultAccountId?: string;
};

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export function StatementForm({
  open,
  onOpenChange,
  statement,
  defaultAccountId,
}: StatementFormProps) {
  const now = new Date();
  const [accountId, setAccountId] = useState(defaultAccountId ?? "");
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [billingCloseDateStr, setBillingCloseDateStr] = useState("");
  const [paymentDueDateStr, setPaymentDueDateStr] = useState("");
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const createStatement = useCreateStatement();
  const updateStatement = useUpdateStatement();
  const { data: accountsData } = useAccounts({ isArchived: false });

  const accounts = (accountsData?.accounts ?? []) as Account[];
  const creditCardAccounts = accounts.filter((a) => a.type === "CREDIT_CARD");

  const isEditing = !!statement;
  const isPending = createStatement.isPending || updateStatement.isPending;

  // Get selected account for pre-filling dates
  const selectedAccount = creditCardAccounts.find((a) => a.id === accountId);

  useEffect(() => {
    if (statement) {
      setAccountId(statement.accountId);
      setMonth(statement.month);
      setYear(statement.year);
      setBillingCloseDateStr(
        new Date(statement.billingCloseDate).toISOString().split("T")[0],
      );
      setPaymentDueDateStr(
        new Date(statement.paymentDueDate).toISOString().split("T")[0],
      );
      setNotes(statement.notes ?? "");
    } else {
      setAccountId(defaultAccountId ?? "");
      setMonth(now.getMonth() + 1);
      setYear(now.getFullYear());
      setNotes("");
      // Pre-fill dates from account defaults
      prefillDates(defaultAccountId ?? "", now.getMonth() + 1, now.getFullYear());
    }
    setErrors({});
  }, [statement, open, defaultAccountId]);

  function prefillDates(accId: string, m: number, y: number) {
    const acc = creditCardAccounts.find((a) => a.id === accId);
    if (acc?.billingDay) {
      const bd = new Date(y, m - 1, acc.billingDay);
      setBillingCloseDateStr(bd.toISOString().split("T")[0]);
    } else {
      setBillingCloseDateStr("");
    }
    if (acc?.paymentDueDay) {
      // Payment due is typically in the month after billing
      const pd = new Date(y, m, acc.paymentDueDay);
      setPaymentDueDateStr(pd.toISOString().split("T")[0]);
    } else {
      setPaymentDueDateStr("");
    }
  }

  function handleAccountChange(accId: string) {
    setAccountId(accId);
    if (!isEditing) {
      prefillDates(accId, month, year);
    }
  }

  function handleMonthChange(m: number) {
    setMonth(m);
    if (!isEditing && accountId) {
      prefillDates(accountId, m, year);
    }
  }

  function handleYearChange(y: number) {
    setYear(y);
    if (!isEditing && accountId) {
      prefillDates(accountId, month, y);
    }
  }

  function validate(): boolean {
    const newErrors: Record<string, string> = {};
    if (!accountId) newErrors.accountId = "Account is required";
    if (!billingCloseDateStr) newErrors.billingCloseDate = "Billing close date is required";
    if (!paymentDueDateStr) newErrors.paymentDueDate = "Payment due date is required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    if (isEditing && statement) {
      await updateStatement.mutateAsync({
        id: statement.id,
        billingCloseDate: new Date(billingCloseDateStr),
        paymentDueDate: new Date(paymentDueDateStr),
        notes: notes || null,
      });
    } else {
      const data: CreateStatementInput = {
        accountId,
        month,
        year,
        billingCloseDate: new Date(billingCloseDateStr),
        paymentDueDate: new Date(paymentDueDateStr),
        notes: notes || null,
      };
      await createStatement.mutateAsync(data);
    }
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              {isEditing ? "Edit Statement" : "Add Statement"}
            </DialogTitle>
            <DialogDescription>
              {isEditing
                ? "Update statement details."
                : "Create a new credit card billing statement."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="stmt-account">Credit Card *</Label>
              <Select
                value={accountId}
                onValueChange={handleAccountChange}
                disabled={isEditing}
              >
                <SelectTrigger id="stmt-account">
                  <SelectValue placeholder="Select credit card" />
                </SelectTrigger>
                <SelectContent>
                  {creditCardAccounts.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.accountId && (
                <p className="text-destructive text-sm">{errors.accountId}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="stmt-month">Month</Label>
                <Select
                  value={String(month)}
                  onValueChange={(v) => handleMonthChange(Number(v))}
                  disabled={isEditing}
                >
                  <SelectTrigger id="stmt-month">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTHS.map((name, i) => (
                      <SelectItem key={i + 1} value={String(i + 1)}>
                        {name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="stmt-year">Year</Label>
                <Input
                  id="stmt-year"
                  type="number"
                  value={year}
                  onChange={(e) =>
                    handleYearChange(parseInt(e.target.value) || now.getFullYear())
                  }
                  disabled={isEditing}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="stmt-billing-close">Billing Close Date *</Label>
                <Input
                  id="stmt-billing-close"
                  type="date"
                  value={billingCloseDateStr}
                  onChange={(e) => setBillingCloseDateStr(e.target.value)}
                />
                {errors.billingCloseDate && (
                  <p className="text-destructive text-sm">
                    {errors.billingCloseDate}
                  </p>
                )}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="stmt-payment-due">Payment Due Date *</Label>
                <Input
                  id="stmt-payment-due"
                  type="date"
                  value={paymentDueDateStr}
                  onChange={(e) => setPaymentDueDateStr(e.target.value)}
                />
                {errors.paymentDueDate && (
                  <p className="text-destructive text-sm">
                    {errors.paymentDueDate}
                  </p>
                )}
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="stmt-notes">Notes</Label>
              <Textarea
                id="stmt-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
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
                  ? "Update Statement"
                  : "Add Statement"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
