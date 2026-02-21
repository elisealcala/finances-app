import { router } from "@/server/trpc/init";
import { recurringRouter } from "./routers/recurring.router";
import { fundingRouter } from "./routers/funding.router";
import { projectionRouter } from "./routers/projection.router";

export const predictionRouter = router({
  recurring: recurringRouter,
  funding: fundingRouter,
  projection: projectionRouter,
});
