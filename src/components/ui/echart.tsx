"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import {
  echarts,
  type EChartsInstance,
  type EChartsOption,
} from "./echart-import";

export { echarts };
export type { EChartsOption, EChartsInstance };

export type EChartTooltipParam = {
  seriesName?: string;
  seriesIndex: number;
  dataIndex: number;
  value: number | number[] | string | null;
  color: string;
  name: string;
  axisValue?: string | number;
  axisValueLabel?: string;
  data: unknown;
};

export type EChartClickParam = {
  componentType?: string;
  seriesType?: string;
  seriesIndex?: number;
  dataIndex?: number;
  name?: string;
  value?: unknown;
  color?: string;
  data?: unknown;
};

type EChartProps = {
  option: EChartsOption;
  className?: string;
  style?: React.CSSProperties;
  /**
   * Render-prop for a React-controlled tooltip. When provided, ECharts'
   * native tooltip box is suppressed (axis pointer line is preserved) and
   * the returned node is portalled into the chart container, positioned
   * near the cursor.
   */
  tooltip?: (params: EChartTooltipParam[]) => React.ReactNode;
  /**
   * Fires whenever the axis-pointer / tooltip would update. Receives the
   * current tooltip params, or `null` when the cursor leaves the chart.
   * Useful for rendering live sidebars / legends synced to hover.
   */
  onAxisHover?: (params: EChartTooltipParam[] | null) => void;
  onClick?: (params: EChartClickParam) => void;
  notMerge?: boolean;
  onReady?: (chart: EChartsInstance) => void;
};

export function EChart({
  option,
  className,
  style,
  tooltip,
  onAxisHover,
  onClick,
  notMerge = true,
  onReady,
}: EChartProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const chartRef = React.useRef<EChartsInstance | null>(null);
  const tooltipRef = React.useRef(tooltip);
  tooltipRef.current = tooltip;
  const onAxisHoverRef = React.useRef(onAxisHover);
  onAxisHoverRef.current = onAxisHover;
  const onClickRef = React.useRef(onClick);
  onClickRef.current = onClick;

  const [tip, setTip] = React.useState<{
    params: EChartTooltipParam[];
    x: number;
    y: number;
  } | null>(null);
  // Track latest cursor position so the very first formatter fire can place
  // the tooltip at the cursor instead of (0, 0).
  const posRef = React.useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const { resolvedTheme } = useTheme();

  React.useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const chart = echarts.init(el, undefined, { renderer: "canvas" });
    chartRef.current = chart;
    onReady?.(chart);

    const ro = new ResizeObserver(() => chart.resize());
    ro.observe(el);

    const zr = chart.getZr();
    const onMove = (e: { offsetX: number; offsetY: number }) => {
      posRef.current = { x: e.offsetX, y: e.offsetY };
      setTip((prev) =>
        prev ? { ...prev, x: e.offsetX, y: e.offsetY } : prev,
      );
    };
    const onOut = () => {
      setTip(null);
      onAxisHoverRef.current?.(null);
    };
    const onChartClick = (params: unknown) => {
      onClickRef.current?.(params as EChartClickParam);
    };
    zr.on("mousemove", onMove);
    zr.on("globalout", onOut);
    chart.on("click", onChartClick);

    return () => {
      ro.disconnect();
      zr.off("mousemove", onMove);
      zr.off("globalout", onOut);
      chart.off("click", onChartClick);
      chart.dispose();
      chartRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;

    let next: EChartsOption = option;

    if (tooltipRef.current || onAxisHoverRef.current) {
      const base = (option.tooltip ?? {}) as Record<string, unknown>;
      next = {
        ...option,
        tooltip: {
          trigger: "axis",
          ...base,
          show: true,
          // Render the native tooltip but hide it via CSS — keeps the
          // formatter firing on every axis pointer update while letting us
          // draw our React portal in its place. `showContent: false` is
          // unreliable across ECharts versions and can stop the formatter.
          backgroundColor: "transparent",
          borderColor: "transparent",
          padding: 0,
          extraCssText:
            "box-shadow: none !important; background: transparent !important; visibility: hidden !important;",
          formatter: ((raw: unknown) => {
            const arr: EChartTooltipParam[] = Array.isArray(raw)
              ? (raw as EChartTooltipParam[])
              : [raw as EChartTooltipParam];
            queueMicrotask(() => {
              if (tooltipRef.current) {
                setTip({
                  params: arr,
                  x: posRef.current.x,
                  y: posRef.current.y,
                });
              }
              onAxisHoverRef.current?.(arr);
            });
            return "";
            // ECharts' formatter type wants string, so cast.
          }) as unknown as string,
        },
      };
    }

    chart.setOption(next, { notMerge });
    chart.resize();
  }, [option, notMerge, resolvedTheme]);

  const tooltipDivRef = React.useRef<HTMLDivElement>(null);

  // After each tip update, flip the tooltip to the opposite side of the cursor
  // if it would overflow the chart container. Runs synchronously before paint
  // so the user never sees the un-flipped position.
  React.useLayoutEffect(() => {
    const tt = tooltipDivRef.current;
    const ct = containerRef.current;
    if (!tip || !tt || !ct) return;

    const ttW = tt.offsetWidth;
    const ttH = tt.offsetHeight;
    const cW = ct.clientWidth;
    const cH = ct.clientHeight;
    const margin = 8;

    let left = tip.x + 14;
    let top = tip.y + 14;

    if (left + ttW > cW - margin) {
      // Flip to the left of the cursor; clamp to container.
      left = Math.max(margin, tip.x - 14 - ttW);
    }
    if (top + ttH > cH - margin) {
      // Flip above the cursor; clamp to container.
      top = Math.max(margin, tip.y - 14 - ttH);
    }

    tt.style.left = `${left}px`;
    tt.style.top = `${top}px`;
  }, [tip]);

  return (
    <div
      ref={containerRef}
      className={cn("relative h-full w-full", className)}
      style={style}
    >
      {tip && tooltipRef.current && containerRef.current
        ? createPortal(
            <div
              ref={tooltipDivRef}
              className="pointer-events-none absolute z-50"
              style={{ left: tip.x + 14, top: tip.y + 14 }}
            >
              {tooltipRef.current(tip.params)}
            </div>,
            containerRef.current,
          )
        : null}
    </div>
  );
}

/**
 * Resolve a list of CSS var references (e.g. `var(--chart-1)`) to concrete
 * color strings the canvas can paint. Re-runs when next-themes' resolved
 * theme changes, so dark mode swaps automatically.
 */
export function useChartColors(refs: string[]): Record<string, string> {
  const { resolvedTheme } = useTheme();
  const [colors, setColors] = React.useState<Record<string, string>>({});
  const refsKey = refs.join("|");

  React.useEffect(() => {
    if (typeof document === "undefined") return;
    const probe = document.createElement("span");
    probe.style.position = "absolute";
    probe.style.visibility = "hidden";
    probe.style.pointerEvents = "none";
    document.body.appendChild(probe);

    const list = refsKey.split("|").filter(Boolean);
    const next: Record<string, string> = {};
    for (const ref of list) {
      probe.style.color = ref;
      next[ref] = getComputedStyle(probe).color;
    }
    probe.remove();
    setColors(next);
  }, [resolvedTheme, refsKey]);

  return colors;
}
