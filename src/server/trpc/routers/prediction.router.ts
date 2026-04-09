import { router } from "@/server/trpc/init";
import { recurringRouter } from "./prediction/recurring.router";
import { fundingRouter } from "./prediction/funding.router";
import { projectionRouter } from "./prediction/projection.router";

export const predictionRouter = router({
  recurring: recurringRouter,
  funding: fundingRouter,
  projection: projectionRouter,
});
