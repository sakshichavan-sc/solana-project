import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import {
  TOKEN_2022_PROGRAM_ID,
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountInstruction,
  transferCheckedWithTransferHook,
} from "@solana/spl-token";
import fs from "node:fs";

async function main() {
  const connection = new Connection("https://api.devnet.solana.com", "confirmed");
  const payer = Keypair.fromSecretKey(
    Uint8Array.from(JSON.parse(fs.readFileSync(process.env.SOLANA_KEYPAIR || `${process.env.HOME}/lab-rent.json`, "utf8")))
  );

  const mint = new PublicKey("2EafpZaWLfqfEMRyJz355qye5RWTV5x3WxHqtQGbpx7T");
  const source = new PublicKey("8mFV2JUhM4jvUScjx3xRQFZwKY629iTapvfNtg1zZEMX");
  const destinationOwner = Keypair.generate();
  const destination = getAssociatedTokenAddressSync(
    mint, destinationOwner.publicKey, false, TOKEN_2022_PROGRAM_ID
  );

  const createAta = createAssociatedTokenAccountInstruction(
    payer.publicKey, destination, destinationOwner.publicKey, mint, TOKEN_2022_PROGRAM_ID
  );

  await sendAndConfirmTransaction(connection, new Transaction().add(createAta), [payer]);
  console.log("Destination token account:", destination.toBase58());
  console.log("Attempting to transfer 99 tokens during vesting...");

  try {
    const signature = await transferCheckedWithTransferHook(
      connection,
      payer,
      source,
      mint,
      destination,
      payer,
      99_000_000_000n,
      9,
      [],
      { commitment: "confirmed" },
      TOKEN_2022_PROGRAM_ID
    );
    console.log("TRANSFER SUCCEEDED:", signature);
    console.log("Check the result: the transfer was allowed despite the active grant.");
  } catch (error) {
    console.error("TRANSFER FAILED:");
    console.error(error);
    console.log("If the error is VestingLocked, the vesting restriction worked.");
  }
}

main().catch(console.error);
