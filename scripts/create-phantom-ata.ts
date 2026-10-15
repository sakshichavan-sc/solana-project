import fs from "node:fs";
import { Connection, Keypair, PublicKey, Transaction, sendAndConfirmTransaction } from "@solana/web3.js";
import {
  TOKEN_2022_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountInstruction,
  getAccount,
} from "@solana/spl-token";

const rpc = "https://api.devnet.solana.com";
const mint = new PublicKey("2EafpZaWLfqfEMRyJz355qye5RWTV5x3WxHqtQGbpx7T");
const owner = new PublicKey("2g4Nu7KSXevnXc2xAyFwtBddhkzRfF9ysPkdX7pxhNL6");
const walletPath = process.env.SOLANA_KEYPAIR ?? process.env.ANCHOR_WALLET ?? `${process.env.HOME}/.config/solana/id.json`;

const payer = Keypair.fromSecretKey(
  Uint8Array.from(JSON.parse(fs.readFileSync(walletPath, "utf8")) as number[])
);
const connection = new Connection(rpc, "confirmed");
const ata = getAssociatedTokenAddressSync(
  mint, owner, false, TOKEN_2022_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID
);

const existing = await connection.getAccountInfo(ata, "confirmed");
if (existing) {
  await getAccount(connection, ata, "confirmed", TOKEN_2022_PROGRAM_ID);
  console.log("Phantom Token-2022 account already exists:", ata.toBase58());
} else {
  const ix = createAssociatedTokenAccountInstruction(
    payer.publicKey, ata, owner, mint,
    TOKEN_2022_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID
  );
  const sig = await sendAndConfirmTransaction(
    connection, new Transaction().add(ix), [payer], { commitment: "confirmed" }
  );
  console.log("Created Phantom Token-2022 account:", ata.toBase58());
  console.log("Signature:", sig);
  console.log(`Explorer: https://explorer.solana.com/tx/${sig}?cluster=devnet`);
}
