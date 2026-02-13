import { router } from "@/server/trpc/init";
import { accountRouter } from "./routers/account.router";
import { categoryRouter } from "./routers/category.router";
import { expenseRouter } from "./routers/expense.router";
import { incomeRouter } from "./routers/income.router";
import { transferRouter } from "./routers/transfer.router";
import { overviewRouter } from "./routers/overview.router";

export const financesRouter = router({
  account: accountRouter,
  category: categoryRouter,
  expense: expenseRouter,
  income: incomeRouter,
  transfer: transferRouter,
  overview: overviewRouter,
});
