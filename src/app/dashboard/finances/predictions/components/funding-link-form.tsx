"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
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
import { useAccounts } from "@/hooks/use-accounts";
import { useDebts } from "@/hooks/use-debts";
import { useCreateFundingLink } from "@/hooks/use-funding";

type FundingLinkFormProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function FundingLinkForm({ open, onOpenChange }: FundingLinkFormProps) {
  const { data: accountsData } = useAccounts();
  const { data: debtsData } = useDebts();
  const createFundingLink = useCreateFundingLink();

  const [accountId, setAccountId] = useState("");
  const [debtId, setDebtId] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate(): boolean {
    const newErrors: Record<string, string> = {};
    if (!accountId) newErrors.accountId = "Account is required";
    if (!debtId) newErrors.debtId = "Debt is required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    await createFundingLink.mutateAsync({
      sourceAccountId: accountId,
      debtId,
    });

    onOpenChange(false);
    setAccountId("");
    setDebtId("");
  }

  const activeDebts = debtsData?.debts?.filter((d) => d.status === "ACTIVE") ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Link Account to Debt</DialogTitle>
            <DialogDescription>
              Specify which account funds payments for a debt.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Account</Label>
              <Select value={accountId} onValueChange={setAccountId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select account" />
                </SelectTrigger>
                <SelectContent>
                  {accountsData?.accounts?.map((acc) => (
                    <SelectItem key={acc.id} value={acc.id}>
                      {acc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.accountId && (
                <p className="text-destructive text-sm">{errors.accountId}</p>
              )}
            </div>

            <div className="grid gap-2">
              <Label>Debt</Label>
              <Select value={debtId} onValueChange={setDebtId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select debt" />
                </SelectTrigger>
                <SelectContent>
                  {activeDebts.map((debt) => (
                    <SelectItem key={debt.id} value={debt.id}>
                      {debt.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.debtId && (
                <p className="text-destructive text-sm">{errors.debtId}</p>
              )}
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
            <Button type="submit" disabled={createFundingLink.isPending}>
              {createFundingLink.isPending ? "Linking..." : "Link"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
