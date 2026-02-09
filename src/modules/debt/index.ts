// Components
export { DebtPageClient } from "./components/debt-page-client";
export { DebtSummaryCards } from "./components/debt-summary-cards";
export { DebtTable } from "./components/debt-table";
export { DebtForm } from "./components/debt-form";
export { DebtTimelineChart } from "./components/debt-timeline-chart";
export { CapitalSimulationPanel } from "./components/capital-simulation-panel";

// Hooks
export {
  useDebts,
  useDebt,
  useCreateDebt,
  useUpdateDebt,
  useDeleteDebt,
} from "./hooks/use-debts";
export { useDebtVisibility } from "./hooks/use-debt-visibility";
export { useDebtSimulation } from "./hooks/use-debt-simulation";

// Lib
export {
  teaToMonthlyRate,
  balanceAfterPayments,
  originalBalance,
  monthsUntilPaidOff,
  generateTimeline,
  simulateExtraPayment,
} from "./lib/amortization";
export { DEBT_COLOR_PALETTE, pickNextColor } from "./lib/colors";

// Router
export { debtRouter } from "./router";

// Schemas
export {
  createDebtSchema,
  updateDebtSchema,
  listDebtsSchema,
  type CreateDebtInput,
  type UpdateDebtInput,
  type ListDebtsInput,
} from "./schema";

// Types
export type { Debt, DebtSummary } from "./types";
export { DebtType, DebtStatus } from "./types";
