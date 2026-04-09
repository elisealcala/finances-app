import { router } from "./init";
import { debtRouter } from "./routers/debt.router";
import { financesRouter } from "./routers/finances.router";
import { predictionRouter } from "./routers/prediction.router";

export const appRouter = router({
  debt: debtRouter,
  finances: financesRouter,
  prediction: predictionRouter,
});

export type AppRouter = typeof appRouter;
