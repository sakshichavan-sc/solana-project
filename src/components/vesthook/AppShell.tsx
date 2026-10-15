import { Link } from "@tanstack/react-router";
import { LayoutDashboard, ListOrdered, Settings, Wallet, LogOut } from "lucide-react";
import type { ReactNode } from "react";
import { useVest, type Cluster } from "@/lib/wallet";
import { short } from "@/lib/vesting";

export function Logo({ className = "h-9 w-9" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <path d="M16 2 4 6v9c0 7.5 5 12.5 12 15 7-2.5 12-7.5 12-15V6z" className="fill-card stroke-primary" strokeWidth="2" />
      <path d="m10 11 6 11 6-11" fill="none" className="stroke-foreground" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const nav = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/transactions", label: "Transactions", icon: ListOrdered },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const { address, connect, disconnect, cluster, setCluster } = useVest();
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 flex min-h-[76px] items-center justify-between border-b border-border/80 bg-background/90 px-4 py-3 backdrop-blur-xl md:px-7">
        <Link to="/" className="flex items-center gap-3">
          <Logo />
          <div>
            <div className="text-xl font-semibold leading-none tracking-tight">VestHook</div>
            <div className="mt-1 text-xs text-muted-foreground">Token vesting. Enforced on-chain.</div>
          </div>
        </Link>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 rounded-xl border border-border/80 bg-card/70 px-3 py-2 text-sm shadow-sm">
            <span className="h-2 w-2 rounded-full bg-success" />
            <select
              value={cluster}
              onChange={(e) => setCluster(e.target.value as Cluster)}
              className="bg-transparent outline-none"
              aria-label="Network"
            >
              <option value="devnet" className="bg-card">Devnet</option>
              <option value="localnet" className="bg-card">Localnet</option>
            </select>
          </label>
          {address ? (
            <button onClick={disconnect} className="flex items-center gap-2 rounded-xl border border-border/80 bg-card/70 px-3 py-2 font-mono text-sm hover:bg-accent">
              {short(address)} <LogOut className="h-4 w-4" />
            </button>
          ) : (
            <button onClick={connect} className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/15 hover:bg-primary/90">
              <Wallet className="h-4 w-4" /> Connect wallet
            </button>
          )}
        </div>
      </header>
      <div className="flex">
        <aside className="sticky top-[76px] hidden h-[calc(100vh-76px)] w-[262px] shrink-0 flex-col justify-between border-r border-border/80 bg-sidebar/70 p-4 md:flex">
          <nav className="space-y-1">
            {nav.map(({ to, label, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                activeOptions={{ exact: true }}
                className="flex items-center gap-3 rounded-xl border border-transparent px-3 py-2.5 text-sidebar-foreground/80 transition-colors hover:border-border/60 hover:bg-sidebar-accent"
                activeProps={{ className: "border-primary/20 bg-gradient-to-r from-primary/20 to-primary/5 text-sidebar-foreground font-semibold shadow-sm" }}
              >
                <Icon className="h-5 w-5" /> {label}
              </Link>
            ))}
          </nav>
          <div className="flex gap-3 rounded-xl border border-sidebar-border/80 bg-card/40 p-3.5">
            <Logo className="h-7 w-7 shrink-0" />
            <div className="text-xs text-muted-foreground">
              <div className="mb-1 text-sm text-foreground">VestHook</div>
              Token-2022 Transfer Hook Vesting Enforcement
            </div>
          </div>
        </aside>
        <main className="min-w-0 flex-1 p-4 md:p-5 lg:p-6">
          <nav className="mb-4 flex gap-2 md:hidden">
            {nav.map(({ to, label }) => (
              <Link key={to} to={to} activeOptions={{ exact: true }} className="rounded-lg border border-border px-3 py-1.5 text-sm" activeProps={{ className: "bg-accent" }}>
                {label}
              </Link>
            ))}
          </nav>
          {children}
        </main>
      </div>
    </div>
  );
}

export function Panel({ title, icon, right, children, className = "" }: { title: string; icon?: ReactNode; right?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-xl border border-border/80 bg-card/90 p-5 shadow-lg shadow-black/10 backdrop-blur-sm ${className}`}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2.5 text-base font-semibold tracking-tight">{icon}{title}</h2>
        {right}
      </div>
      {children}
    </section>
  );
}
