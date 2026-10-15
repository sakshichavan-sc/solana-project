// Mirrors the on-chain rule: source_balance_after_transfer >= locked_amount(now)
// All amounts are in base units (bigint) like the on-chain program uses (u64).

export type Grant = {
  tokenAccount: string;
  mint: string;
  issuer: string;
  beneficiary: string;
  totalAmount: bigint;
  start: number; // unix seconds
  end: number; // unix seconds
  decimals: number;
  immutableOwner: boolean;
};

export function lockedAmount(g: Grant, now: number): bigint {
  if (now <= g.start) return g.totalAmount;
  if (now >= g.end) return 0n;
  const elapsed = BigInt(now - g.start);
  const duration = BigInt(g.end - g.start);
  const vested = (g.totalAmount * elapsed) / duration; // floor => conservative
  return g.totalAmount - vested;
}

export function vestedAmount(g: Grant, now: number): bigint {
  return g.totalAmount - lockedAmount(g, now);
}

export function transferable(balance: bigint, locked: bigint): bigint {
  return balance > locked ? balance - locked : 0n;
}

export function canTransfer(balance: bigint, locked: bigint, amount: bigint): boolean {
  if (amount > balance) return false;
  return balance - amount >= locked;
}

export function fmt(units: bigint, decimals: number, dp = 4): string {
  const base = 10n ** BigInt(decimals);
  const whole = units / base;
  const frac = (units % base).toString().padStart(decimals, "0").slice(0, dp).padEnd(dp, "0");
  return `${whole.toLocaleString("en-US")}.${frac}`;
}

export function parseAmount(input: string, decimals: number): bigint | null {
  const t = input.trim();
  if (!/^\d+(\.\d+)?$/.test(t)) return null;
  const [w, f = ""] = t.split(".");
  if (f.length > decimals) return null;
  return BigInt(w ?? "0") * 10n ** BigInt(decimals) + BigInt(f.padEnd(decimals, "0") || "0");
}

export function short(addr: string): string {
  return addr.length > 10 ? `${addr.slice(0, 3)}...${addr.slice(-3)}` : addr;
}

export function fmtDate(sec: number, withTime = true): string {
  const d = new Date(sec * 1000);
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "UTC" } : { timeZone: "UTC" }),
  }) + (withTime ? " UTC" : "");
}
