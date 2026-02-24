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
import { formatCurrency, CURRENCY_LABELS } from "@/lib/utils";
import { useStatement } from "../hooks/use-statements";
import { usePayStatement } from "../hooks/use-statements";
import type { CreditCardStatement } from "../types";
import type { Currency } from "../types";

type PayStatementDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  statement: CreditCardStatement | null;
};

type CurrencyPair = { from: Currency; to: Currency };

export function PayStatementDialog({
  open,
  onOpenChange,
  statement,
}: PayStatementDialogProps) {
  const [paymentDateStr, setPaymentDateStr] = useState("");
  const [rates, setRates] = useState<Record<string, string>>({});

  const { data: detail, isLoading } = useStatement(statement?.id ?? "", {
    enabled: open && !!statement,
  });
  const payStatement = usePayStatement();

  // Reset state when dialog opens
  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen && statement) {
      const dueDate = new Date(statement.paymentDueDate);
      setPaymentDateStr(dueDate.toISOString().split("T")[0]);
      setRates({});
    }
    onOpenChange(nextOpen);
  };

  const expenses = detail?.expenses ?? [];
  const unpaidExpenses = expenses.filter((e) => e.paymentStatus === "NOT_PAID");
  const withoutPayer = unpaidExpenses.filter((e) => !e.payingAccountId);
  const statementCurrency = (detail?.account?.currency ?? "PEN") as Currency;

  // Compute which currency pairs need exchange rates
  const neededPairs = useMemo(() => {
    const pairs = new Map<string, CurrencyPair>();
    for (const expense of unpaidExpenses) {
      if (!expense.payingAccount) continue;
      const expCurrency = (expense.currency ?? statementCurrency) as Currency;
      const payerCurrency = expense.payingAccount.currency as Currency;
      if (expCurrency !== payerCurrency) {
        const key = `${expCurrency}->${payerCurrency}`;
        if (!pairs.has(key)) {
          pairs.set(key, { from: expCurrency, to: payerCurrency });
        }
      }
    }
    return Array.from(pairs.values());
  }, [unpaidExpenses]);

  // Compute grouped summary
  const groups = useMemo(() => {
    const map = new Map<
      string,
      {
        payingAccountId: string;
        payingAccountName: string;
        payerCurrency: Currency;
        total: number;
        count: number;
      }
    >();

    for (const expense of unpaidExpenses) {
      if (!expense.payingAccount) continue;
      const payerId = expense.payingAccountId!;
      const payerCurrency = expense.payingAccount.currency as Currency;
      const expCurrency = (expense.currency ?? statementCurrency) as Currency;

      let rate = 1;
      if (expCurrency !== payerCurrency) {
        const key = `${expCurrency}->${payerCurrency}`;
        const parsed = parseFloat(rates[key] ?? "");
        rate = isNaN(parsed) || parsed <= 0 ? 0 : parsed;
      }

      const converted = expense.amount * rate;

      const existing = map.get(payerId);
      if (existing) {
        existing.total += converted;
        existing.count += 1;
      } else {
        map.set(payerId, {
          payingAccountId: payerId,
          payingAccountName: expense.payingAccount.name,
          payerCurrency,
          total: converted,
          count: 1,
        });
      }
    }

    return Array.from(map.values());
  }, [unpaidExpenses, rates]);

  const allRatesFilled =
    neededPairs.length === 0 ||
    neededPairs.every((p) => {
      const val = parseFloat(rates[`${p.from}->${p.to}`] ?? "");
      return !isNaN(val) && val > 0;
    });

  const canSubmit =
    !!paymentDateStr &&
    withoutPayer.length === 0 &&
    unpaidExpenses.length > 0 &&
    allRatesFilled &&
    !payStatement.isPending;

  async function handlePay() {
    if (!statement || !canSubmit) return;

    const exchangeRates = neededPairs.map((p) => ({
      fromCurrency: p.from,
      toCurrency: p.to,
      rate: parseFloat(rates[`${p.from}->${p.to}`]!),
    }));

    await payStatement.mutateAsync({
      id: statement.id,
      paymentDate: new Date(`${paymentDateStr}T00:00:00`),
      exchangeRates,
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

            {/* Exchange Rates */}
            {neededPairs.length > 0 && (
              <div className="grid gap-3">
                <Label>Exchange Rates</Label>
                {neededPairs.map((pair) => {
                  const key = `${pair.from}->${pair.to}`;
                  return (
                    <div key={key} className="flex items-center gap-2">
                      <span className="text-sm whitespace-nowrap">
                        1 {pair.from} =
                      </span>
                      <Input
                        type="number"
                        step="any"
                        min="0"
                        placeholder="0.00"
                        className="w-28"
                        value={rates[key] ?? ""}
                        onChange={(e) =>
                          setRates((prev) => ({
                            ...prev,
                            [key]: e.target.value,
                          }))
                        }
                      />
                      <span className="text-sm">
                        {CURRENCY_LABELS[pair.to] ?? pair.to}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Summary */}
            {groups.length > 0 && (
              <div className="grid gap-2">
                <Label>Payment Summary</Label>
                <div className="grid gap-2">
                  {groups.map((group) => (
                    <div
                      key={group.payingAccountId}
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
                        {group.total > 0
                          ? formatCurrency(
                              group.total,
                              group.payerCurrency as "PEN" | "USD" | "EUR",
                            )
                          : "—"}
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
