"use client";

import { format } from "date-fns";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency } from "@/lib/utils";
import type { DebtFee } from "@/types/debt";

export type ScheduleRow = {
  installmentNumber: number;
  dueDate: Date;
  capital: number;
  interest: number;
  fees: DebtFee[];
  totalAmount: number;
};

type EditableScheduleTableProps = {
  rows: ScheduleRow[];
  onChange: (rows: ScheduleRow[]) => void;
};

function recalcTotal(row: ScheduleRow): ScheduleRow {
  const feeTotal = row.fees.reduce((sum, f) => sum + f.amount, 0);
  return {
    ...row,
    totalAmount: Math.round((row.capital + row.interest + feeTotal) * 100) / 100,
  };
}

export function EditableScheduleTable({ rows, onChange }: EditableScheduleTableProps) {
  function updateRow(idx: number, field: "capital" | "interest", value: number) {
    const updated = [...rows];
    updated[idx] = recalcTotal({ ...updated[idx], [field]: value });
    onChange(updated);
  }

  function updateRowDate(idx: number, value: string) {
    const updated = [...rows];
    updated[idx] = { ...updated[idx], dueDate: new Date(value + "T00:00:00") };
    onChange(updated);
  }

  function updateRowFee(idx: number, feeIdx: number, value: number) {
    const updated = [...rows];
    const newFees = [...updated[idx].fees];
    newFees[feeIdx] = { ...newFees[feeIdx], amount: value };
    updated[idx] = recalcTotal({ ...updated[idx], fees: newFees });
    onChange(updated);
  }

  function addRow() {
    const last = rows[rows.length - 1];
    const nextDate = last
      ? new Date(last.dueDate.getFullYear(), last.dueDate.getMonth() + 1, last.dueDate.getDate())
      : new Date();
    const newRow: ScheduleRow = {
      installmentNumber: rows.length + 1,
      dueDate: nextDate,
      capital: 0,
      interest: 0,
      fees: last?.fees.map((f) => ({ name: f.name, amount: 0 })) ?? [],
      totalAmount: 0,
    };
    onChange([...rows, newRow]);
  }

  function removeRow(idx: number) {
    const updated = rows
      .filter((_, i) => i !== idx)
      .map((r, i) => ({ ...r, installmentNumber: i + 1 }));
    onChange(updated);
  }

  // Collect unique fee names from all rows
  const feeNames = rows.length > 0
    ? rows[0].fees.map((f) => f.name)
    : [];

  const totals = rows.reduce(
    (acc, r) => ({
      capital: acc.capital + r.capital,
      interest: acc.interest + r.interest,
      fees: acc.fees + r.fees.reduce((sum, f) => sum + f.amount, 0),
      total: acc.total + r.totalAmount,
    }),
    { capital: 0, interest: 0, fees: 0, total: 0 },
  );

  return (
    <div className="space-y-2">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">#</TableHead>
              <TableHead className="w-36">Due Date</TableHead>
              <TableHead className="w-28">Capital</TableHead>
              <TableHead className="w-28">Interest</TableHead>
              {feeNames.map((name) => (
                <TableHead key={name} className="w-28">{name}</TableHead>
              ))}
              <TableHead className="w-28">Total</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row, idx) => (
              <TableRow key={row.installmentNumber}>
                <TableCell className="text-muted-foreground">{row.installmentNumber}</TableCell>
                <TableCell>
                  <Input
                    type="date"
                    value={format(row.dueDate, "yyyy-MM-dd")}
                    onChange={(e) => updateRowDate(idx, e.target.value)}
                    className="h-8 text-xs"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={row.capital || ""}
                    onChange={(e) => updateRow(idx, "capital", parseFloat(e.target.value) || 0)}
                    className="h-8 text-xs"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={row.interest || ""}
                    onChange={(e) => updateRow(idx, "interest", parseFloat(e.target.value) || 0)}
                    className="h-8 text-xs"
                  />
                </TableCell>
                {row.fees.map((fee, fIdx) => (
                  <TableCell key={fee.name}>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={fee.amount || ""}
                      onChange={(e) => updateRowFee(idx, fIdx, parseFloat(e.target.value) || 0)}
                      className="h-8 text-xs"
                    />
                  </TableCell>
                ))}
                <TableCell className="font-medium text-xs">
                  {formatCurrency(row.totalAmount)}
                </TableCell>
                <TableCell>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => removeRow(idx)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
          {rows.length > 0 && (
            <TableFooter>
              <TableRow>
                <TableCell colSpan={2} className="font-medium">Totals</TableCell>
                <TableCell className="font-medium text-xs">{formatCurrency(totals.capital)}</TableCell>
                <TableCell className="font-medium text-xs">{formatCurrency(totals.interest)}</TableCell>
                {feeNames.map((name) => {
                  const feeTotal = rows.reduce((sum, r) => {
                    const fee = r.fees.find((f) => f.name === name);
                    return sum + (fee?.amount ?? 0);
                  }, 0);
                  return (
                    <TableCell key={name} className="font-medium text-xs">
                      {formatCurrency(feeTotal)}
                    </TableCell>
                  );
                })}
                <TableCell className="font-medium text-xs">{formatCurrency(totals.total)}</TableCell>
                <TableCell />
              </TableRow>
            </TableFooter>
          )}
        </Table>
      </div>
      <Button type="button" variant="outline" size="sm" onClick={addRow}>
        <Plus className="mr-1 h-3.5 w-3.5" />
        Add Row
      </Button>
    </div>
  );
}

