"use client";

import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2, Plus } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import {
  useRecurringTransactions,
  useDeleteRecurring,
} from "@/hooks/use-recurring";
import { RecurringForm } from "./recurring-form";
import type { RecurringTransaction } from "@/types/prediction";

const FREQUENCY_LABELS: Record<string, string> = {
  MONTHLY: "Monthly",
  BIWEEKLY: "Biweekly",
  WEEKLY: "Weekly",
  QUARTERLY: "Quarterly",
  YEARLY: "Yearly",
};

export function RecurringList() {
  const { data, isLoading } = useRecurringTransactions();
  const deleteRecurring = useDeleteRecurring();
  const [formOpen, setFormOpen] = useState(false);
  const [editItem, setEditItem] = useState<RecurringTransaction | null>(null);

  function handleEdit(item: RecurringTransaction) {
    setEditItem(item);
    setFormOpen(true);
  }

  function handleCreate() {
    setEditItem(null);
    setFormOpen(true);
  }

  async function handleDelete(id: string) {
    await deleteRecurring.mutateAsync({ id });
  }

  if (isLoading) {
    return <div className="text-muted-foreground py-8 text-center">Loading...</div>;
  }

  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Recurring Transactions</h2>
          <p className="text-muted-foreground text-sm">
            Predictable repeating income and expenses
          </p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Add Recurring
        </Button>
      </div>

      {!data?.items?.length ? (
        <div className="text-muted-foreground rounded-md border border-dashed py-12 text-center text-sm">
          No recurring transactions yet. Add your salary, rent, or subscriptions.
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Frequency</TableHead>
              <TableHead>Day</TableHead>
              <TableHead>Account</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead className="w-20" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.items.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">
                  {item.name}
                  {item.debt && (
                    <span className="text-muted-foreground ml-2 text-xs">
                      ({item.debt.name})
                    </span>
                  )}
                </TableCell>
                <TableCell>
                  <Badge
                    variant={item.type === "INCOME" ? "default" : "secondary"}
                    className="text-xs"
                  >
                    {item.type === "INCOME" ? "Income" : "Expense"}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {FREQUENCY_LABELS[item.frequency] ?? item.frequency}
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {item.dayOfMonth ?? "-"}
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {item.account?.name ?? "-"}
                </TableCell>
                <TableCell
                  className={`text-right font-medium ${
                    item.type === "INCOME" ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {item.type === "INCOME" ? "+" : "-"}
                  {formatCurrency(item.amount)}
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleEdit(item)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive h-8 w-8"
                      onClick={() => handleDelete(item.id)}
                      disabled={deleteRecurring.isPending}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <RecurringForm
        open={formOpen}
        onOpenChange={setFormOpen}
        editItem={editItem}
      />
    </>
  );
}
