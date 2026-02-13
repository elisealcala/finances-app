"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { MONTHS } from "@/lib/utils";
import type { MonthlySummaryItem } from "../types";

type MonthlyOverviewChartProps = {
  data?: MonthlySummaryItem[];
  isLoading?: boolean;
};

export function MonthlyOverviewChart({
  data,
  isLoading,
}: MonthlyOverviewChartProps) {
  if (isLoading || !data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Monthly Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }

  const chartData = data.map((item) => ({
    name: MONTHS[item.month - 1].substring(0, 3),
    Income: item.income,
    Expenses: item.expenses,
    Savings: item.savings,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Monthly Overview</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis dataKey="name" className="text-xs" />
            <YAxis className="text-xs" />
            <Tooltip />
            <Legend />
            <Bar dataKey="Income" fill="#16a34a" radius={[2, 2, 0, 0]} />
            <Bar dataKey="Expenses" fill="#dc2626" radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
