import { createFileRoute } from "@tanstack/react-router";
import { Panel } from "@/components/vesthook/AppShell";
import { ActivityList } from "@/components/vesthook/ActivityList";
import { useVest } from "@/lib/wallet";

export const Route = createFileRoute("/transactions")({
  head: () => ({
    meta: [
      { title: "Transactions — VestHook" },
      { name: "description", content: "Every transfer and grant event for your vested token account." },
      { property: "og:title", content: "Transactions — VestHook" },
      { property: "og:description", content: "Every transfer and grant event for your vested token account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Transactions,
});

function Transactions() {
  const { activity } = useVest();
  return (
    <div className="max-w-3xl space-y-5">
      <div>
        <h1 className="text-3xl font-semibold">Transactions</h1>
        <p className="mt-1 text-muted-foreground">Transfers and grant events for this token account.</p>
      </div>
      <Panel title="All activity"><ActivityList items={activity} /></Panel>
    </div>
  );
}
