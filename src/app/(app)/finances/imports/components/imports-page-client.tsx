"use client";

import Link from "next/link";
import { useState } from "react";
import { format, formatDistanceToNow } from "date-fns";
import { Inbox, Settings, AlertTriangle, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useImports,
  useImportsStatus,
  useConfirmImport,
  useDismissImport,
  usePollNow,
} from "@/hooks/use-imports";
import { useAccounts } from "@/hooks/use-accounts";
import { useCategories } from "@/hooks/use-categories";
import { toast } from "sonner";

const BANK_LABEL: Record<string, string> = {
  BCP: "BCP",
  INTERBANK: "Interbank",
  BBVA: "BBVA",
};

export function ImportsPageClient() {
  const { data: imports } = useImports("PENDING");
  const { data: status } = useImportsStatus();
  const { data: accountsData } = useAccounts({ isArchived: false });
  const { data: categoriesData } = useCategories();
  const confirmImport = useConfirmImport();
  const dismissImport = useDismissImport();
  const pollNow = usePollNow();

  const accounts = accountsData?.accounts ?? [];
  const categories = categoriesData?.categories ?? [];

  const [overrides, setOverrides] = useState<
    Record<string, { accountId?: string; categoryId?: string }>
  >({});

  function update(id: string, patch: { accountId?: string; categoryId?: string }) {
    setOverrides((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  }

  async function handleConfirm(id: string, fallbackAccountId: string | null) {
    const o = overrides[id] ?? {};
    const accountId = o.accountId ?? fallbackAccountId ?? undefined;
    if (!accountId) {
      toast.error("Pick an account first");
      return;
    }
    try {
      await confirmImport.mutateAsync({
        id,
        accountId,
        categoryId: o.categoryId ?? null,
      });
      toast.success("Imported");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to import");
    }
  }

  async function handleDismiss(id: string) {
    try {
      await dismissImport.mutateAsync({ id });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed");
    }
  }

  async function handlePollNow() {
    try {
      const result = await pollNow.mutateAsync();
      toast.success(
        `${result.inserted} imported · ${result.alreadyProcessed} already done · ${result.parseFailed + result.fetchError} failed`,
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Poll failed");
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Imports</h2>
          <p className="text-muted-foreground text-sm">
            Review and confirm transactions parsed from your bank emails.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePollNow}
            disabled={pollNow.isPending || !status?.connected}
          >
            {pollNow.isPending ? "Polling..." : "Poll now"}
          </Button>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/finances/imports/settings">
              <Settings className="size-4" /> Settings
            </Link>
          </Button>
        </div>
      </div>

      {status && (
        <p className="text-muted-foreground text-xs">
          {status.connected
            ? `Connected as ${status.email}. ${
                status.lastPolledAt
                  ? `Last polled ${formatDistanceToNow(status.lastPolledAt, {
                      addSuffix: true,
                    })}.`
                  : "Not polled yet."
              }`
            : "Gmail not connected — go to Settings."}
        </p>
      )}

      {!imports || imports.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-2 py-12 text-center">
            <Inbox className="text-muted-foreground size-8" />
            <p className="text-sm font-medium">No pending imports</p>
            <p className="text-muted-foreground text-sm">
              {status?.connected
                ? "Click Poll now or wait for the next scheduled poll."
                : "Connect Gmail to start importing transactions."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-2">
          {imports.map((row) => {
            const o = overrides[row.id] ?? {};
            const accountId = o.accountId ?? row.accountId ?? "";
            const categoryId = o.categoryId ?? "";
            const needsAccount = !accountId;
            return (
              <Card key={row.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">{BANK_LABEL[row.bank] ?? row.bank}</Badge>
                        <CardTitle className="truncate text-base font-medium">
                          {row.merchant}
                        </CardTitle>
                      </div>
                      <p className="text-muted-foreground mt-1 text-xs">
                        {format(row.transactionDate, "EEE, MMM d, yyyy")} ·{" "}
                        {row.cardLast4 ? `••• ${row.cardLast4}` : "no card"}
                      </p>
                    </div>
                    <div className="text-right text-base font-semibold">
                      {row.currency === "PEN" ? "S/" : row.currency === "USD" ? "$" : "€"}{" "}
                      {Number(row.amount).toFixed(2)}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {row.matchWarning && needsAccount && (
                    <div className="text-destructive flex items-center gap-1.5 text-xs">
                      <AlertTriangle className="size-3.5" />
                      {row.matchWarning === "no_matching_card"
                        ? `No account with card ending in ${row.cardLast4}.`
                        : "No card identified in email."}
                    </div>
                  )}
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="grid gap-1.5">
                      <label className="text-muted-foreground text-xs">Account</label>
                      <Select
                        value={accountId}
                        onValueChange={(v) => update(row.id, { accountId: v })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Pick account" />
                        </SelectTrigger>
                        <SelectContent>
                          {accounts.map((a) => (
                            <SelectItem key={a.id} value={a.id}>
                              {a.name}
                              {a.cardLast4 ? ` ••• ${a.cardLast4}` : ""}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-1.5">
                      <label className="text-muted-foreground text-xs">
                        Category (optional)
                      </label>
                      <Select
                        value={categoryId || "none"}
                        onValueChange={(v) =>
                          update(row.id, { categoryId: v === "none" ? "" : v })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="None" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No category</SelectItem>
                          {categories.map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDismiss(row.id)}
                      disabled={dismissImport.isPending}
                    >
                      <X className="size-4" /> Dismiss
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleConfirm(row.id, row.accountId)}
                      disabled={confirmImport.isPending || needsAccount}
                    >
                      <Check className="size-4" /> Confirm
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
