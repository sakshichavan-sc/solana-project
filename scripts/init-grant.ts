import fs from "node:fs";
import { createHash } from "node:crypto";
import { Connection, Keypair, PublicKey, SystemProgram, Transaction, TransactionInstruction, sendAndConfirmTransaction } from "@solana/web3.js";
import { TOKEN_2022_PROGRAM_ID, getAccount, getMint } from "@solana/spl-token";

function discriminator(name: string): Buffer {
  return createHash("sha256").update(`global:${name}`).digest().subarray(0, 8);
}
const rpc = process.env.SOLANA_RPC_URL ?? "https://api.devnet.solana.com";
const walletPath = process.env.SOLANA_KEYPAIR ?? process.env.ANCHOR_WALLET;
const programText = process.env.VESTHOOK_PROGRAM_ID;
const mintText = process.env.MINT_ADDRESS;
const tokenAccountText = process.env.BENEFICIARY_TOKEN_ACCOUNT;
const totalText = process.env.GRANT_TOTAL_BASE_UNITS;
const startText = process.env.VESTING_START_TS;
const endText = process.env.VESTING_END_TS;
if (![walletPath, programText, mintText, tokenAccountText, totalText, startText, endText].every(Boolean)) {
  console.error("Set SOLANA_KEYPAIR, VESTHOOK_PROGRAM_ID, MINT_ADDRESS, BENEFICIARY_TOKEN_ACCOUNT, GRANT_TOTAL_BASE_UNITS, VESTING_START_TS and VESTING_END_TS.");
  process.exit(1);
}
try {
  const payer = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(fs.readFileSync(walletPath!, "utf8")) as number[]));
  const programId = new PublicKey(programText!);
  const mint = new PublicKey(mintText!);
  const tokenAccount = new PublicKey(tokenAccountText!);
  const total = BigInt(totalText!);
  const start = BigInt(startText!);
  const end = BigInt(endText!);
  if (total <= 0n || end <= start || total > 0xffff_ffff_ffff_ffffn) throw new Error("Grant total/schedule is invalid or total exceeds u64.");
  const connection = new Connection(rpc, "confirmed");
  const mintInfo = await getMint(connection, mint, "confirmed", TOKEN_2022_PROGRAM_ID);
  if (!mintInfo.mintAuthority?.equals(payer.publicKey)) throw new Error("Configured wallet is not the mint authority; create_grant requires the mint authority to sign.");
  await getAccount(connection, tokenAccount, "confirmed", TOKEN_2022_PROGRAM_ID);
  const [extraMetaList] = PublicKey.findProgramAddressSync([Buffer.from("extra-account-metas"), mint.toBuffer()], programId);
  const [grant] = PublicKey.findProgramAddressSync([Buffer.from("grant"), tokenAccount.toBuffer()], programId);

  const initMetasIx = new TransactionInstruction({
    programId,
    keys: [
      { pubkey: payer.publicKey, isSigner: true, isWritable: true },
      { pubkey: payer.publicKey, isSigner: true, isWritable: false },
      { pubkey: extraMetaList, isSigner: false, isWritable: true },
      { pubkey: mint, isSigner: false, isWritable: false },
      { pubkey: TOKEN_2022_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: discriminator("init_extra_account_metas"),
  });
  const extraMetaInfo = await connection.getAccountInfo(extraMetaList, "confirmed");
  if (!extraMetaInfo) {
    const initSig = await sendAndConfirmTransaction(connection, new Transaction().add(initMetasIx), [payer], { commitment: "confirmed" });
    console.log(`ExtraAccountMetaList initialized: ${extraMetaList.toBase58()}`);
    console.log(`Signature: ${initSig}`);
  } else {
    if (!extraMetaInfo.owner.equals(programId)) throw new Error("ExtraAccountMetaList exists but has the wrong owner.");
    console.log(`Reusing existing ExtraAccountMetaList: ${extraMetaList.toBase58()}`);
  }

  const args = Buffer.alloc(24);
  args.writeBigUInt64LE(total, 0);
  args.writeBigInt64LE(start, 8);
  args.writeBigInt64LE(end, 16);
  const grantIx = new TransactionInstruction({
    programId,
    keys: [
      { pubkey: payer.publicKey, isSigner: true, isWritable: true },
      { pubkey: mint, isSigner: false, isWritable: false },
      { pubkey: tokenAccount, isSigner: false, isWritable: true },
      { pubkey: grant, isSigner: false, isWritable: true },
      { pubkey: TOKEN_2022_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: Buffer.concat([discriminator("create_grant"), args]),
  });
  const grantSig = await sendAndConfirmTransaction(connection, new Transaction().add(grantIx), [payer], { commitment: "confirmed" });
  console.log(`Grant PDA: ${grant.toBase58()}`);
  console.log(`Grant total (base units): ${total.toString()}`);
  console.log(`Signature: ${grantSig}`);
  console.log(`Explorer: https://explorer.solana.com/tx/${grantSig}?cluster=devnet`);
} catch (error) {
  console.error(`Grant setup failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}
