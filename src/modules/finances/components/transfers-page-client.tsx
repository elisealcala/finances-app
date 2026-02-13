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
import { Plus } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { useTransfers, useDeleteTransfer } from "../hooks/use-transfers";
import { usePeriodFilter } from "../hooks/use-period-filter";
import { MonthYearFilter } from "./month-year-filter";
import { TransferTable } from "./transfer-table";
import { TransferForm } from "./transfer-form";
import type { Transfer } from "../types";

export function TransfersPageClient() {
  const period = usePeriodFilter();
  const { data, isLoading } = useTransfers({
    year: period.year,
    month: period.month,
  });
  const deleteTransfer = useDeleteTransfer();

  const [formOpen, setFormOpen] = useState(false);
  const [editingTransfer, setEditingTransfer] = useState<Transfer | null>(null);
  const [deletingTransfer, setDeletingTransfer] = useState<Transfer | null>(
    null,
  );

  const transfers = (data?.transfers ?? []) as Transfer[];
  const total = data?.total ?? 0;

  function handleEdit(transfer: Transfer) {
    setEditingTransfer(transfer);
    setFormOpen(true);
  }

  function handleFormClose(open: boolean) {
    setFormOpen(open);
    if (!open) setEditingTransfer(null);
  }

  async function handleDelete() {
    if (!deletingTransfer) return;
    await deleteTransfer.mutateAsync({ id: deletingTransfer.id });
    setDeletingTransfer(null);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Transfers</h2>
          <p className="text-muted-foreground">
            Move money between accounts. Total: {formatCurrency(total)}
          </p>
        </div>
        <Button onClick={() => setFormOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Transfer
        </Button>
      </div>

      <MonthYearFilter
        year={period.year}
        month={period.month}
        onYearChange={period.setYear}
        onMonthChange={period.setMonth}
        onPrev={period.goToPrevMonth}
        onNext={period.goToNextMonth}
        onToday={period.goToCurrentMonth}
      />

      <TransferTable
        transfers={transfers}
        isLoading={isLoading}
        onEdit={handleEdit}
        onDelete={setDeletingTransfer}
      />

      <TransferForm
        open={formOpen}
        onOpenChange={handleFormClose}
        transfer={editingTransfer}
      />

      <Dialog
        open={!!deletingTransfer}
        onOpenChange={(open) => !open && setDeletingTransfer(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Transfer</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{deletingTransfer?.name}
              &quot;? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeletingTransfer(null)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteTransfer.isPending}
            >
              {deleteTransfer.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
