// Components
export { DebtPageClient } from "./components/debt-page-client";
export { DebtSummaryCards } from "./components/debt-summary-cards";
export { DebtTable } from "./components/debt-table";
export { DebtTimelineChart } from "./components/debt-timeline-chart";
export { CapitalSimulationPanel } from "./components/capital-simulation-panel";
export { DebtCreatePage } from "./components/debt-create-page";
export { EditableScheduleTable, ReadonlyScheduleTable } from "./components/schedule-table";
export { DebtDetailPage } from "./components/debt-detail-page";
export { CapitalPaymentDialog } from "./components/capital-payment-dialog";

// Hooks
export {
  useDebts,
  useDebt,
  useCreateDebt,
  useUpdateDebt,
  useDeleteDebt,
  useAddPayment,
  useDeletePayment,
} from "./hooks/use-debts";
export { useDebtVisibility } from "./hooks/use-debt-visibility";
export { useDebtSimulation } from "./hooks/use-debt-simulation";
export {
  useMarkInstallmentPaid,
  useMarkInstallmentUnpaid,
  useAddScheduleCapitalPayment,
} from "./hooks/use-installments";

// Utils
export {
  teaToMonthlyRate,
  balanceAfterPayments,
  originalBalance,
  monthsUntilPaidOff,
  generateTimeline,
  simulateExtraPayment,
  computeCurrentBalance,
  totalMonthlyFees,
  generateScheduleTimeline,
} from "./utils/amortization";
export { DEBT_COLOR_PALETTE, pickNextColor } from "./utils/colors";
export { generateEqualPaymentSchedule } from "./utils/schedule";

// Router
export { debtRouter } from "./router";

// Schemas
export {
  createDebtSchema,
  updateDebtSchema,
  listDebtsSchema,
  addPaymentSchema,
  deletePaymentSchema,
  type CreateDebtInput,
  type UpdateDebtInput,
  type ListDebtsInput,
  type AddPaymentInput,
  type CapitalPaymentInput,
  type InstallmentInput,
  markInstallmentPaidSchema,
  markInstallmentUnpaidSchema,
  addScheduleCapitalPaymentSchema,
  type AddScheduleCapitalPaymentInput,
} from "./schema";

// Types
export type { Debt, DebtPayment, DebtInstallment, DebtSummary, DebtFee } from "./types";
export { DebtType, DebtStatus, InstallmentStatus } from "./types";
