import { router } from "./init";
import { debtRouter } from "@/modules/debt/router";

export const appRouter = router({
  debt: debtRouter,
});

export type AppRouter = typeof appRouter;
