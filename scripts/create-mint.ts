import fs from "node:fs";
import { Connection, Keypair, PublicKey, SystemProgram, Transaction, sendAndConfirmTransaction } from "@solana/web3.js";
import {
  ExtensionType,
  TOKEN_2022_PROGRAM_ID,
  createInitializeMintInstruction,
  createInitializeTransferHookInstruction,
  getMintLen,
} from "@solana/spl-token";

const rpc = process.env.SOLANA_RPC_URL ?? "https://api.devnet.solana.com";
const programIdText = process.env.VESTHOOK_PROGRAM_ID;
const walletPath = process.env.SOLANA_KEYPAIR ?? process.env.ANCHOR_WALLET;
if (!programIdText || !walletPath) {
  console.error("Set VESTHOOK_PROGRAM_ID and SOLANA_KEYPAIR (path to a local Solana CLI keypair file).");
  process.exit(1);
}

try {
  const programId = new PublicKey(programIdText);
  const secret = Uint8Array.from(JSON.parse(fs.readFileSync(walletPath, "utf8")) as number[]);
  const payer = Keypair.fromSecretKey(secret);
  const mint = Keypair.generate();
  const connection = new Connection(rpc, "confirmed");
  const mintSpace = getMintLen([ExtensionType.TransferHook]);
  const rent = await connection.getMinimumBalanceForRentExemption(mintSpace);
  const transaction = new Transaction().add(
    SystemProgram.createAccount({
      fromPubkey: payer.publicKey,
      newAccountPubkey: mint.publicKey,
      lamports: rent,
      space: mintSpace,
      programId: TOKEN_2022_PROGRAM_ID,
    }),
    createInitializeTransferHookInstruction(mint.publicKey, payer.publicKey, programId, TOKEN_2022_PROGRAM_ID),
    createInitializeMintInstruction(mint.publicKey, 9, payer.publicKey, null, TOKEN_2022_PROGRAM_ID),
  );
  const signature = await sendAndConfirmTransaction(connection, transaction, [payer, mint], { commitment: "confirmed" });
  console.log(`Cluster RPC: ${rpc}`);
  console.log(`Mint address: ${mint.publicKey.toBase58()}`);
  console.log(`Transfer hook program: ${programId.toBase58()}`);
  console.log(`Mint authority: ${payer.publicKey.toBase58()}`);
  console.log(`Signature: ${signature}`);
  console.log(`Explorer: https://explorer.solana.com/tx/${signature}?cluster=devnet`);
  console.log("Keep the generated mint address. This script does not mint tokens, create beneficiary accounts, or initialize the ExtraAccountMetaList.");
} catch (error) {
  console.error(`Mint creation failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}
