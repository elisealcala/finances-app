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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Plus } from "lucide-react";
import {
  useStatements,
  useDeleteStatement,
  useCloseStatement,
} from "@/hooks/use-statements";
import { DataTable } from "@/components/data-table";
import { getStatementColumns } from "./statement-columns";
import { StatementForm } from "./statement-form";
import { PayStatementDialog } from "./pay-statement-dialog";
import type { CreditCardStatement } from "@/types/finances";

type StatementRow = CreditCardStatement & {
  account?: { name: string; currency: string; color: string | null };
  expenseCount?: number;
  totalsByCurrency?: Record<string, number>;
};

export function StatementsPageClient() {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [showPaid, setShowPaid] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editingStatement, setEditingStatement] =
    useState<StatementRow | null>(null);
  const [deletingStatement, setDeletingStatement] =
    useState<StatementRow | null>(null);
  const [closingStatement, setClosingStatement] =
    useState<StatementRow | null>(null);
  const [payingStatement, setPayingStatement] =
    useState<StatementRow | null>(null);

  const { data: statementsData, isLoading } = useStatements({
    year: selectedYear,
  });
  const deleteStatement = useDeleteStatement();
  const closeStatement = useCloseStatement();

  const allStatements = useMemo(
    () => (statementsData?.statements ?? []) as StatementRow[],
    [statementsData],
  );

  const visibleStatements = useMemo(
    () => (showPaid ? allStatements : allStatements.filter((s) => s.status !== "PAID")),
    [allStatements, showPaid],
  );

  function handleEdit(statement: StatementRow) {
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

  const columns = useMemo(
    () =>
      getStatementColumns({
        onEdit: handleEdit,
        onClose: setClosingStatement,
        onPay: setPayingStatement,
        onDelete: setDeletingStatement,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

  const paidCount = allStatements.filter((s) => s.status === "PAID").length;

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

      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground text-sm">Year:</span>
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

        <div className="flex items-center gap-2">
          <Switch id="show-paid" checked={showPaid} onCheckedChange={setShowPaid} />
          <Label htmlFor="show-paid" className="cursor-pointer text-sm">
            Show paid {paidCount > 0 && <span className="text-muted-foreground">({paidCount})</span>}
          </Label>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={visibleStatements}
        isLoading={isLoading}
        emptyMessage="No statements found."
        rowClassName={(row) => (row.status === "PAID" ? "opacity-60" : undefined)}
      />

      <StatementForm
        open={formOpen}
        onOpenChange={handleFormClose}
        statement={editingStatement}
      />

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
            <Button variant="outline" onClick={() => setDeletingStatement(null)}>
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
            <Button variant="outline" onClick={() => setClosingStatement(null)}>
              Cancel
            </Button>
            <Button onClick={handleClose} disabled={closeStatement.isPending}>
              {closeStatement.isPending ? "Closing..." : "Close Statement"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <PayStatementDialog
        open={!!payingStatement}
        onOpenChange={(open) => !open && setPayingStatement(null)}
        statement={payingStatement}
      />
    </div>
  );
}
