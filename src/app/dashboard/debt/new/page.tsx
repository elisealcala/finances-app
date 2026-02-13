import { HydrateClient } from "@/server/trpc/server";
import { DebtCreatePage } from "@/modules/debt/components/debt-create-page";

export const dynamic = "force-dynamic";

export default function NewDebtPage() {
  return (
    <HydrateClient>
      <DebtCreatePage />
    </HydrateClient>
  );
}
