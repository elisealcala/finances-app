import "server-only";
import type Anthropic from "@anthropic-ai/sdk";
import { getServerCaller } from "./caller";

const CURRENCIES = ["PEN", "USD", "EUR"] as const;

// Each tool maps 1:1 to a read-only tRPC procedure. Descriptions are
// prescriptive about *when* to call the tool, which improves triggering.
export const ASSISTANT_TOOLS: Anthropic.Tool[] = [
  {
    name: "get_account_balances",
    description:
      "List all active accounts with their current balance by currency, type, and credit limit. Call this when the user asks about account balances, how much money they have, or a specific account.",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "get_budget_status",
    description:
      "Get budget vs. actual spend per category for a month or year. Call this when the user asks about their budget, whether they are overspending, or how a category is tracking.",
    input_schema: {
      type: "object",
      properties: {
        year: {
          type: "integer",
          description: "Defaults to the current year if omitted.",
        },
        month: {
          type: "integer",
          minimum: 1,
          maximum: 12,
          description: "1-12. Omit for a full-year view.",
        },
      },
    },
  },
  {
    name: "get_expense_summary",
    description:
      "Get total income, total expenses, savings, and top spending categories for a period, broken down by currency. Call this when the user asks how much they spent or earned in a month or year.",
    input_schema: {
      type: "object",
      properties: {
        year: {
          type: "integer",
          description: "Defaults to the current year if omitted.",
        },
        month: {
          type: "integer",
          minimum: 1,
          maximum: 12,
          description: "1-12. Omit for a full-year view.",
        },
      },
    },
  },
  {
    name: "get_recent_transactions",
    description:
      "List recent expenses, most recent first, optionally filtered by month or category. Call this when the user asks what they recently bought or wants to see individual transactions.",
    input_schema: {
      type: "object",
      properties: {
        year: { type: "integer" },
        month: { type: "integer", minimum: 1, maximum: 12 },
        limit: {
          type: "integer",
          minimum: 1,
          maximum: 50,
          description: "Max transactions to return (default 20).",
        },
      },
    },
  },
  {
    name: "get_credit_card_statement_status",
    description:
      "List credit card billing statements with totals by currency, billing close date, payment due date, and status (OPEN/CLOSED/PAID). Call this when the user asks about a card statement, bill, or what they owe on a card.",
    input_schema: {
      type: "object",
      properties: {
        year: { type: "integer" },
        status: { type: "string", enum: ["OPEN", "CLOSED", "PAID"] },
      },
    },
  },
  {
    name: "get_debt_status",
    description:
      "List debts with balances, interest rates, minimum payments, and status, plus a summary. Call this when the user asks about their debts, loans, or how much they owe.",
    input_schema: {
      type: "object",
      properties: {
        status: { type: "string", enum: ["ACTIVE", "PAID_OFF"] },
      },
    },
  },
  {
    name: "get_available_balance",
    description:
      "Get how much is actually available to spend per account after committed upcoming obligations (debt payments, recurring bills). Call this when the user asks how much they can safely spend.",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "get_financial_alerts",
    description:
      "Get current financial alerts: negative balances, tight margins, budgets near or over their limit, and upcoming debt payments. Call this when the user asks if anything needs attention or why an account is tight.",
    input_schema: { type: "object", properties: {} },
  },
];

export async function dispatchTool(
  name: string,
  input: unknown,
): Promise<unknown> {
  const caller = getServerCaller();
  const args = (input ?? {}) as {
    year?: number;
    month?: number;
    limit?: number;
    status?: "OPEN" | "CLOSED" | "PAID" | "ACTIVE" | "PAID_OFF";
  };
  const now = new Date();
  const year = typeof args.year === "number" ? args.year : now.getFullYear();
  const month = typeof args.month === "number" ? args.month : undefined;

  switch (name) {
    case "get_account_balances": {
      const { accounts } = await caller.finances.account.list({
        isArchived: false,
      });
      return accounts.map((a) => ({
        name: a.name,
        type: a.type,
        currency: a.currency,
        balance: a.balance,
        balancesByCurrency: a.balancesByCurrency,
        creditLimit: a.creditLimit,
      }));
    }

    case "get_budget_status": {
      const statuses = await caller.finances.category.budgetStatus({
        year,
        month,
      });
      return statuses.map((s) => ({
        category: s.categoryName,
        budget: s.budget,
        spent: s.spent,
        remaining: s.remaining,
        percentUsed: Math.round(s.percentUsed),
      }));
    }

    case "get_expense_summary": {
      const perCurrency = await Promise.all(
        CURRENCIES.map(async (currency) => {
          const s = await caller.finances.overview.periodSummary({
            year,
            month,
            currency,
          });
          return { currency, ...s };
        }),
      );
      return perCurrency
        .filter((s) => s.totalIncome !== 0 || s.totalExpenses !== 0)
        .map((s) => ({
          currency: s.currency,
          totalIncome: s.totalIncome,
          totalExpenses: s.totalExpenses,
          savings: s.savings,
          savingsRate: Math.round(s.savingsRate),
          topCategories: s.topCategories
            .slice(0, 5)
            .map((c) => ({ name: c.name, amount: c.amount })),
        }));
    }

    case "get_recent_transactions": {
      const limit =
        typeof args.limit === "number"
          ? Math.min(Math.max(args.limit, 1), 50)
          : 20;
      // Only filter by period when the model asked for one, so "recent" spans
      // all history rather than being pinned to the current year.
      const { expenses } = await caller.finances.expense.list({
        year: args.year,
        month: args.month,
        sortBy: "date",
        sortOrder: "desc",
      });
      return expenses.slice(0, limit).map((e) => ({
        name: e.name,
        amount: e.amount,
        currency: e.currency,
        date: e.date,
        paymentStatus: e.paymentStatus,
        category:
          (e.category as { name?: string } | null | undefined)?.name ?? null,
      }));
    }

    case "get_credit_card_statement_status": {
      const { statements } = await caller.finances.statement.list({
        year: args.year,
        status:
          args.status === "OPEN" ||
          args.status === "CLOSED" ||
          args.status === "PAID"
            ? args.status
            : undefined,
      });
      return statements.map((s) => ({
        card: s.account.name,
        period: `${s.month}/${s.year}`,
        status: s.status,
        totalsByCurrency: s.totalsByCurrency,
        expenseCount: s.expenseCount,
        billingCloseDate: s.billingCloseDate,
        paymentDueDate: s.paymentDueDate,
      }));
    }

    case "get_debt_status": {
      const { debts, summary } = await caller.debt.list({
        status:
          args.status === "ACTIVE" || args.status === "PAID_OFF"
            ? args.status
            : undefined,
      });
      return {
        summary,
        debts: debts.map((d) => ({
          name: d.name,
          type: d.type,
          balance: d.balance,
          interestRate: d.interestRate,
          minimumPayment: d.minimumPayment,
          status: d.status,
          dueDate: d.dueDate,
        })),
      };
    }

    case "get_available_balance": {
      const balances = await caller.prediction.projection.availableBalances();
      return balances.map((ab) => ({
        account: ab.accountName,
        currency: ab.currency,
        balance: ab.balance,
        committed: ab.committed,
        available: ab.available,
      }));
    }

    case "get_financial_alerts": {
      return caller.prediction.projection.alerts();
    }
  }

  throw new Error(`Unknown tool: ${name}`);
}
