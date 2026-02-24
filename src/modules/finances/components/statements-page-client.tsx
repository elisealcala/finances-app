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
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Plus,
  Lock,
  Trash2,
  FileText,
  CreditCard,
} from "lucide-react";
import { format } from "date-fns";
import { formatCurrency } from "@/lib/utils";
import {
  useStatements,
  useDeleteStatement,
  useCloseStatement,
} from "../hooks/use-statements";
import { useAccounts } from "../hooks/use-accounts";
import { StatementForm } from "./statement-form";
import type { Account, CreditCardStatement } from "../types";

const STATUS_VARIANT: Record<string, "default" | "secondary" | "outline"> = {
  OPEN: "outline",
  CLOSED: "secondary",
  PAID: "default",
};

const STATUS_LABELS: Record<string, string> = {
  OPEN: "Open",
  CLOSED: "Closed",
  PAID: "Paid",
};

export function StatementsPageClient() {
  const [selectedAccountId, setSelectedAccountId] = useState<string>("all");
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [formOpen, setFormOpen] = useState(false);
  const [editingStatement, setEditingStatement] =
    useState<CreditCardStatement | null>(null);
  const [deletingStatement, setDeletingStatement] =
    useState<CreditCardStatement | null>(null);
  const [closingStatement, setClosingStatement] =
    useState<CreditCardStatement | null>(null);

  const { data: accountsData } = useAccounts({ isArchived: false });
  const accounts = (accountsData?.accounts ?? []) as Account[];
  const creditCards = accounts.filter((a) => a.type === "CREDIT_CARD");

  const { data: statementsData, isLoading } = useStatements({
    accountId: selectedAccountId === "all" ? undefined : selectedAccountId,
    year: selectedYear,
  });
  const deleteStatement = useDeleteStatement();
  const closeStatement = useCloseStatement();

  const statements = statementsData?.statements ?? [];

  function handleEdit(statement: CreditCardStatement) {
    setEditingStatement(statement);
    setFormOpen(true);
  }

  function handleFormClose(open: boolean) {
    setFormOpen(open);
    if (!open) setEditingStatement(null);
  }

  async function handleDelete() {
    if (!deletingStatement) return;
    await deleteStatement.mutateAsync({ id: deletingStatement.id });
    setDeletingStatement(null);
  }

  async function handleClose() {
    if (!closingStatement) return;
    await closeStatement.mutateAsync({ id: closingStatement.id });
    setClosingStatement(null);
  }

  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Statements</h2>
          <p className="text-muted-foreground">
            Manage credit card billing statements.
          </p>
        </div>
        <Button onClick={() => setFormOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Statement
        </Button>
      </div>

      <div className="flex gap-4">
        <Select
          value={selectedAccountId}
          onValueChange={setSelectedAccountId}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="All cards" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All cards</SelectItem>
            {creditCards.map((a) => (
              <SelectItem key={a.id} value={a.id}>
                {a.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={String(selectedYear)}
          onValueChange={(v) => setSelectedYear(Number(v))}
        >
          <SelectTrigger className="w-[120px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {yearOptions.map((y) => (
              <SelectItem key={y} value={String(y)}>
                {y}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Loading statements...</p>
      ) : statements.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="text-muted-foreground mb-4 h-12 w-12" />
            <p className="text-muted-foreground text-lg">No statements found</p>
            <p className="text-muted-foreground text-sm">
              Create a statement to track your credit card billing cycles.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {statements.map((statement) => {
            const account = (statement as Record<string, unknown>).account as
              | { name: string; currency: string; color: string | null }
              | undefined;
            const expenseCount =
              (statement as Record<string, unknown>).expenseCount as
                | number
                | undefined;

            return (
              <Card key={statement.id}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4" />
                      {account?.name ?? "Unknown"}
                    </div>
                  </CardTitle>
                  <Badge variant={STATUS_VARIANT[statement.status] ?? "outline"}>
                    {STATUS_LABELS[statement.status] ?? statement.status}
                  </Badge>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {format(new Date(0, statement.month - 1), "MMMM")} {statement.year}
                  </div>
                  <div className="text-muted-foreground mt-1 space-y-1 text-sm">
                    <p>
                      Billing close:{" "}
                      {format(new Date(statement.billingCloseDate), "dd-MM-yyyy")}
                    </p>
                    <p>
                      Payment due:{" "}
                      {format(new Date(statement.paymentDueDate), "dd-MM-yyyy")}
                    </p>
                    {statement.totalAmount != null && (
                      <p className="font-medium">
                        Total:{" "}
                        {formatCurrency(
                          statement.totalAmount,
                          (account?.currency as "PEN" | "USD" | "EUR") ?? "PEN",
                        )}
                      </p>
                    )}
                    {expenseCount != null && (
                      <p>{expenseCount} expense{expenseCount !== 1 ? "s" : ""}</p>
                    )}
                  </div>
                  <div className="mt-4 flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(statement)}
                    >
                      Edit
                    </Button>
                    {statement.status === "OPEN" && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setClosingStatement(statement)}
                      >
                        <Lock className="mr-1 h-3 w-3" />
                        Close
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeletingStatement(statement)}
                      className="text-destructive"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <StatementForm
        open={formOpen}
        onOpenChange={handleFormClose}
        statement={editingStatement}
        defaultAccountId={
          selectedAccountId !== "all" ? selectedAccountId : undefined
        }
      />

      {/* Delete confirmation */}
      <Dialog
        open={!!deletingStatement}
        onOpenChange={(open) => !open && setDeletingStatement(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Statement</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this statement? Linked expenses
              will be unlinked but not deleted.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeletingStatement(null)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteStatement.isPending}
            >
              {deleteStatement.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Close confirmation */}
      <Dialog
        open={!!closingStatement}
        onOpenChange={(open) => !open && setClosingStatement(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Close Statement</DialogTitle>
            <DialogDescription>
              This will compute the total from linked expenses and mark the
              statement as closed. Are you sure?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setClosingStatement(null)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleClose}
              disabled={closeStatement.isPending}
            >
              {closeStatement.isPending ? "Closing..." : "Close Statement"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
