import assert from "node:assert/strict";
import { describe, test } from "node:test";

import type { Debt, DebtInstallment, DebtPayment } from "@/types/debt";

import { getDebtPayoffDate } from "./amortization";

const date = (value: string) => new Date(`${value}T00:00:00.000Z`);

function createPayment(overrides: Partial<DebtPayment> = {}): DebtPayment {
  return {
    id: "payment-1",
    amount: 500,
    date: date("2026-03-10"),
    notes: null,
    newMonthlyCapital: null,
    newMonthlyInterest: null,
    newMinimumPayment: null,
    newFees: null,
    debtId: "debt-1",
    createdAt: date("2026-03-10"),
    ...overrides,
  };
}

function createInstallment(
  overrides: Partial<DebtInstallment> = {},
): DebtInstallment {
  return {
    id: "installment-1",
    installmentNumber: 1,
    dueDate: date("2026-01-15"),
    capital: 100,
    interest: 10,
    fees: [],
    totalAmount: 110,
    status: "PENDING",
    paidAt: null,
    notes: null,
    debtId: "debt-1",
    createdAt: date("2025-12-01"),
    ...overrides,
  };
}

function createDebt(overrides: Partial<Debt> = {}): Debt {
  return {
    id: "debt-1",
    name: "Personal loan",
    type: "PERSONAL_LOAN",
    originalBalance: 1000,
    balance: 0,
    interestRate: 20,
    monthlyCapital: 100,
    monthlyInterest: 10,
    originalMonthlyCapital: 100,
    originalMonthlyInterest: 10,
    minimumPayment: 110,
    originalMinimumPayment: 110,
    dueDate: 15,
    lender: null,
    notes: null,
    color: null,
    fees: [],
    startedAt: date("2025-12-01"),
    status: "PAID_OFF",
    createdAt: date("2025-12-01"),
    updatedAt: date("2026-12-20"),
    hasSchedule: false,
    termMonths: null,
    payments: [],
    installments: [],
    ...overrides,
  };
}

describe("getDebtPayoffDate", () => {
  test("returns null for an active debt even when it has payment history", () => {
    const debt = createDebt({
      status: "ACTIVE",
      balance: 400,
      payments: [createPayment({ date: date("2026-04-01") })],
      installments: [
        createInstallment({ status: "PAID", dueDate: date("2026-02-15") }),
      ],
    });

    assert.equal(getDebtPayoffDate(debt), null);
  });

  test("returns the latest capital payment date for a paid-off debt with payments only", () => {
    const debt = createDebt({
      payments: [
        createPayment({ id: "p-1", date: date("2026-02-10") }),
        createPayment({ id: "p-2", date: date("2026-06-25") }),
        createPayment({ id: "p-3", date: date("2026-04-05") }),
      ],
    });

    assert.deepEqual(getDebtPayoffDate(debt), date("2026-06-25"));
  });

  test("returns the latest paid installment due date, ignoring pending installments and paidAt", () => {
    const debt = createDebt({
      hasSchedule: true,
      termMonths: 12,
      installments: [
        createInstallment({
          id: "i-1",
          installmentNumber: 1,
          status: "PAID",
          dueDate: date("2026-09-15"),
          paidAt: date("2026-09-14"),
        }),
        createInstallment({
          id: "i-2",
          installmentNumber: 2,
          status: "PAID",
          dueDate: date("2026-10-15"),
          paidAt: date("2026-11-02"),
        }),
        createInstallment({
          id: "i-3",
          installmentNumber: 3,
          status: "PENDING",
          dueDate: date("2026-11-15"),
        }),
      ],
    });

    assert.deepEqual(getDebtPayoffDate(debt), date("2026-10-15"));
  });

  test("returns the later of the latest capital payment and latest paid installment", () => {
    const paymentIsLater = createDebt({
      hasSchedule: true,
      payments: [createPayment({ date: date("2026-08-20") })],
      installments: [
        createInstallment({ status: "PAID", dueDate: date("2026-07-15") }),
      ],
    });
    const installmentIsLater = createDebt({
      hasSchedule: true,
      payments: [createPayment({ date: date("2026-05-20") })],
      installments: [
        createInstallment({ status: "PAID", dueDate: date("2026-07-15") }),
      ],
    });

    assert.deepEqual(getDebtPayoffDate(paymentIsLater), date("2026-08-20"));
    assert.deepEqual(getDebtPayoffDate(installmentIsLater), date("2026-07-15"));
  });

  test("falls back to updatedAt when there are no payments or installments", () => {
    const debt = createDebt({
      updatedAt: date("2026-12-20"),
      payments: [],
      installments: [],
    });

    assert.deepEqual(getDebtPayoffDate(debt), date("2026-12-20"));
  });
});
