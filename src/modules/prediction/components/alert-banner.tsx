"use client";

import { AlertTriangle, AlertCircle, Info } from "lucide-react";
import { useAlerts } from "../hooks/use-alerts";
import { cn } from "@/lib/utils";

const severityConfig = {
  critical: {
    icon: AlertTriangle,
    bg: "bg-red-50 dark:bg-red-950/30",
    border: "border-red-200 dark:border-red-900",
    text: "text-red-800 dark:text-red-200",
    iconColor: "text-red-600 dark:text-red-400",
  },
  warning: {
    icon: AlertCircle,
    bg: "bg-yellow-50 dark:bg-yellow-950/30",
    border: "border-yellow-200 dark:border-yellow-900",
    text: "text-yellow-800 dark:text-yellow-200",
    iconColor: "text-yellow-600 dark:text-yellow-400",
  },
  info: {
    icon: Info,
    bg: "bg-blue-50 dark:bg-blue-950/30",
    border: "border-blue-200 dark:border-blue-900",
    text: "text-blue-800 dark:text-blue-200",
    iconColor: "text-blue-600 dark:text-blue-400",
  },
};

export function AlertBanner() {
  const { data: alerts } = useAlerts();

  if (!alerts || alerts.length === 0) return null;

  return (
    <div className="space-y-2">
      {alerts.map((alert) => {
        const config = severityConfig[alert.severity];
        const Icon = config.icon;
        return (
          <div
            key={alert.id}
            className={cn(
              "flex items-start gap-3 rounded-lg border p-3",
              config.bg,
              config.border,
            )}
          >
            <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", config.iconColor)} />
            <div className="min-w-0 flex-1">
              <p className={cn("text-sm font-medium", config.text)}>
                {alert.title}
              </p>
              <p className={cn("text-xs", config.text, "opacity-80")}>
                {alert.message}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
