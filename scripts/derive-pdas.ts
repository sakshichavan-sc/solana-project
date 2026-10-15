import { PublicKey } from "@solana/web3.js";

const programIdText = process.env.VESTHOOK_PROGRAM_ID;
const mintText = process.env.MINT_ADDRESS;
const sourceText = process.env.SOURCE_TOKEN_ACCOUNT;
if (!programIdText || !mintText) {
  console.error("Set VESTHOOK_PROGRAM_ID and MINT_ADDRESS. SOURCE_TOKEN_ACCOUNT is optional.");
  process.exit(1);
}
try {
  const programId = new PublicKey(programIdText);
  const mint = new PublicKey(mintText);
  const [extraMetaList, extraBump] = PublicKey.findProgramAddressSync(
    [Buffer.from("extra-account-metas"), mint.toBuffer()], programId,
  );
  console.log(`Program ID: ${programId.toBase58()}`);
  console.log(`Mint: ${mint.toBase58()}`);
  console.log(`ExtraAccountMetaList PDA: ${extraMetaList.toBase58()} (bump ${extraBump})`);
  if (sourceText) {
    const source = new PublicKey(sourceText);
    const [grant, grantBump] = PublicKey.findProgramAddressSync(
      [Buffer.from("grant"), source.toBuffer()], programId,
    );
    console.log(`Source token account: ${source.toBase58()}`);
    console.log(`Grant PDA: ${grant.toBase58()} (bump ${grantBump})`);
  }
} catch (error) {
  console.error(`Invalid public key: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}
