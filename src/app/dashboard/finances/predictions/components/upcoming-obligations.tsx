"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/utils";
import { format } from "date-fns";
import { useUpcoming } from "@/hooks/use-projection";

export function UpcomingObligations() {
  const { data, isLoading } = useUpcoming(30);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-3 w-64" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[200px] w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upcoming Obligations</CardTitle>
        <CardDescription>
          Payments and expenses due in the next 30 days
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!data || data.length === 0 ? (
          <p className="text-muted-foreground py-8 text-center text-sm">
            No upcoming obligations in the next 30 days.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((obligation) => (
                <TableRow key={obligation.id}>
                  <TableCell className="text-muted-foreground text-sm">
                    {format(new Date(obligation.dueDate), "dd-MM")}
                  </TableCell>
                  <TableCell className="font-medium">
                    {obligation.name}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        obligation.source === "debt_installment"
                          ? "destructive"
                          : "secondary"
                      }
                      className="text-xs"
                    >
                      {obligation.source === "debt_installment"
                        ? "Debt"
                        : "Recurring"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(obligation.amount)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
