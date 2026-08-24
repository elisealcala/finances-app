import assert from "node:assert/strict";
import { describe, test } from "node:test";

import type { AccountWithBalance } from "@/types/finances";

import {
  getDefaultBalanceHiddenAccountIds,
  getAccountCurrencyBalances,
  sumActiveAccountBalances,
} from "./account-balance-totals";

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

describe("getDefaultBalanceHiddenAccountIds", () => {
  test("selects active and archived credit cards without selecting other account types", () => {
    const hiddenAccountIds = getDefaultBalanceHiddenAccountIds([
      account({ id: "bank", type: "BANK" }),
      account({ id: "cash", type: "CASH" }),
      account({ id: "savings", type: "SAVINGS" }),
      account({ id: "investment", type: "INVESTMENT" }),
      account({ id: "other", type: "OTHER" }),
      account({ id: "active-credit-card", type: "CREDIT_CARD" }),
      account({
        id: "archived-credit-card",
        type: "CREDIT_CARD",
        isArchived: true,
      }),
    ]);

    assert.deepEqual(
      hiddenAccountIds,
      new Set(["active-credit-card", "archived-credit-card"]),
    );
  });
});

describe("getAccountCurrencyBalances", () => {
  test("returns primary and configured zero-valued secondary currencies in supported order", () => {
    const balances = getAccountCurrencyBalances(
      account({
        currency: "EUR",
        secondaryCurrency: "PEN",
        balance: 45,
        balancesByCurrency: { EUR: 45 },
      }),
    );

    assert.deepEqual(balances, [
      { currency: "PEN", amount: 0, isPrimary: false },
      { currency: "EUR", amount: 45, isPrimary: true },
    ]);
  });

  test("includes nonconfigured nonzero buckets and trusts bucketed primary values", () => {
    const balances = getAccountCurrencyBalances(
      account({
        currency: "USD",
        secondaryCurrency: null,
        balance: 9_999,
        balancesByCurrency: { PEN: 25, USD: 100, EUR: -5 },
      }),
    );

    assert.deepEqual(balances, [
      { currency: "PEN", amount: 25, isPrimary: false },
      { currency: "USD", amount: 100, isPrimary: true },
      { currency: "EUR", amount: -5, isPrimary: false },
    ]);
  });

  test("falls back to account.balance when currency buckets are absent", () => {
    const balances = getAccountCurrencyBalances(
      account({
        currency: "USD",
        secondaryCurrency: "EUR",
        balance: 300,
      }),
    );

    assert.deepEqual(balances, [
      { currency: "USD", amount: 300, isPrimary: true },
      { currency: "EUR", amount: 0, isPrimary: false },
    ]);
  });
});

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

  test("excludes selected active accounts from primary and multi-currency totals", () => {
    const totals = sumActiveAccountBalances(
      [
        account({
          id: "included-pen-account",
          currency: "PEN",
          balance: 600,
          balancesByCurrency: { PEN: 600 },
        }),
        account({
          id: "excluded-primary-account",
          currency: "USD",
          balance: 250,
          balancesByCurrency: { USD: 250 },
        }),
        account({
          id: "excluded-multi-currency-account",
          currency: "PEN",
          secondaryCurrency: "USD",
          balance: 400,
          balancesByCurrency: { PEN: 400, USD: 125, EUR: 30 },
        }),
        account({
          id: "included-multi-currency-account",
          currency: "USD",
          secondaryCurrency: "EUR",
          balance: 75,
          balancesByCurrency: { USD: 75, EUR: 20 },
        }),
      ],
      new Set([
        "excluded-primary-account",
        "excluded-multi-currency-account",
      ]),
    );

    assert.deepEqual(totals, {
      PEN: 600,
      USD: 75,
      EUR: 20,
    });
  });

  test("continues to exclude archived accounts when an exclusion set is provided", () => {
    const totals = sumActiveAccountBalances(
      [
        account({
          id: "included-active-account",
          currency: "USD",
          balance: 90,
          balancesByCurrency: { USD: 90 },
        }),
        account({
          id: "excluded-active-account",
          currency: "PEN",
          balance: 300,
          balancesByCurrency: { PEN: 300 },
        }),
        account({
          id: "archived-account",
          currency: "EUR",
          balance: 500,
          balancesByCurrency: { EUR: 500 },
          isArchived: true,
        }),
      ],
      new Set(["excluded-active-account"]),
    );

    assert.deepEqual(totals, {
      PEN: 0,
      USD: 90,
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
