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
import { useAccounts } from "@/hooks/use-accounts";
import { useTransfers, useDeleteTransfer } from "@/hooks/use-transfers";
import { usePeriodFilter } from "../../hooks/use-period-filter";
import { PeriodSelector } from "../../components/period-selector";
import { TransferTable } from "./transfer-table";
import { TransferForm } from "./transfer-form";
import type { Transfer } from "@/types/finances";
import { PageHeader, PageShell } from "@/components/page";

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
    <PageShell>
      <PageHeader
        title="Transfers"
        description={
          <>
            Move money between accounts. Total:{" "}
            {Object.entries(totalsByCurrency)
              .map(([currency, amount]) =>
                formatCurrency(amount, currency as "PEN" | "USD" | "EUR")
              )
              .join(" / ") || formatCurrency(0)}
          </>
        }
        actions={
          <Button onClick={() => setFormOpen(true)}>
            <Plus className="h-4 w-4" />
            Add transfer
          </Button>
        }
      />

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
    </PageShell>
  );
}
