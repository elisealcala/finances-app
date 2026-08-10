import { router } from "./init";
import { debtRouter } from "./routers/debt.router";
import { financesRouter } from "./routers/finances.router";
import { healthRouter } from "./routers/health.router";
import { notesRouter } from "./routers/notes.router";
import { performanceRouter } from "./routers/performance.router";
import { knowledgeRouter } from "./routers/knowledge.router";
import { careerRouter } from "./routers/career.router";

export const appRouter = router({
  debt: debtRouter,
  finances: financesRouter,
  health: healthRouter,
  notes: notesRouter,
  performance: performanceRouter,
  knowledge: knowledgeRouter,
  career: careerRouter,
});

export type AppRouter = typeof appRouter;
