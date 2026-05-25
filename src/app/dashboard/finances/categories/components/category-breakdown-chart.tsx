"use client";

import { useMemo, useState } from "react";
import { RotateCcw } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  EChart,
  type EChartTooltipParam,
  type EChartsOption,
} from "@/components/ui/echart";
import { FINANCE_COLOR_PALETTE } from "@/server/trpc/services/finances/colors";
import { cn, formatCurrency } from "@/lib/utils";

type CategoryBreakdownChartProps = {
  data?: { name: string; amount: number; color: string | null }[];
  isLoading?: boolean;
  currency?: "PEN" | "USD" | "EUR";
};

function CategoryTooltip({
  params,
  total,
  currency,
}: {
  params: EChartTooltipParam[];
  total: number;
  currency: "PEN" | "USD" | "EUR";
}) {
  const p = params[0];
  if (!p) return null;
  const value = Number(p.value);
  const pct = total > 0 ? (value / total) * 100 : 0;
  return (
    <div className="border-border/50 bg-background min-w-[200px] rounded-lg border px-4 py-3 text-sm shadow-xl">
      <div className="mb-2 flex items-center gap-2">
        <span
          className="h-3 w-3 rounded-[3px]"
          style={{ backgroundColor: p.color }}
        />
        <span className="text-base font-semibold">{p.name}</span>
      </div>
      <div className="text-foreground font-mono text-lg font-bold tabular-nums">
        {formatCurrency(value, currency)}
      </div>
      <div className="text-muted-foreground text-xs">
        {pct.toFixed(1)}% of selected
      </div>
    </div>
  );
}

export function CategoryBreakdownChart({
  data,
  isLoading,
  currency = "PEN",
}: CategoryBreakdownChartProps) {
  const [deselected, setDeselected] = useState<Set<string>>(new Set());

  const enriched = useMemo(() => {
    const allRows = (data ?? []).map((entry, i) => ({
      name: entry.name,
      amount: entry.amount,
      color:
        entry.color ??
        FINANCE_COLOR_PALETTE[i % FINANCE_COLOR_PALETTE.length],
    }));
    const visibleRows = allRows.filter((r) => !deselected.has(r.name));
    const visibleTotal = visibleRows.reduce((s, r) => s + r.amount, 0);
    const fullTotal = allRows.reduce((s, r) => s + r.amount, 0);
    return { allRows, visibleRows, visibleTotal, fullTotal };
  }, [data, deselected]);

  const toggle = (name: string) => {
    setDeselected((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const option = useMemo<EChartsOption>(() => {
    const hasVisible = enriched.visibleRows.length > 0;
    return {
      tooltip: { trigger: "item" },
      legend: { show: false },
      series: [
        {
          name: "Categories",
          type: "pie",
          radius: ["58%", "82%"],
          center: ["50%", "50%"],
          avoidLabelOverlap: true,
          label: { show: false },
          labelLine: { show: false },
          itemStyle: {
            borderColor: "var(--background)",
            borderWidth: 2,
          },
          data: enriched.visibleRows.map((r) => ({
            name: r.name,
            value: r.amount,
            itemStyle: { color: r.color },
          })),
        },
      ],
      graphic: hasVisible
        ? [
            {
              type: "text",
              left: "center",
              top: "44%",
              style: {
                text: deselected.size > 0 ? "Selected" : "Total",
                textAlign: "center",
                fill: "#94a3b8",
                fontSize: 12,
              },
            },
            {
              type: "text",
              left: "center",
              top: "51%",
              style: {
                text: formatCurrency(enriched.visibleTotal, currency),
                textAlign: "center",
                fill: "currentColor",
                fontSize: 20,
                fontWeight: "bold",
              },
            },
          ]
        : [
            {
              type: "text",
              left: "center",
              top: "48%",
              style: {
                text: "No categories selected",
                textAlign: "center",
                fill: "#94a3b8",
                fontSize: 13,
              },
            },
          ],
    };
  }, [enriched, currency, deselected]);

  const renderTooltip = (params: EChartTooltipParam[]) => (
    <CategoryTooltip
      params={params}
      total={enriched.visibleTotal}
      currency={currency}
    />
  );

  if (isLoading || !data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Expenses by Category</CardTitle>
          <CardDescription>Where your money goes</CardDescription>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[500px] w-full" />
        </CardContent>
      </Card>
    );
  }

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Expenses by Category</CardTitle>
          <CardDescription>Where your money goes</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-muted-foreground flex h-[500px] items-center justify-center">
            No categorized expenses this period.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle>Expenses by Category</CardTitle>
            <CardDescription>
              {enriched.allRows.length} categories this period — click rows
              to filter
            </CardDescription>
          </div>
          {deselected.size > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDeselected(new Set())}
              className="text-muted-foreground gap-1.5"
            >
              <RotateCcw className="h-3 w-3" />
              Reset
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <EChart
          option={option}
          tooltip={renderTooltip}
          className="h-[400px]"
        />
        <div className="border-border mt-4 space-y-3 border-t pt-4">
          {enriched.allRows.map((r) => {
            const isHidden = deselected.has(r.name);
            const pct =
              !isHidden && enriched.visibleTotal > 0
                ? (r.amount / enriched.visibleTotal) * 100
                : 0;
            return (
              <button
                key={r.name}
                type="button"
                onClick={() => toggle(r.name)}
                aria-pressed={!isHidden}
                className={cn(
                  "hover:bg-accent/40 -mx-2 block w-full cursor-pointer space-y-1 rounded-md px-2 py-1.5 text-left transition-colors",
                  isHidden && "opacity-40",
                )}
              >
                <div className="flex items-center justify-between gap-3 text-sm">
                  <div className="flex min-w-0 items-center gap-2">
                    <span
                      className="h-3 w-3 shrink-0 rounded-[3px]"
                      style={{ backgroundColor: r.color }}
                    />
                    <span
                      className={cn(
                        "truncate font-medium",
                        isHidden && "line-through",
                      )}
                    >
                      {r.name}
                    </span>
                  </div>
                  <div className="flex shrink-0 items-baseline gap-3">
                    <span className="font-mono font-medium tabular-nums">
                      {formatCurrency(r.amount, currency)}
                    </span>
                    <span className="text-muted-foreground w-12 text-right text-xs tabular-nums">
                      {isHidden ? "—" : `${pct.toFixed(1)}%`}
                    </span>
                  </div>
                </div>
                <div className="bg-muted h-1.5 w-full overflow-hidden rounded-full">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${pct}%`,
                      backgroundColor: r.color,
                    }}
                  />
                </div>
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
