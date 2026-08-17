import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "@/server/trpc/router";

type RouterOutputs = inferRouterOutputs<AppRouter>;

export type KnowledgeDocument = RouterOutputs["knowledge"]["get"];
export type KnowledgeNavigation = RouterOutputs["knowledge"]["navigation"];
export type KnowledgeNavigationDocument =
  KnowledgeNavigation["documents"][number];
