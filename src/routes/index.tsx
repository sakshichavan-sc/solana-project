import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Clock, Copy, Database, Lock, Send, Activity as ActivityIcon, Info, PieChart, ArrowRight, FlaskConical } from "lucide-react";
import { toast } from "sonner";
import { Panel } from "@/components/vesthook/AppShell";
import { ActivityList } from "@/components/vesthook/ActivityList";
import { useVest } from "@/lib/wallet";
import { fetchLiveGrant, submitLiveTransfer } from "@/lib/onchain";
import { canTransfer, fmt, fmtDate, lockedAmount, parseAmount, short, transferable, vestedAmount } from "@/lib/vesting";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — VestHook" },
      { name: "description", content: "View your token vesting status and manage your Token-2022 grant." },
      { property: "og:title", content: "Dashboard — VestHook" },
      { property: "og:description", content: "View your token vesting status and manage your Token-2022 grant." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Dashboard,
});

function useNow(fallback: number) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Math.floor(Date.now() / 1000));
    const t = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(t);
  }, []);
  return now ?? fallback;
}

function CopyAddr({ value }: { value: string }) {
  return (
    <span className="flex items-center gap-2 font-mono text-base">
      {short(value)}
      <button aria-label="Copy" onClick={() => { navigator.clipboard.writeText(value); toast.success("Copied"); }} className="text-muted-foreground hover:text-foreground">
        <Copy className="h-4 w-4" />
      </button>
    </span>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="mt-1">{children}</div>
    </div>
  );
}

