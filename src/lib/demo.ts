import type { Grant } from "./vesting";

// Demo grant used until the on-chain program is deployed and wired in.
// Vesting runs 90 days, centered on "now" so the dashboard shows ~50% vested.
const DAY = 86400;
const now = Math.floor(Date.UTC(2026, 9, 14, 12) / 1000);

export const DEMO_GRANT: Grant = {
  tokenAccount: "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosg3Qp",
  mint: "9zFbV4yJ1aJdHqk2m8tLpVnRq7Ws3cXeU6oYhGfK5Lm",
  issuer: "FqWk3sT7bN9vZpL2mR4cYxH8dJ6eA1uG5oQiKw8Rt",
  beneficiary: "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosg3Qp",
  totalAmount: 1_000_000_000_000n, // 1,000 tokens @ 9 decimals
  start: now - 45 * DAY,
  end: now + 45 * DAY,
  decimals: 9,
  immutableOwner: true,
};

export type Activity = {
  id: string;
  kind: "transfer" | "grant";
  status: "success" | "failed";
  amount: bigint;
  time: number;
  signature?: string;
  note?: string;
};

export const DEMO_ACTIVITY: Activity[] = [
  { id: "a4", kind: "transfer", status: "success", amount: 500_000_000_000n, time: now - 45 * 60, note: "Demo activity — not an on-chain transaction" },
  { id: "a3", kind: "transfer", status: "failed", amount: 600_000_000_000n, time: now - 3 * 3600, note: "Simulated rejection: transfer would breach the locked amount" },
  { id: "a2", kind: "transfer", status: "success", amount: 250_000_000_000n, time: now - 7 * 3600, note: "Demo activity — not an on-chain transaction" },
  { id: "a1", kind: "grant", status: "success", amount: 1_000_000_000_000n, time: DEMO_GRANT.start, note: "Demo grant — replace with on-chain data after deployment" },
];
