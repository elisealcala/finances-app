import { router } from "./init";
import { debtRouter } from "@/modules/debt/router";
import { financesRouter } from "@/modules/finances/router";

export const appRouter = router({
  debt: debtRouter,
  finances: financesRouter,
});

export type AppRouter = typeof appRouter;
