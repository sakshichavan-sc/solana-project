import { Connection, PublicKey } from "@solana/web3.js";

async function main() {
  const connection = new Connection("https://api.devnet.solana.com", "confirmed");
  const address = new PublicKey("5hhosb4Mn76NwTL6MPYbi7HhjCZ7fUcLzNroBFijnHSR");
  const account = await connection.getAccountInfo(address);

  if (!account) throw new Error("Grant account not found");

  const data = account.data;
  let offset = 8;
  offset += 32 + 32 + 32;

  const total = data.readBigUInt64LE(offset); offset += 8;
  const start = Number(data.readBigInt64LE(offset)); offset += 8;
  const end = Number(data.readBigInt64LE(offset));
  const now = Math.floor(Date.now() / 1000);

  console.log("Grant total:", total.toString(), "base units");
  console.log("Start:", new Date(start * 1000).toISOString(), start);
  console.log("End:", new Date(end * 1000).toISOString(), end);
  console.log("Current time:", new Date(now * 1000).toISOString(), now);
  console.log("Vesting status:", now <= start ? "NOT STARTED" : now >= end ? "FULLY VESTED" : "IN PROGRESS");
}

main().catch(console.error);
