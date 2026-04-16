"use client";

import { useMemo, useState } from "react";
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
import { useAccounts, useDeleteAccount, useUpdateAccount } from "@/hooks/use-accounts";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { DataTable } from "@/components/data-table";
import { AccountForm } from "./account-form";
import { getAccountColumns } from "./account-columns";
import type { AccountWithBalance } from "@/types/finances";

export function AccountsPageClient() {
  const [showClosed, setShowClosed] = useState(false);
  const { data, isLoading } = useAccounts(
    showClosed ? undefined : { isArchived: false },
  );
  const deleteAccount = useDeleteAccount();
  const updateAccount = useUpdateAccount();

  const [formOpen, setFormOpen] = useState(false);
  const [editingAccount, setEditingAccount] =
    useState<AccountWithBalance | null>(null);
  const [deletingAccount, setDeletingAccount] =
    useState<AccountWithBalance | null>(null);

  const accounts = data?.accounts ?? [];

  function handleEdit(account: AccountWithBalance) {
    setEditingAccount(account);
    setFormOpen(true);
  }

  function handleFormClose(open: boolean) {
    setFormOpen(open);
    if (!open) setEditingAccount(null);
  }

  async function handleDelete() {
    if (!deletingAccount) return;
    await deleteAccount.mutateAsync({ id: deletingAccount.id });
    setDeletingAccount(null);
  }

  function handleToggleArchive(account: AccountWithBalance) {
    updateAccount.mutate({ id: account.id, isArchived: !account.isArchived });
  }

  const columns = useMemo(
    () =>
      getAccountColumns({
        onEdit: handleEdit,
        onDelete: setDeletingAccount,
        onToggleArchive: handleToggleArchive,
      }),
    [],
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Accounts</h2>
          <p className="text-muted-foreground">
            Manage your bank accounts, credit cards, and cash.
          </p>
        </div>
        <Button onClick={() => setFormOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Account
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <Checkbox
          id="show-closed"
          checked={showClosed}
          onCheckedChange={(v) => setShowClosed(!!v)}
        />
        <Label htmlFor="show-closed" className="text-muted-foreground text-sm">
          Show closed accounts
        </Label>
      </div>

      <DataTable
        columns={columns}
        data={accounts}
        isLoading={isLoading}
        emptyMessage="No accounts yet. Click 'Add Account' to create one."
      />

      <AccountForm
        open={formOpen}
        onOpenChange={handleFormClose}
        account={editingAccount}
      />

      <Dialog
        open={!!deletingAccount}
        onOpenChange={(open) => !open && setDeletingAccount(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Account</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{deletingAccount?.name}
              &quot;? This will also delete all associated transactions. This
              action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingAccount(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteAccount.isPending}
            >
              {deleteAccount.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
