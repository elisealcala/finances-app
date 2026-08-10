import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "@/server/trpc/router";

type RouterOutputs = inferRouterOutputs<AppRouter>;

export type PerformanceDashboard = NonNullable<
  RouterOutputs["performance"]["dashboard"]
>;
export type PerformanceOutcome = PerformanceDashboard["outcomes"][number];
export type PerformanceKeyResult = PerformanceOutcome["keyResults"][number];
export type PerformanceHealth = PerformanceDashboard["health"];
export type GeneratedPerformancePlan =
  RouterOutputs["performance"]["plan"]["generate"];
