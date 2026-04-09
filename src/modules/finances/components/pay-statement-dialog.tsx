"use client";

import { useState, useMemo } from "react";
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
import { Badge } from "@/components/ui/badge";
import { AlertTriangle } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { useStatement } from "../hooks/use-statements";
import { usePayStatement } from "../hooks/use-statements";
import type { CreditCardStatement } from "../types";
import type { Currency } from "../types";

type PayStatementDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  statement: CreditCardStatement | null;
};

export function PayStatementDialog({
  open,
  onOpenChange,
  statement,
}: PayStatementDialogProps) {
  const [paymentDateStr, setPaymentDateStr] = useState("");

  const { data: detail, isLoading } = useStatement(statement?.id ?? "", {
    enabled: open && !!statement,
  });
  const payStatement = usePayStatement();

  // Reset state when dialog opens
  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen && statement) {
      const dueDate = new Date(statement.paymentDueDate);
      setPaymentDateStr(dueDate.toISOString().split("T")[0]);
    }
    onOpenChange(nextOpen);
  };

  const expenses = detail?.expenses ?? [];
  const unpaidExpenses = expenses.filter((e) => e.paymentStatus === "NOT_PAID");
  const withoutPayer = unpaidExpenses.filter((e) => !e.payingAccountId);
  const statementCurrency = (detail?.account?.currency ?? "PEN") as Currency;

  // Compute grouped summary by (paying account, expense currency)
  const groups = useMemo(() => {
    const map = new Map<
      string,
      {
        payingAccountId: string;
        payingAccountName: string;
        currency: Currency;
        total: number;
        count: number;
      }
    >();

    for (const expense of unpaidExpenses) {
      if (!expense.payingAccount) continue;
      const payerId = expense.payingAccountId!;
      const expCurrency = (expense.currency ?? statementCurrency) as Currency;
      const groupKey = `${payerId}::${expCurrency}`;

      const existing = map.get(groupKey);
      if (existing) {
        existing.total += expense.amount;
        existing.count += 1;
      } else {
        map.set(groupKey, {
          payingAccountId: payerId,
          payingAccountName: expense.payingAccount.name,
          currency: expCurrency,
          total: expense.amount,
          count: 1,
        });
      }
    }

    return Array.from(map.values());
  }, [unpaidExpenses]);

  const canSubmit =
    !!paymentDateStr &&
    withoutPayer.length === 0 &&
    unpaidExpenses.length > 0 &&
    !payStatement.isPending;

  async function handlePay() {
    if (!statement || !canSubmit) return;

    await payStatement.mutateAsync({
      id: statement.id,
      paymentDate: new Date(`${paymentDateStr}T00:00:00`),
    });

    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Pay Statement</DialogTitle>
          <DialogDescription>
            Mark all expenses as paid and create transfers grouped by paying
            account.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <p className="text-muted-foreground py-4 text-sm">
            Loading statement details...
          </p>
        ) : (
          <div className="grid gap-4 py-4">
            {/* Warning: expenses without paying account */}
            {withoutPayer.length > 0 && (
              <div className="bg-destructive/10 text-destructive flex items-start gap-2 rounded-md p-3 text-sm">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  {withoutPayer.length} expense(s) do not have a paying account
                  assigned. Please assign a paying account to all expenses before
                  paying.
                </span>
              </div>
            )}

            {unpaidExpenses.length === 0 && (
              <p className="text-muted-foreground text-sm">
                All expenses are already paid. Clicking pay will just mark the
                statement as paid.
              </p>
            )}

            {/* Payment Date */}
            <div className="grid gap-2">
              <Label htmlFor="pay-date">Payment Date *</Label>
              <Input
                id="pay-date"
                type="date"
                value={paymentDateStr}
                onChange={(e) => setPaymentDateStr(e.target.value)}
              />
            </div>

            {/* Summary */}
            {groups.length > 0 && (
              <div className="grid gap-2">
                <Label>Payment Summary</Label>
                <div className="grid gap-2">
                  {groups.map((group) => (
                    <div
                      key={`${group.payingAccountId}::${group.currency}`}
                      className="bg-muted flex items-center justify-between rounded-md p-3"
                    >
                      <div>
                        <p className="text-sm font-medium">
                          {group.payingAccountName}
                        </p>
                        <p className="text-muted-foreground text-xs">
                          {group.count} expense(s)
                        </p>
                      </div>
                      <Badge variant="secondary" className="text-sm">
                        {formatCurrency(
                          group.total,
                          group.currency as "PEN" | "USD" | "EUR",
                        )}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handlePay} disabled={!canSubmit}>
            {payStatement.isPending ? "Paying..." : "Pay Statement"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
