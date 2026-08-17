import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { calculateStatementBalances } from "./statement-balances";

describe("calculateStatementBalances", () => {
  test("includes paid expenses in totals but only unpaid expenses in outstanding balances", () => {
    const balances = calculateStatementBalances(
      [
        { amount: 125, currency: "USD", paymentStatus: "NOT_PAID" },
        { amount: 75, currency: "USD", paymentStatus: "PAID" },
        { amount: 25, currency: "USD", paymentStatus: "NOT_PAID" },
      ],
      "PEN",
    );

    assert.deepEqual(balances, {
      totalsByCurrency: { USD: 225 },
      outstandingByCurrency: { USD: 150 },
    });
  });

  test("uses the account currency when an expense currency is missing", () => {
    const balances = calculateStatementBalances(
      [
        { amount: 80, currency: null, paymentStatus: "NOT_PAID" },
        { amount: 20, currency: null, paymentStatus: "PAID" },
      ],
      "PEN",
    );

    assert.deepEqual(balances, {
      totalsByCurrency: { PEN: 100 },
      outstandingByCurrency: { PEN: 80 },
    });
  });

  test("keeps totals and outstanding balances separated by currency", () => {
    const balances = calculateStatementBalances(
      [
        { amount: 100, currency: "PEN", paymentStatus: "NOT_PAID" },
        { amount: 40, currency: "USD", paymentStatus: "NOT_PAID" },
        { amount: 10, currency: "EUR", paymentStatus: "PAID" },
        { amount: 5, currency: "EUR", paymentStatus: "NOT_PAID" },
      ],
      "PEN",
    );

    assert.deepEqual(balances, {
      totalsByCurrency: { PEN: 100, USD: 40, EUR: 15 },
      outstandingByCurrency: { PEN: 100, USD: 40, EUR: 5 },
    });
  });

  test("retains a zero outstanding bucket for a fully paid currency", () => {
    const balances = calculateStatementBalances(
      [
        { amount: 60, currency: "USD", paymentStatus: "PAID" },
        { amount: 40, currency: "USD", paymentStatus: "PAID" },
      ],
      "PEN",
    );

    assert.deepEqual(balances, {
      totalsByCurrency: { USD: 100 },
      outstandingByCurrency: { USD: 0 },
    });
  });

  test("returns empty currency maps for a statement without expenses", () => {
    assert.deepEqual(calculateStatementBalances([], "PEN"), {
      totalsByCurrency: {},
      outstandingByCurrency: {},
    });
  });
});
