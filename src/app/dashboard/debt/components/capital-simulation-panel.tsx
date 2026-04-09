"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { X } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import type { Debt } from "@/types/debt";
import type { SimulationResult } from "@/server/trpc/services/debt/amortization";

type CapitalSimulationPanelProps = {
  debts: Debt[];
  selectedDebtId: string;
  onSelectDebt: (id: string) => void;
  extraPayment: number;
  onExtraPaymentChange: (amount: number) => void;
  result: SimulationResult | null;
  onClear: () => void;
};

export function CapitalSimulationPanel({
  debts,
  selectedDebtId,
  onSelectDebt,
  extraPayment,
  onExtraPaymentChange,
  result,
  onClear,
}: CapitalSimulationPanelProps) {
  const activeDebts = debts.filter((d) => d.status === "ACTIVE");

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Capital Payment Simulation</CardTitle>
            <CardDescription>
              See how an extra payment affects your debt
            </CardDescription>
          </div>
          {(selectedDebtId || extraPayment > 0) && (
            <Button variant="ghost" size="icon" onClick={onClear}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Select Debt</label>
          <Select value={selectedDebtId} onValueChange={onSelectDebt}>
            <SelectTrigger>
              <SelectValue placeholder="Choose a debt..." />
            </SelectTrigger>
            <SelectContent>
              {activeDebts.map((debt) => (
                <SelectItem key={debt.id} value={debt.id}>
                  {debt.name} ({formatCurrency(debt.balance)})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Extra Payment Amount</label>
          <div className="relative">
            <span className="text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 text-sm">
              S/.
            </span>
            <Input
              type="number"
              min={0}
              step={100}
              placeholder="0.00"
              className="pl-10"
              value={extraPayment || ""}
              onChange={(e) => onExtraPaymentChange(Number(e.target.value))}
            />
          </div>
        </div>

        {result && (
          <>
            <Separator />
            <div className="grid grid-cols-2 gap-3">
              <ResultCard
                label="New Balance"
                value={formatCurrency(result.newBalance)}
              />
              <ResultCard
                label="Months Saved"
                value={`${result.monthsSaved} months`}
              />
              <ResultCard
                label="Interest Saved"
                value={formatCurrency(result.interestSaved)}
              />
              <ResultCard
                label="New Payoff"
                value={`${result.newMonths} months`}
              />
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function ResultCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-muted/50 rounded-lg p-3">
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className="text-sm font-semibold">{value}</p>
    </div>
  );
}
