import assert from "node:assert/strict";
import { describe, test } from "node:test";

import type { AccountWithBalance } from "@/types/finances";

import { sumActiveAccountBalances } from "./account-balance-totals";

const createdAt = new Date("2026-08-10T12:00:00.000Z");

function account(
  overrides: Partial<AccountWithBalance> = {},
): AccountWithBalance {
  return {
    id: "account-id",
    name: "Test account",
    type: "BANK",
    opening: 0,
    currency: "PEN",
    secondaryCurrency: null,
    color: null,
    notes: null,
    isArchived: false,
    creditLimit: null,
    apr: null,
    billingDay: null,
    paymentDueDay: null,
    defaultPayingAccountId: null,
    debtId: null,
    createdAt,
    updatedAt: createdAt,
    balance: 0,
    ...overrides,
  };
}

describe("sumActiveAccountBalances", () => {
  test("sums active primary balances and secondary-currency buckets", () => {
    const totals = sumActiveAccountBalances([
      account({
        id: "pen-account",
        currency: "PEN",
        balance: 1_000,
        balancesByCurrency: { PEN: 1_000 },
      }),
      account({
        id: "usd-account",
        currency: "USD",
        balance: 200,
        balancesByCurrency: { USD: 200 },
      }),
      account({
        id: "eur-account",
        currency: "EUR",
        balance: 50,
        balancesByCurrency: { EUR: 50 },
      }),
      account({
        id: "dual-currency-account",
        currency: "PEN",
        secondaryCurrency: "USD",
        balance: 400,
        balancesByCurrency: { PEN: 400, USD: 125 },
      }),
    ]);

    assert.deepEqual(totals, {
      PEN: 1_400,
      USD: 325,
      EUR: 50,
    });
  });

  test("subtracts negative credit-card balances from their currency totals", () => {
    const totals = sumActiveAccountBalances([
      account({
        id: "usd-cash",
        currency: "USD",
        balance: 500,
        balancesByCurrency: { USD: 500 },
      }),
      account({
        id: "usd-credit-card",
        type: "CREDIT_CARD",
        currency: "USD",
        balance: -175,
        balancesByCurrency: { USD: -175 },
      }),
    ]);

    assert.deepEqual(totals, {
      PEN: 0,
      USD: 325,
      EUR: 0,
    });
  });

  test("excludes archived accounts regardless of their balance representation", () => {
    const totals = sumActiveAccountBalances([
      account({
        id: "active-account",
        currency: "PEN",
        balance: 250,
      }),
      account({
        id: "archived-fallback-account",
        currency: "PEN",
        balance: 5_000,
        isArchived: true,
      }),
      account({
        id: "archived-bucketed-account",
        currency: "USD",
        balance: 10_000,
        balancesByCurrency: { USD: 10_000, EUR: 2_000 },
        isArchived: true,
      }),
    ]);

    assert.deepEqual(totals, {
      PEN: 250,
      USD: 0,
      EUR: 0,
    });
  });

  test("falls back to account.balance when currency buckets are absent", () => {
    const totals = sumActiveAccountBalances([
      account({ id: "pen-fallback", currency: "PEN", balance: 900 }),
      account({ id: "usd-fallback", currency: "USD", balance: 120 }),
      account({ id: "eur-fallback", currency: "EUR", balance: 35 }),
    ]);

    assert.deepEqual(totals, {
      PEN: 900,
      USD: 120,
      EUR: 35,
    });
  });

  test("treats missing currency buckets as zero instead of using the fallback balance", () => {
    const totals = sumActiveAccountBalances([
      account({
        currency: "PEN",
        secondaryCurrency: "USD",
        balance: 999,
        balancesByCurrency: { USD: 75 },
      }),
    ]);

    assert.deepEqual(totals, {
      PEN: 0,
      USD: 75,
      EUR: 0,
    });
  });
});
