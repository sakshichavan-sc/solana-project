import { describe, expect, it } from "vitest";
import { canTransfer, lockedAmount, parseAmount, transferable, vestedAmount, type Grant } from "./vesting";

const grant: Grant = {
  tokenAccount: "demo-account", mint: "demo-mint", issuer: "demo-issuer", beneficiary: "demo-beneficiary",
  totalAmount: 1_000n, start: 100, end: 200, decimals: 0, immutableOwner: true,
};

describe("linear vesting math", () => {
  it("locks the full grant before and at the start", () => {
    expect(lockedAmount(grant, 99)).toBe(1_000n);
    expect(lockedAmount(grant, 100)).toBe(1_000n);
  });
  it("vests half at the midpoint", () => {
    expect(vestedAmount(grant, 150)).toBe(500n);
    expect(lockedAmount(grant, 150)).toBe(500n);
  });
  it("unlocks all at the end", () => {
    expect(lockedAmount(grant, 200)).toBe(0n);
  });
  it("rounds vested amount down", () => {
    expect(lockedAmount({ ...grant, totalAmount: 1_001n }, 150)).toBe(501n);
  });
  it("never reports negative transferable amount if balance is below lock", () => {
    expect(transferable(400n, 500n)).toBe(0n);
    expect(canTransfer(400n, 500n, 1n)).toBe(false);
  });
  it("allows exactly the unlocked amount and rejects one unit more", () => {
    expect(canTransfer(1_000n, 500n, 500n)).toBe(true);
    expect(canTransfer(1_000n, 500n, 501n)).toBe(false);
  });
  it("parses token amounts without floating-point arithmetic", () => {
    expect(parseAmount("1.25", 2)).toBe(125n);
    expect(parseAmount("1.234", 2)).toBeNull();
    expect(parseAmount("-1", 2)).toBeNull();
  });
});
