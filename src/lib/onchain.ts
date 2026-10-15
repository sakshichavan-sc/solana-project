import { Buffer } from "buffer";
import { Connection, PublicKey } from "@solana/web3.js";
import { getAccount, getMint, TOKEN_2022_PROGRAM_ID } from "@solana/spl-token";
import type { Grant } from "./vesting";

const RPC = "https://api.devnet.solana.com";
const PROGRAM_ID = new PublicKey("FCuiptPvvTwSU3SGdRh1KCabSngqLGF3iuitwcppAPkE");
const TOKEN_ACCOUNT = new PublicKey("8UdwtEEXw9SQzMT59yndCyqJTb2xGtTPpHYszqYVfB5R");

export async function fetchLiveGrant(): Promise<{ grant: Grant; balance: bigint }> {
  const connection = new Connection(RPC, "confirmed");

  const [grantPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("grant"), TOKEN_ACCOUNT.toBuffer()],
    PROGRAM_ID
  );

  const info = await connection.getAccountInfo(grantPda);
  if (!info || !info.owner.equals(PROGRAM_ID) || info.data.length !== 129) {
    throw new Error("Valid VestHook grant account not found");
  }

  const data = info.data;
  const issuer = new PublicKey(data.subarray(8, 40)).toBase58();
  const tokenAccount = new PublicKey(data.subarray(40, 72)).toBase58();
  const mintAddress = new PublicKey(data.subarray(72, 104)).toBase58();
  const totalAmount = data.readBigUInt64LE(104);
  const start = Number(data.readBigInt64LE(112));
  const end = Number(data.readBigInt64LE(120));

  if (tokenAccount !== TOKEN_ACCOUNT.toBase58() || end <= start) {
    throw new Error("Invalid grant data");
  }

  const mintKey = new PublicKey(mintAddress);
  const [token, mint] = await Promise.all([
    getAccount(connection, TOKEN_ACCOUNT, "confirmed", TOKEN_2022_PROGRAM_ID),
    getMint(connection, mintKey, "confirmed", TOKEN_2022_PROGRAM_ID),
  ]);

  if (!token.mint.equals(mintKey)) throw new Error("Grant mint mismatch");

  return {
    grant: {
      issuer,
      tokenAccount,
      mint: mintAddress,
      beneficiary: token.owner.toBase58(),
      totalAmount,
      start,
      end,
      decimals: mint.decimals,
      immutableOwner: true,
    },
    balance: token.amount,
  };
}

export async function submitLiveTransfer(
  walletAddress: string,
  recipientAddress: string,
  amount: bigint
): Promise<string> {
  const {
    createAssociatedTokenAccountInstruction,
    createTransferCheckedWithTransferHookInstruction,
    getAssociatedTokenAddressSync,
    ASSOCIATED_TOKEN_PROGRAM_ID,
  } = await import("@solana/spl-token");
  const { Transaction } = await import("@solana/web3.js");

  if (amount <= 0n) throw new Error("Transfer amount must be positive");

  const wallet = new PublicKey(walletAddress);
  const recipient = new PublicKey(recipientAddress);
  if (wallet.equals(recipient)) {
    throw new Error("Choose a recipient different from the source wallet");
  }

  const connection = new Connection(RPC, "confirmed");
  const source = TOKEN_ACCOUNT;
  const mint = new PublicKey("2EafpZaWLfqfEMRyJz355qye5RWTV5x3WxHqtQGbpx7T");

  const [sourceInfo, mintInfo] = await Promise.all([
    getAccount(connection, source, "confirmed", TOKEN_2022_PROGRAM_ID),
    getMint(connection, mint, "confirmed", TOKEN_2022_PROGRAM_ID),
  ]);

  if (!sourceInfo.owner.equals(wallet)) {
    throw new Error(`Wallet mismatch: connected=${wallet.toBase58()}, token-account-owner=${sourceInfo.owner.toBase58()}`);
  }
  if (!sourceInfo.mint.equals(mint)) throw new Error("Source mint mismatch");
  if (amount > sourceInfo.amount) throw new Error("Transfer exceeds the current token balance");

  const destination = getAssociatedTokenAddressSync(
    mint, recipient, false, TOKEN_2022_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID
  );

  const transaction = new Transaction();
  const destinationInfo = await connection.getAccountInfo(destination, "confirmed");
  if (!destinationInfo) {
    transaction.add(
      createAssociatedTokenAccountInstruction(
        wallet, destination, recipient, mint,
        TOKEN_2022_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID
      )
    );
  }

  const transferIx = await createTransferCheckedWithTransferHookInstruction(
    connection, source, mint, destination, wallet, amount, mintInfo.decimals,
    [], "confirmed", TOKEN_2022_PROGRAM_ID
  );
  transaction.add(transferIx);

  const provider = typeof window !== "undefined"
    ? ((window as Window & {
        phantom?: { solana?: {
          isPhantom?: boolean;
          connect?: () => Promise<{ publicKey: { toString(): string } }>;
          signTransaction?: (tx: InstanceType<typeof Transaction>) => Promise<InstanceType<typeof Transaction>>;
          signAndSendTransaction?: (
            tx: InstanceType<typeof Transaction>,
            options?: { preflightCommitment?: "processed" | "confirmed" | "finalized" }
          ) => Promise<{ signature: string }>;
        }};
        solana?: {
          isPhantom?: boolean;
          connect?: () => Promise<{ publicKey: { toString(): string } }>;
          signTransaction?: (tx: InstanceType<typeof Transaction>) => Promise<InstanceType<typeof Transaction>>;
          signAndSendTransaction?: (
            tx: InstanceType<typeof Transaction>,
            options?: { preflightCommitment?: "processed" | "confirmed" | "finalized" }
          ) => Promise<{ signature: string }>;
        };
      }).phantom?.solana ?? (window as Window & {
        solana?: {
          isPhantom?: boolean;
          connect?: () => Promise<{ publicKey: { toString(): string } }>;
          signTransaction?: (tx: InstanceType<typeof Transaction>) => Promise<InstanceType<typeof Transaction>>;
          signAndSendTransaction?: (
            tx: InstanceType<typeof Transaction>,
            options?: { preflightCommitment?: "processed" | "confirmed" | "finalized" }
          ) => Promise<{ signature: string }>;
        };
      }).solana)
    : undefined;

  if (!provider?.isPhantom || !provider.signTransaction) {
    throw new Error("Phantom signing is unavailable. Reconnect your wallet and try again.");
  }

  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("confirmed");
  transaction.feePayer = wallet;
  transaction.recentBlockhash = blockhash;

  const signedTransaction = await provider.signTransaction(transaction);
  const signature = await connection.sendRawTransaction(
    signedTransaction.serialize(),
    { preflightCommitment: "confirmed" }
  );

  await connection.confirmTransaction(
    { signature, blockhash, lastValidBlockHeight },
    "confirmed"
  );

  return signature;
}
