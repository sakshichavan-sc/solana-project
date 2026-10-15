import { Connection, PublicKey } from "@solana/web3.js";
import { TOKEN_2022_PROGRAM_ID, getAccount, getMint } from "@solana/spl-token";

const address = process.env.TOKEN_ACCOUNT;
const rpc = process.env.SOLANA_RPC_URL ?? "https://api.devnet.solana.com";
if (!address) {
  console.error("Set TOKEN_ACCOUNT to the token-account address you want to inspect.");
  process.exit(1);
}
try {
  const connection = new Connection(rpc, "confirmed");
  const accountAddress = new PublicKey(address);
  const account = await getAccount(connection, accountAddress, "confirmed", TOKEN_2022_PROGRAM_ID);
  const mint = await getMint(connection, account.mint, "confirmed", TOKEN_2022_PROGRAM_ID);
  console.log(`RPC: ${rpc}`);
  console.log(`Token program: ${TOKEN_2022_PROGRAM_ID.toBase58()}`);
  console.log(`Token account: ${accountAddress.toBase58()}`);
  console.log(`Owner wallet: ${account.owner.toBase58()}`);
  console.log(`Mint: ${account.mint.toBase58()}`);
  console.log(`Raw balance: ${account.amount.toString()}`);
  console.log(`Mint decimals: ${mint.decimals}`);
  console.log(`Mint authority: ${mint.mintAuthority?.toBase58() ?? "none"}`);
  console.log("Note: this script inspects the base account fields; it does not yet decode all extensions or the VestHook Grant PDA.");
} catch (error) {
  console.error(`Could not inspect Token-2022 account: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}
