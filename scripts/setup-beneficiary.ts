import fs from "node:fs";
import { Connection, Keypair, PublicKey, Transaction, sendAndConfirmTransaction } from "@solana/web3.js";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
  createAssociatedTokenAccountInstruction,
  createMintToInstruction,
  getAssociatedTokenAddressSync,
  getMint,
} from "@solana/spl-token";

const rpc = process.env.SOLANA_RPC_URL ?? "https://api.devnet.solana.com";
const walletPath = process.env.SOLANA_KEYPAIR ?? process.env.ANCHOR_WALLET;
const mintText = process.env.MINT_ADDRESS;
const ownerText = process.env.BENEFICIARY_OWNER;
const amountText = process.env.MINT_AMOUNT_BASE_UNITS;
if (![walletPath, mintText, ownerText, amountText].every(Boolean)) {
  console.error("Set SOLANA_KEYPAIR, MINT_ADDRESS, BENEFICIARY_OWNER, and MINT_AMOUNT_BASE_UNITS.");
  process.exit(1);
}
try {
  const payer = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(fs.readFileSync(walletPath!, "utf8")) as number[]));
  const mint = new PublicKey(mintText!);
  const owner = new PublicKey(ownerText!);
  const amount = BigInt(amountText!);
  if (amount <= 0n || amount > 0xffff_ffff_ffff_ffffn) throw new Error("Mint amount must be a positive u64 base-unit value.");
  const connection = new Connection(rpc, "confirmed");
  const mintInfo = await getMint(connection, mint, "confirmed", TOKEN_2022_PROGRAM_ID);
  if (!mintInfo.mintAuthority?.equals(payer.publicKey)) throw new Error("Configured wallet is not the mint authority.");
  const ata = getAssociatedTokenAddressSync(mint, owner, false, TOKEN_2022_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID);
  const instructions = [];
  const existing = await connection.getAccountInfo(ata, "confirmed");
  if (!existing) instructions.push(createAssociatedTokenAccountInstruction(payer.publicKey, ata, owner, mint, TOKEN_2022_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID));
  instructions.push(createMintToInstruction(mint, ata, payer.publicKey, amount, [], TOKEN_2022_PROGRAM_ID));
  const signature = await sendAndConfirmTransaction(connection, new Transaction().add(...instructions), [payer], { commitment: "confirmed" });
  console.log(`RPC: ${rpc}`);
  console.log(`Beneficiary wallet: ${owner.toBase58()}`);
  console.log(`Token account: ${ata.toBase58()}`);
  console.log(`Minted base units: ${amount.toString()}`);
  console.log(`Signature: ${signature}`);
  console.log(`Explorer: https://explorer.solana.com/tx/${signature}?cluster=devnet`);
  console.log("The VestHook program must be deployed and the grant initialized separately. Verify the token account has ImmutableOwner before creating a grant.");
} catch (error) {
  console.error(`Beneficiary setup failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}
