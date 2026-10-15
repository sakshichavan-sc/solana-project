import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Panel } from "@/components/vesthook/AppShell";
import { useVest } from "@/lib/wallet";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — VestHook" },
      { name: "description", content: "Configure network and VestHook program ID." },
      { property: "og:title", content: "Settings — VestHook" },
      { property: "og:description", content: "Configure network and VestHook program ID." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SettingsPage,
});

const BASE58 = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

function SettingsPage() {
  const { programId, setProgramId, cluster, address, hasWallet } = useVest();
  const [value, setValue] = useState(programId);
  return (
    <div className="max-w-2xl space-y-5">
      <div>
        <h1 className="text-3xl font-semibold">Settings</h1>
        <p className="mt-1 text-muted-foreground">Network and program configuration. Saving an ID does not enable on-chain transactions yet.</p>
      </div>
      <Panel title="VestHook program">
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (value && !BASE58.test(value.trim())) { toast.error("Not a valid Solana address"); return; }
            setProgramId(value.trim());
            toast.success("Saved");
          }}
        >
          <label className="block text-sm text-muted-foreground" htmlFor="pid">Program ID (from <code className="font-mono">anchor deploy</code>)</label>
          <input id="pid" value={value} onChange={(e) => setValue(e.target.value)} placeholder="e.g. VesT...hook" className="w-full rounded-lg border border-input bg-background px-3 py-2.5 font-mono text-sm outline-none focus:ring-2 focus:ring-ring" />
          <button className="rounded-lg bg-primary px-5 py-2 font-medium text-primary-foreground hover:bg-primary/90">Save</button>
        </form>
      </Panel>
      <Panel title="Status">
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <dt className="text-muted-foreground">Network</dt><dd className="capitalize">{cluster}</dd>
          <dt className="text-muted-foreground">Wallet detected</dt><dd>{hasWallet ? "Yes" : "No — install Phantom or Solflare"}</dd>
          <dt className="text-muted-foreground">Connected</dt><dd className="break-all font-mono">{address ?? "—"}</dd>
          <dt className="text-muted-foreground">Data source</dt><dd>Demo data (RPC reads not connected)</dd>
          <dt className="text-muted-foreground">Transactions</dt><dd>Simulation only</dd>
        </dl>
      </Panel>
    </div>
  );
}
