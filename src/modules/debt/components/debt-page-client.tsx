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
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { useDebts, useDeleteDebt } from "../hooks/use-debts";
import { useDebtVisibility } from "../hooks/use-debt-visibility";
import { useDebtSimulation } from "../hooks/use-debt-simulation";
import { DebtSummaryCards } from "./debt-summary-cards";
import { DebtTable } from "./debt-table";
import { DebtTimelineChart } from "./debt-timeline-chart";
import { CapitalSimulationPanel } from "./capital-simulation-panel";
import type { Debt } from "../types";
import type { DebtSummary } from "../types";

export function DebtPageClient() {
  const router = useRouter();
  const { data, isLoading } = useDebts();
  const deleteDebt = useDeleteDebt();

  const [deletingDebt, setDeletingDebt] = useState<Debt | null>(null);

  const allDebts = data?.debts ?? [];

  const { toggleVisibility, filterVisible, isHidden, showAll, hiddenCount } =
    useDebtVisibility();

  const simulation = useDebtSimulation(allDebts);

  const visibleDebts = useMemo(
    () => filterVisible(allDebts),
    [filterVisible, allDebts],
  );

  const visibleSummary: DebtSummary | undefined = useMemo(() => {
    if (!data) return undefined;
    const activeVisible = visibleDebts.filter((d) => d.status === "ACTIVE");
    return {
      totalDebt: activeVisible.reduce((sum, d) => sum + d.balance, 0),
      totalMinimumPayment: activeVisible.reduce(
        (sum, d) => sum + d.minimumPayment,
        0,
      ),
      averageInterestRate:
        activeVisible.length > 0
          ? activeVisible.reduce((sum, d) => sum + d.interestRate, 0) /
            activeVisible.length
          : 0,
      activeCount: activeVisible.length,
      paidOffCount: visibleDebts.filter((d) => d.status === "PAID_OFF").length,
    };
  }, [data, visibleDebts]);

  async function handleDelete() {
    if (!deletingDebt) return;
    await deleteDebt.mutateAsync({ id: deletingDebt.id });
    setDeletingDebt(null);
  }

  const activeVisibleDebts = visibleDebts.filter((d) => d.status === "ACTIVE");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Debt Tracker</h2>
          <p className="text-muted-foreground">
            Manage and track all your debts in one place.
          </p>
        </div>
        <Button onClick={() => router.push("/dashboard/debt/new")}>
          <Plus className="mr-2 h-4 w-4" />
          Add Debt
        </Button>
      </div>

      <DebtSummaryCards summary={visibleSummary} />

      <DebtTimelineChart
        debts={visibleDebts}
        simulation={simulation.result}
        simulatedDebtName={simulation.selectedDebt?.name}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <DebtTable
            debts={allDebts}
            isLoading={isLoading}
            onDelete={setDeletingDebt}
            onView={(debt) => router.push(`/dashboard/debt/${debt.id}`)}
            onToggleVisibility={toggleVisibility}
            isHidden={isHidden}
            hiddenCount={hiddenCount}
            onShowAll={showAll}
          />
        </div>
        <div>
          <CapitalSimulationPanel
            debts={allDebts}
            selectedDebtId={simulation.selectedDebtId}
            onSelectDebt={simulation.setSelectedDebtId}
            extraPayment={simulation.extraPayment}
            onExtraPaymentChange={simulation.setExtraPayment}
            result={simulation.result}
            onClear={simulation.clear}
          />
        </div>
      </div>

      <Dialog
        open={!!deletingDebt}
        onOpenChange={(open) => !open && setDeletingDebt(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Debt</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{deletingDebt?.name}&quot;?
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingDebt(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteDebt.isPending}
            >
              {deleteDebt.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
