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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { useAccounts } from "../hooks/use-accounts";
import { useTransfers, useDeleteTransfer } from "../hooks/use-transfers";
import { usePeriodFilter } from "../hooks/use-period-filter";
import { PeriodSelector } from "./period-selector";
import { TransferTable } from "./transfer-table";
import { TransferForm } from "./transfer-form";
import type { Transfer } from "../types";

export function TransfersPageClient() {
  const period = usePeriodFilter();
  const [accountId, setAccountId] = useState<string | undefined>();
  const { data: accountsData } = useAccounts();
  const { data, isLoading } = useTransfers({
    year: period.year,
    month: period.month,
    accountId,
  });
  const deleteTransfer = useDeleteTransfer();

  const [formOpen, setFormOpen] = useState(false);
  const [editingTransfer, setEditingTransfer] = useState<Transfer | null>(null);
  const [deletingTransfer, setDeletingTransfer] = useState<Transfer | null>(
    null,
  );

  const transfers = (data?.transfers ?? []) as Transfer[];
  const totalsByCurrency = (data?.totalsByCurrency ?? {}) as Record<string, number>;

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
            Move money between accounts. Total:{" "}
            {Object.entries(totalsByCurrency)
              .map(([currency, amount]) =>
                formatCurrency(amount, currency as "PEN" | "USD" | "EUR")
              )
              .join(" / ") || formatCurrency(0)}
          </p>
        </div>
        <Button onClick={() => setFormOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Transfer
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <PeriodSelector {...period} />
        <Select
          value={accountId ?? "all"}
          onValueChange={(v) => setAccountId(v === "all" ? undefined : v)}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All accounts" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All accounts</SelectItem>
            {accountsData?.accounts?.map((account) => (
              <SelectItem key={account.id} value={account.id}>
                {account.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

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
