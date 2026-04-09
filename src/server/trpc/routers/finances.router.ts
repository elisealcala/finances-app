import { router } from "@/server/trpc/init";
import { accountRouter } from "./finances/account.router";
import { categoryRouter } from "./finances/category.router";
import { expenseRouter } from "./finances/expense.router";
import { incomeRouter } from "./finances/income.router";
import { transferRouter } from "./finances/transfer.router";
import { overviewRouter } from "./finances/overview.router";
import { statementRouter } from "./finances/statement.router";

export const financesRouter = router({
  account: accountRouter,
  category: categoryRouter,
  expense: expenseRouter,
  income: incomeRouter,
  transfer: transferRouter,
  overview: overviewRouter,
  statement: statementRouter,
});
