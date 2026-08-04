import { router } from "./init";
import { debtRouter } from "./routers/debt.router";
import { financesRouter } from "./routers/finances.router";
import { healthRouter } from "./routers/health.router";
import { notesRouter } from "./routers/notes.router";

export const appRouter = router({
  debt: debtRouter,
  finances: financesRouter,
  health: healthRouter,
  notes: notesRouter,
});

export type AppRouter = typeof appRouter;