type ReadonlyScheduleTableProps = {
  rows: Array<{
    installmentNumber: number;
    dueDate: Date | string;
    capital: number;
    interest: number;
    fees: DebtFee[];
    totalAmount: number;
    status: string;
    paidAt?: Date | string | null;
  }>;
  onTogglePaid?: (id: string, currentStatus: string) => void;
  idMap?: Record<number, string>; // installmentNumber -> id
};

export function ReadonlyScheduleTable({ rows, onTogglePaid, idMap }: ReadonlyScheduleTableProps) {
  const feeNames = rows.length > 0
    ? rows[0].fees.map((f) => f.name)
    : [];

  const totals = rows.reduce(
    (acc, r) => ({
      capital: acc.capital + r.capital,
      interest: acc.interest + r.interest,
      total: acc.total + r.totalAmount,
    }),
    { capital: 0, interest: 0, total: 0 },
  );

  const paidCount = rows.filter((r) => r.status === "PAID").length;

  return (
    <div className="space-y-2">
      <div className="text-muted-foreground text-sm">
        {paidCount} / {rows.length} paid
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">#</TableHead>
              <TableHead>Due Date</TableHead>
              <TableHead>Capital</TableHead>
              <TableHead>Interest</TableHead>
              {feeNames.map((name) => (
                <TableHead key={name}>{name}</TableHead>
              ))}
              <TableHead>Total</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => {
              const isPaid = row.status === "PAID";
              const dueDate = typeof row.dueDate === "string" ? new Date(row.dueDate) : row.dueDate;
              return (
                <TableRow key={row.installmentNumber} className={isPaid ? "opacity-60" : ""}>
                  <TableCell className="text-muted-foreground">{row.installmentNumber}</TableCell>
                  <TableCell>{format(dueDate, "MMM yyyy")}</TableCell>
                  <TableCell>{formatCurrency(row.capital)}</TableCell>
                  <TableCell>{formatCurrency(row.interest)}</TableCell>
                  {row.fees.map((fee) => (
                    <TableCell key={fee.name}>{formatCurrency(fee.amount)}</TableCell>
                  ))}
                  <TableCell className="font-medium">{formatCurrency(row.totalAmount)}</TableCell>
                  <TableCell>
                    {onTogglePaid && idMap?.[row.installmentNumber] ? (
                      <button
                        type="button"
                        onClick={() => onTogglePaid(idMap[row.installmentNumber], row.status)}
                        className={`text-xs font-medium px-2 py-0.5 rounded-full cursor-pointer transition-colors ${
                          isPaid
                            ? "bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400"
                            : "bg-yellow-100 text-yellow-700 hover:bg-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400"
                        }`}
                      >
                        {isPaid ? "Paid" : "Pending"}
                      </button>
                    ) : (
                      <span
                        className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                          isPaid
                            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                            : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                        }`}
                      >
                        {isPaid ? "Paid" : "Pending"}
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell colSpan={2} className="font-medium">Totals</TableCell>
              <TableCell className="font-medium">{formatCurrency(totals.capital)}</TableCell>
              <TableCell className="font-medium">{formatCurrency(totals.interest)}</TableCell>
              {feeNames.map((name) => {
                const feeTotal = rows.reduce((sum, r) => {
                  const fee = r.fees.find((f) => f.name === name);
                  return sum + (fee?.amount ?? 0);
                }, 0);
                return (
                  <TableCell key={name} className="font-medium">
                    {formatCurrency(feeTotal)}
                  </TableCell>
                );
              })}
              <TableCell className="font-medium">{formatCurrency(totals.total)}</TableCell>
              <TableCell />
            </TableRow>
          </TableFooter>
        </Table>
      </div>
    </div>
  );
}
