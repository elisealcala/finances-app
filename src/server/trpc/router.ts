import { router } from "./init";
import { debtRouter } from "./routers/debt.router";
import { financesRouter } from "./routers/finances.router";
import { predictionRouter } from "./routers/prediction.router";
import { healthRouter } from "./routers/health.router";
import { notesRouter } from "./routers/notes.router";
import { importsRouter } from "./routers/imports.router";

export const appRouter = router({
  debt: debtRouter,
  finances: financesRouter,
  prediction: predictionRouter,
  health: healthRouter,
  notes: notesRouter,
  imports: importsRouter,
});

export type AppRouter = typeof appRouter;
