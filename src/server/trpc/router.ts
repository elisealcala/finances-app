import { router } from "./init";
import { debtRouter } from "@/modules/debt/router";
import { financesRouter } from "@/modules/finances/router";
import { predictionRouter } from "@/modules/prediction/router";

export const appRouter = router({
  debt: debtRouter,
  finances: financesRouter,
  prediction: predictionRouter,
});

export type AppRouter = typeof appRouter;
