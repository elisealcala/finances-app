"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { formatCurrency, formatPercentage, DEBT_TYPE_LABELS } from "@/lib/utils";
import { useDebt } from "@/hooks/use-debts";
import {
  useMarkInstallmentPaid,
  useMarkInstallmentUnpaid,
} from "@/hooks/use-installments";
import { ReadonlyScheduleTable } from "./schedule-table";
import { CapitalPaymentDialog } from "./capital-payment-dialog";
import { scheduleRowsToCsv, downloadCsv } from "@/lib/csv";

type DebtDetailPageProps = {
  debtId: string;
};

export function DebtDetailPage({ debtId }: DebtDetailPageProps) {
  const router = useRouter();
  const { data: debt, isLoading } = useDebt(debtId);
  const markPaid = useMarkInstallmentPaid();
  const markUnpaid = useMarkInstallmentUnpaid();
  const [capitalPaymentOpen, setCapitalPaymentOpen] = useState(false);

  function handleTogglePaid(installmentId: string, currentStatus: string) {
    if (currentStatus === "PAID") {
      markUnpaid.mutate({ id: installmentId });
    } else {
      markPaid.mutate({ id: installmentId, paidAt: new Date() });
    }
  }

  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-8 w-48" />
        </div>
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!debt) {
    return (
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => router.push("/dashboard/debt")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-semibold">Debt not found</h1>
        </div>
      </div>
    );
  }

  const installments = debt.installments ?? [];
  const paidCount = installments.filter((i) => i.status === "PAID").length;
  const totalCount = installments.length;

  const paidCapital = installments
    .filter((i) => i.status === "PAID")
    .reduce((sum, i) => sum + i.capital, 0);
  const totalCapital = installments.reduce((sum, i) => sum + i.capital, 0);
  const totalInterest = installments.reduce((sum, i) => sum + i.interest, 0);
  const totalFees = installments.reduce(
    (sum, i) => sum + i.fees.reduce((s, f) => s + f.amount, 0),
    0,
  );

  // Build id map: installmentNumber -> id
  const idMap: Record<number, string> = {};
  for (const inst of installments) {
    idMap[inst.installmentNumber] = inst.id;
  }

  const progressPercent = totalCount > 0 ? (paidCount / totalCount) * 100 : 0;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => router.push("/dashboard/debt")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              {debt.color && (
                <span
                  className="inline-block h-3 w-3 rounded-full"
                  style={{ backgroundColor: debt.color }}
                />
              )}
              <h1 className="text-2xl font-semibold">{debt.name}</h1>
            </div>
            <p className="text-muted-foreground text-sm">
              {DEBT_TYPE_LABELS[debt.type] ?? debt.type}
              {debt.lender && ` · ${debt.lender}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {debt.hasSchedule && debt.status === "ACTIVE" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCapitalPaymentOpen(true)}
            >
              Capital Payment
            </Button>
          )}
          <Badge variant={debt.status === "PAID_OFF" ? "default" : "secondary"}>
            {debt.status === "PAID_OFF" ? "Paid Off" : "Active"}
          </Badge>
        </div>
      </div>

      <Separator />

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="pt-4">
            <p className="text-muted-foreground text-xs">Remaining Balance</p>
            <p className="text-lg font-semibold">{formatCurrency(debt.balance)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-muted-foreground text-xs">Interest Rate</p>
            <p className="text-lg font-semibold">{formatPercentage(debt.interestRate)} TEA</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-muted-foreground text-xs">Original Balance</p>
            <p className="text-lg font-semibold">{formatCurrency(debt.originalBalance)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-muted-foreground text-xs">Monthly Payment</p>
            <p className="text-lg font-semibold">{formatCurrency(debt.minimumPayment)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Progress bar (for scheduled debts) */}
      {debt.hasSchedule && totalCount > 0 && (
        <Card>
          <CardContent className="pt-4 space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">
                Progress: {paidCount} / {totalCount} installments paid
              </span>
              <span className="text-muted-foreground">{Math.round(progressPercent)}%</span>
            </div>
            <div className="h-2.5 w-full rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
              <div>
                <span className="text-muted-foreground">Paid Capital</span>
                <p className="font-medium">{formatCurrency(paidCapital)}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Remaining Capital</span>
                <p className="font-medium">{formatCurrency(totalCapital - paidCapital)}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Total Interest</span>
                <p className="font-medium">{formatCurrency(totalInterest)}</p>
              </div>
              {totalFees > 0 && (
                <div>
                  <span className="text-muted-foreground">Total Fees</span>
                  <p className="font-medium">{formatCurrency(totalFees)}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Schedule table */}
      {debt.hasSchedule && installments.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle>Payment Schedule</CardTitle>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                const csv = scheduleRowsToCsv(
                  installments.map((i) => ({
                    installmentNumber: i.installmentNumber,
                    dueDate: typeof i.dueDate === "string" ? new Date(i.dueDate) : i.dueDate,
                    capital: i.capital,
                    interest: i.interest,
                    fees: i.fees,
                    totalAmount: i.totalAmount,
                  })),
                );
                downloadCsv(csv, `${debt.name.toLowerCase().replace(/\s+/g, "-")}-schedule.csv`);
              }}
            >
              <Download className="mr-1 h-3.5 w-3.5" />
              Download CSV
            </Button>
          </CardHeader>
          <CardContent>
            <ReadonlyScheduleTable
              rows={installments}
              onTogglePaid={handleTogglePaid}
              idMap={idMap}
            />
          </CardContent>
        </Card>
      )}

      {/* Capital payments */}
      {debt.payments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Capital Payments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {debt.payments.map((p) => (
                <div key={p.id} className="flex items-center justify-between rounded-md border p-3 text-sm">
                  <div>
                    <p className="font-medium">{formatCurrency(p.amount)}</p>
                    {p.notes && <p className="text-muted-foreground text-xs">{p.notes}</p>}
                  </div>
                  <p className="text-muted-foreground text-xs">
                    {format(new Date(p.date), "dd-MM-yyyy")}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Capital payment dialog */}
      {debt.hasSchedule && (
        <CapitalPaymentDialog
          open={capitalPaymentOpen}
          onOpenChange={setCapitalPaymentOpen}
          debt={debt}
        />
      )}
    </div>
  );
}
