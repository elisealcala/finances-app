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

type Currency = "PEN" | "USD" | "EUR";

type CategoryRow = {
  name: string;
  amount: number;
  color: string | null;
};

export type CategoryBreakdownGroup = {
  currency: Currency;
  data?: CategoryRow[];
};

type PreparedCategoryRow = {
  name: string;
  amount: number;
  color: string;
};

type PreparedCategoryGroup = {
  currency: Currency;
  allRows: PreparedCategoryRow[];
  visibleRows: PreparedCategoryRow[];
  visibleTotal: number;
  fullTotal: number;
};

type CategoryBreakdownChartProps = {
  groups?: CategoryBreakdownGroup[];
  data?: CategoryRow[];
  isLoading?: boolean;
  currency?: Currency;
  periodLabel?: string;
  onResetPeriod?: () => void;
};

function rowKey(currency: Currency, name: string) {
  return `${currency}:${name}`;
}

function CategoryTooltip({
  params,
  total,
  currency,
}: {
  params: EChartTooltipParam[];
  total: number;
  currency: Currency;
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
  groups,
  data,
  isLoading,
  currency = "PEN",
  periodLabel,
  onResetPeriod,
}: CategoryBreakdownChartProps) {
  const [deselected, setDeselected] = useState<Set<string>>(new Set());

  const preparedGroups = useMemo(() => {
    const sourceGroups = groups ?? (data ? [{ currency, data }] : []);
    return sourceGroups
      .map((group) => {
        const allRows = (group.data ?? []).map((entry, i) => ({
          name: entry.name,
          amount: entry.amount,
          color:
            entry.color ??
            FINANCE_COLOR_PALETTE[i % FINANCE_COLOR_PALETTE.length],
        }));
        const visibleRows = allRows.filter(
          (row) => !deselected.has(rowKey(group.currency, row.name)),
        );
        const visibleTotal = visibleRows.reduce((s, r) => s + r.amount, 0);
        const fullTotal = allRows.reduce((s, r) => s + r.amount, 0);
        return {
          currency: group.currency,
          allRows,
          visibleRows,
          visibleTotal,
          fullTotal,
        };
      })
      .filter((group) => group.allRows.length > 0);
  }, [currency, data, deselected, groups]);

  const totalCategoryCount = preparedGroups.reduce(
    (sum, group) => sum + group.allRows.length,
    0,
  );
  const chartGroup = preparedGroups.length === 1 ? preparedGroups[0] : undefined;
  const description = periodLabel
    ? `${totalCategoryCount} categories for ${periodLabel} - click rows to filter`
    : `${totalCategoryCount} categories this period - click rows to filter`;

  const toggle = (groupCurrency: Currency, name: string) => {
    const key = rowKey(groupCurrency, name);
    setDeselected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const pieOption = useMemo<EChartsOption>(() => {
    const hasVisible = (chartGroup?.visibleRows.length ?? 0) > 0;
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
          data: (chartGroup?.visibleRows ?? []).map((r) => ({
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
                text: formatCurrency(
                  chartGroup?.visibleTotal ?? 0,
                  chartGroup?.currency ?? "PEN",
                ),
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
  }, [chartGroup, deselected.size]);

  const renderTooltip = (params: EChartTooltipParam[]) =>
    chartGroup ? (
      <CategoryTooltip
        params={params}
        total={chartGroup.visibleTotal}
        currency={chartGroup.currency}
      />
    ) : null;

  if (isLoading || (!groups && !data)) {
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

  if (preparedGroups.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CategoryHeader
            description={
              periodLabel
                ? `No categorized expenses for ${periodLabel}`
                : "Where your money goes"
            }
            hasDeselected={false}
            onClearSelection={() => setDeselected(new Set())}
            onResetPeriod={onResetPeriod}
          />
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
        <CategoryHeader
          description={description}
          hasDeselected={deselected.size > 0}
          onClearSelection={() => setDeselected(new Set())}
          onResetPeriod={onResetPeriod}
        />
      </CardHeader>
      <CardContent>
        {chartGroup ? (
          <>
            <EChart
              option={pieOption}
              tooltip={renderTooltip}
              className="h-[400px]"
            />
            <CategoryRows
              group={chartGroup}
              deselected={deselected}
              onToggle={toggle}
            />
          </>
        ) : (
          <div className="space-y-6">
            {preparedGroups.map((group) => (
              <section key={group.currency} className="space-y-3">
                <div className="flex items-baseline justify-between gap-3">
                  <h3 className="text-sm font-semibold">{group.currency}</h3>
                  <span className="font-mono text-sm font-semibold tabular-nums">
                    {formatCurrency(group.visibleTotal, group.currency)}
                  </span>
                </div>
                <CategoryRows
                  group={group}
                  deselected={deselected}
                  onToggle={toggle}
                  showBorder={false}
                />
              </section>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function CategoryHeader({
  description,
  hasDeselected,
  onClearSelection,
  onResetPeriod,
}: {
  description: string;
  hasDeselected: boolean;
  onClearSelection: () => void;
  onResetPeriod?: () => void;
}) {
  return (
    <div className="flex items-start justify-between gap-2">
      <div>
        <CardTitle>Expenses by Category</CardTitle>
        <CardDescription>{description}</CardDescription>
      </div>
      <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
        {onResetPeriod && (
          <Button
            variant="outline"
            size="sm"
            onClick={onResetPeriod}
            className="gap-1.5"
          >
            <RotateCcw className="h-3 w-3" />
            Reset period
          </Button>
        )}
        {hasDeselected && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearSelection}
            className="text-muted-foreground gap-1.5"
          >
            <RotateCcw className="h-3 w-3" />
            Clear filter
          </Button>
        )}
      </div>
    </div>
  );
}

function CategoryRows({
  group,
  deselected,
  onToggle,
  showBorder = true,
}: {
  group: PreparedCategoryGroup;
  deselected: Set<string>;
  onToggle: (currency: Currency, name: string) => void;
  showBorder?: boolean;
}) {
  return (
    <div
      className={cn(
        "space-y-3",
        showBorder && "border-border mt-4 border-t pt-4",
      )}
    >
      {group.allRows.map((row) => {
        const key = rowKey(group.currency, row.name);
        const isHidden = deselected.has(key);
        const pct =
          !isHidden && group.visibleTotal > 0
            ? (row.amount / group.visibleTotal) * 100
            : 0;
        return (
          <button
            key={key}
            type="button"
            onClick={() => onToggle(group.currency, row.name)}
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
                  style={{ backgroundColor: row.color }}
                />
                <span
                  className={cn(
                    "truncate font-medium",
                    isHidden && "line-through",
                  )}
                >
                  {row.name}
                </span>
              </div>
              <div className="flex shrink-0 items-baseline gap-3">
                <span className="font-mono font-medium tabular-nums">
                  {formatCurrency(row.amount, group.currency)}
                </span>
                <span className="text-muted-foreground w-12 text-right text-xs tabular-nums">
                  {isHidden ? "--" : `${pct.toFixed(1)}%`}
                </span>
              </div>
            </div>
            <div className="bg-muted h-1.5 w-full overflow-hidden rounded-full">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${pct}%`,
                  backgroundColor: row.color,
                }}
              />
            </div>
          </button>
        );
      })}
    </div>
  );
}
