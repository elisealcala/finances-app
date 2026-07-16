"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn, formatCurrency } from "@/lib/utils";

type Currency = "PEN" | "USD" | "EUR";

type IncomeCategorySummaryRow = {
  categoryId: string | null;
  categoryName: string;
  categoryColor: string | null;
  currency: Currency;
  amount: number;
  count: number;
  share: number;
};

type IncomeCategorySummaryCardProps = {
  rows?: IncomeCategorySummaryRow[];
  totalsByCurrency?: Record<string, number>;
  isLoading?: boolean;
};

function formatTotals(totalsByCurrency: Record<string, number> | undefined) {
  const entries = Object.entries(totalsByCurrency ?? {}).filter(
    ([, amount]) => amount > 0,
  );

  if (entries.length === 0) return formatCurrency(0);

  return entries
    .map(([currency, amount]) =>
      formatCurrency(amount, currency as Currency),
    )
    .join(" / ");
}

export function IncomeCategorySummaryCard({
  rows = [],
  totalsByCurrency,
  isLoading,
}: IncomeCategorySummaryCardProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Income by Category</CardTitle>
          <CardDescription>All-time totals</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-10 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <div>
            <CardTitle>Income by Category</CardTitle>
            <CardDescription>All-time totals</CardDescription>
          </div>
          <div className="text-right">
            <div className="text-muted-foreground text-xs">Total</div>
            <div className="font-mono text-lg font-semibold tabular-nums">
              {formatTotals(totalsByCurrency)}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Category</TableHead>
                <TableHead>Currency</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Records</TableHead>
                <TableHead className="text-right">Share</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length > 0 ? (
                rows.map((row) => (
                  <TableRow key={`${row.categoryId ?? "none"}-${row.currency}`}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            "h-2.5 w-2.5 shrink-0 rounded-full",
                            !row.categoryColor && "bg-muted-foreground/40",
                          )}
                          style={
                            row.categoryColor
                              ? { backgroundColor: row.categoryColor }
                              : undefined
                          }
                        />
                        <span className="font-medium">
                          {row.categoryName}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>{row.currency}</TableCell>
                    <TableCell className="text-right font-mono tabular-nums">
                      {formatCurrency(row.amount, row.currency)}
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums">
                      {row.count}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="bg-muted h-1.5 w-20 overflow-hidden rounded-full">
                          <div
                            className="bg-primary h-full rounded-full"
                            style={{
                              width: `${Math.min(Math.max(row.share, 0), 100)}%`,
                            }}
                          />
                        </div>
                        <span className="font-mono tabular-nums">
                          {row.share.toFixed(1)}%
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    No income categories found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