function Dashboard() {
  const { address, grant, balance, setBalance, activity, addActivity, dataError } = useVest();
  const now = useNow(grant.start);
  const locked = lockedAmount(grant, now);
  const vested = vestedAmount(grant, now);
  const avail = transferable(balance, locked);
  const pct = Math.min(100, Math.max(0, ((now - grant.start) / (grant.end - grant.start)) * 100));
  const daysLeft = Math.max(0, Math.ceil((grant.end - now) / 86400));
  const durationDays = Math.round((grant.end - grant.start) / 86400);
  const active = now < grant.end;
  const d = grant.decimals;
  const [amount, setAmount] = useState("");
  const [recipient, setRecipient] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function onTransfer(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;

    if (!address) {
      toast.error("Connect Phantom first");
      return;
    }

    const units = parseAmount(amount, d);
    if (units === null || units === 0n) {
      toast.error("Enter a valid positive amount");
      return;
    }

    if (!recipient.trim()) {
      toast.error("Enter a recipient wallet address");
      return;
    }

    if (units > avail) {
      toast.error("Amount exceeds the currently transferable balance");
      return;
    }

    setSubmitting(true);
    try {
      const signature = await submitLiveTransfer(address, recipient.trim(), units);
      const live = await fetchLiveGrant();
      setBalance(live.balance);

      addActivity({
        id: crypto.randomUUID(),
        kind: "transfer",
        status: "success",
        amount: units,
        time: Math.floor(Date.now() / 1000),
        note: `Devnet transaction: ${signature}`,
      });

      toast.success(`Transfer confirmed: ${fmt(units, d)} tokens`);
      setAmount("");
      setRecipient("");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      toast.error(`Transfer failed: ${message}`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold">Dashboard</h1>
          <p className="mt-1 text-muted-foreground">View your token vesting status and manage your grant.</p>
        </div>
        <Link to="/settings" className="flex items-center gap-2 rounded-lg border border-chart-4/40 bg-chart-4/10 px-3 py-1.5 text-sm text-chart-4">
          <Send className="h-4 w-4" /> Devnet on-chain transfers
        </Link>
      </div>

      {dataError && (
        <div role="alert" className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm">
          <strong>Live Devnet data unavailable.</strong> {dataError}
          <p className="mt-1 text-muted-foreground">Vesting figures may be demo values. Do not rely on them for transfers.</p>
        </div>
      )}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="space-y-5">
          <Panel title="Vesting Overview" icon={<Clock className="h-5 w-5" />} right={<span className={`rounded-full px-2.5 py-0.5 text-sm ${active ? "bg-success text-success-foreground" : "bg-muted text-muted-foreground"}`}>{active ? "Active" : "Completed"}</span>}>
            <div className="grid gap-6 sm:grid-cols-3 sm:divide-x sm:divide-border">
              <div className="space-y-4">
                <Field label="Token Account"><CopyAddr value={grant.tokenAccount} /></Field>
                <Field label="Mint Address"><CopyAddr value={grant.mint} /></Field>
                <Field label="Grant Issuer"><CopyAddr value={grant.issuer} /></Field>
              </div>
              <div className="space-y-4 sm:pl-6">
                <Field label="Total Grant Amount"><div className="text-xl font-medium">{fmt(grant.totalAmount, d)}</div><div className="text-sm text-muted-foreground">tokens</div></Field>
                <Field label="Current Balance"><div className="text-xl font-medium">{fmt(balance, d)}</div><div className="text-sm text-muted-foreground">tokens</div></Field>
                {grant.immutableOwner && <span className="inline-flex items-center gap-1.5 rounded-lg bg-success/15 px-3 py-1 text-sm text-success"><Lock className="h-3.5 w-3.5" /> Immutable Owner</span>}
              </div>
              <div className="space-y-4 sm:pl-6">
                <Field label="Vesting Start"><span className="font-medium">{fmtDate(grant.start)}</span></Field>
                <Field label="Vesting End"><span className="font-medium">{fmtDate(grant.end)}</span></Field>
                <Field label="Duration"><span className="font-medium">{durationDays} days</span></Field>
              </div>
            </div>
          </Panel>

          <Panel title="Token Balances" icon={<Database className="h-5 w-5" />}>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4 md:divide-x md:divide-border">
              {[
                ["Total Balance", fmt(balance, d), ""],
                ["Vested Amount", fmt(vested, d), ""],
                ["Locked Amount", fmt(locked, d), ""],
                ["Transferable Now", fmt(avail, d), "text-success"],
              ].map(([l, v, c], i) => (
                <div key={l} className={i ? "md:pl-5" : ""}>
                  <div className="text-sm text-muted-foreground">{l}</div>
                  <div className={`mt-1 text-xl font-medium ${c}`}>{v}</div>
                  <div className="text-sm text-muted-foreground">tokens</div>
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="Vesting Timeline" icon={<Clock className="h-5 w-5" />}>
            <Timeline pct={pct} total={Number(grant.totalAmount / 10n ** BigInt(d))} start={grant.start} end={grant.end} />
          </Panel>

          <Panel title="Transfer Tokens" icon={<Send className="h-5 w-5" />}>
            <p className="mb-3 text-sm text-muted-foreground">Send vested Token-2022 tokens on Devnet. Phantom will ask you to approve each transaction. Transfer-hook rules are enforced on-chain.</p>
            <form onSubmit={onTransfer} className="flex flex-col gap-3">
              <input value={recipient} onChange={(e) => setRecipient(e.target.value)} placeholder="Recipient wallet address" autoComplete="off" className="w-full rounded-lg border border-input bg-background px-3 py-2.5 outline-none focus:ring-2 focus:ring-ring" />
              <div className="flex flex-col gap-3 sm:flex-row">
              <input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" placeholder="Amount (tokens)" className="flex-1 rounded-lg border border-input bg-background px-3 py-2.5 outline-none focus:ring-2 focus:ring-ring" />
              <button type="button" onClick={() => setAmount(fmt(avail, d, d).replace(/,/g, ""))} disabled={submitting} className="rounded-lg border border-border px-4 py-2.5 text-sm hover:bg-accent disabled:opacity-50">Max</button>
              <button type="submit" disabled={submitting || !address} className="rounded-lg bg-primary px-10 py-2.5 font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">{submitting ? "Waiting for confirmation..." : "Send tokens"}</button>
              </div>
            </form>
          </Panel>
        </div>

        <div className="space-y-5">
          <Panel title="Vesting Progress" icon={<PieChart className="h-5 w-5" />}>
            <div className="flex items-center gap-6">
              <Donut pct={pct} />
              <ul className="space-y-3 text-sm">
                <Legend color="bg-success" label="Vested" value={fmt(vested, d)} />
                <Legend color="bg-locked" label="Locked" value={fmt(locked, d)} />
                <Legend color="bg-primary" label="Available to Transfer" value={fmt(avail, d)} />
              </ul>
            </div>
            <div className="mt-5 h-2.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-success" style={{ width: `${pct}%` }} /></div>
            <div className="mt-2 flex justify-between text-sm"><span>{pct.toFixed(0)}% complete</span><span className="text-muted-foreground">{daysLeft} days remaining</span></div>
          </Panel>

          <Panel title="Recent Activity" icon={<ActivityIcon className="h-5 w-5" />} right={<Link to="/transactions" className="flex items-center gap-1 text-sm text-primary">View all <ArrowRight className="h-4 w-4" /></Link>}>
            <ActivityList items={activity.slice(0, 4)} />
          </Panel>

          <section className="flex gap-3 rounded-xl border border-primary/40 bg-primary/10 p-5">
            <Info className="h-5 w-5 shrink-0 text-primary" />
            <div>
              <div className="font-semibold">Important</div>
              <p className="mt-1 text-sm text-muted-foreground">A failed transfer may indicate a vesting violation or an invalid account configuration. The on-chain program is the final authority.</p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function Legend({ color, label, value }: { color: string; label: string; value: string }) {
  return (
    <li className="flex gap-2.5">
      <span className={`mt-1 h-3 w-3 rounded-full ${color}`} />
      <div><div className="text-muted-foreground">{label}</div><div className="font-medium">{value}</div></div>
    </li>
  );
}

function Donut({ pct }: { pct: number }) {
  const r = 42, c = 2 * Math.PI * r;
  return (
    <div className="relative h-36 w-36 shrink-0">
      <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
        <circle cx="50" cy="50" r={r} fill="none" strokeWidth="12" className="stroke-locked" />
        <circle cx="50" cy="50" r={r} fill="none" strokeWidth="12" className="stroke-success" strokeDasharray={`${(pct / 100) * c} ${c}`} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-semibold">{pct.toFixed(0)}%</span>
        <span className="text-sm text-muted-foreground">vested</span>
      </div>
    </div>
  );
}

function Timeline({ pct, total, start, end }: { pct: number; total: number; start: number; end: number }) {
  const W = 640, H = 200, L = 40, B = 170, T = 15;
  const x = (p: number) => L + (p / 100) * (W - L - 10);
  const y = (p: number) => B - (p / 100) * (B - T);
  const ticks = [0, 25, 50, 75, 100];
  return (
    <svg viewBox={`0 0 ${W} ${H + 25}`} className="w-full">
      <defs>
        <linearGradient id="tl" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" className="[stop-color:var(--success)]" stopOpacity="0.35" />
          <stop offset="1" className="[stop-color:var(--success)]" stopOpacity="0" />
        </linearGradient>
      </defs>
      {ticks.map((t) => (
        <g key={t}>
          <line x1={L} x2={W - 10} y1={y(t)} y2={y(t)} className="stroke-border" strokeWidth="1" />
          <text x={L - 8} y={y(t) + 4} textAnchor="end" className="fill-muted-foreground text-[11px]">{Math.round((total * t) / 100).toLocaleString()}</text>
          <text x={x(t)} y={B + 20} textAnchor="middle" className="fill-muted-foreground text-[11px]">{fmtDate(start + ((end - start) * t) / 100, false).replace(/, \d{4}/, "")}</text>
          <text x={x(t)} y={B + 35} textAnchor="middle" className="fill-muted-foreground text-[10px]">{t === 0 ? "Start" : t === 100 ? "End" : `(${t}%)`}</text>
        </g>
      ))}
      <path d={`M${x(0)},${y(0)} L${x(100)},${y(100)} L${x(100)},${B} Z`} fill="url(#tl)" />
      <line x1={x(0)} y1={y(0)} x2={x(100)} y2={y(100)} className="stroke-success" strokeWidth="2.5" />
      <line x1={x(pct)} x2={x(pct)} y1={y(pct)} y2={B} className="stroke-success" strokeDasharray="4 4" />
      <circle cx={x(pct)} cy={y(pct)} r="6" className="fill-success" />
      <g transform={`translate(${Math.min(Math.max(x(pct) - 45, L), W - 100)},${Math.max(y(pct) - 55, 0)})`}>
        <rect width="90" height="40" rx="6" className="fill-background stroke-border" />
        <text x="10" y="17" className="fill-foreground text-[12px]">Now</text>
        <text x="10" y="32" className="fill-success text-[12px]">{pct.toFixed(0)}% vested</text>
      </g>
    </svg>
  );
}
