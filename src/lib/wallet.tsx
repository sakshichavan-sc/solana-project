import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { DEMO_GRANT, type Activity } from "./demo";
import { fetchLiveGrant } from "./onchain";
import type { Grant } from "./vesting";

export type Cluster = "devnet" | "localnet";

type InjectedProvider = {
  isPhantom?: boolean;
  publicKey?: { toString(): string } | null;
  connect: () => Promise<{ publicKey: { toString(): string } }>;
  disconnect: () => Promise<void>;
  signAndSendTransaction: (
    transaction: import("@solana/web3.js").Transaction,
    options?: { preflightCommitment?: "processed" | "confirmed" | "finalized" }
  ) => Promise<{ signature: string }>;
};

function getProvider(): InjectedProvider | null {
  if (typeof window === "undefined") return null;

  const w = window as Window & {
    phantom?: { solana?: InjectedProvider };
    solana?: InjectedProvider;
  };

  const provider = w.phantom?.solana ?? w.solana ?? null;

  return provider?.isPhantom ? provider : null;
}

type Ctx = {
  address: string | null;
  hasWallet: boolean;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  cluster: Cluster;
  setCluster: (c: Cluster) => void;
  grant: Grant;
  balance: bigint;
  setBalance: (b: bigint) => void;
  activity: Activity[];
  addActivity: (a: Activity) => void;
  programId: string;
  setProgramId: (id: string) => void;
  dataError: string | null;
};

const WalletCtx = createContext<Ctx | null>(null);

export function WalletProvider({ children }: { children: ReactNode }) {
  const [address, setAddress] = useState<string | null>(null);
  const [hasWallet, setHasWallet] = useState(false);
  const [cluster, setCluster] = useState<Cluster>("devnet");
  const [balance, setBalance] = useState<bigint>(0n);
  const [grant, setGrant] = useState<Grant>(DEMO_GRANT);
  const [dataError, setDataError] = useState<string | null>(null);
  const [activity, setActivity] = useState<Activity[]>([]);
  const [programId, setProgramIdState] = useState("");

  useEffect(() => {
    setHasWallet(!!getProvider());
    setProgramIdState(localStorage.getItem("vesthook.programId") ?? "");
    fetchLiveGrant()
      .then(({ grant: liveGrant, balance: liveBalance }) => {
        setGrant(liveGrant);
        setBalance(liveBalance);
        setDataError(null);
      })
      .catch((error: unknown) => {
        setDataError(error instanceof Error ? error.message : "Failed to load Devnet data");
      });
  }, []);

  const connect = useCallback(async () => {
  const p = getProvider();

  if (!p) {
    throw new Error(
      "Phantom extension not detected. Open this dashboard in the Chrome profile where Phantom is installed, then refresh."
    );
  }

  const res = await p.connect();
  setAddress(res.publicKey.toString());
}, []);
  const disconnect = useCallback(async () => {
    await getProvider()?.disconnect();
    setAddress(null);
  }, []);

  const setProgramId = (id: string) => {
    setProgramIdState(id);
    localStorage.setItem("vesthook.programId", id);
  };

  return (
    <WalletCtx.Provider
      value={{
        address,
        hasWallet,
        connect,
        disconnect,
        cluster,
        setCluster,
        grant,
        balance,
        setBalance,
        activity,
        addActivity: (a) => setActivity((prev) => [a, ...prev]),
        programId,
        setProgramId,
        dataError,
      }}
    >
      {children}
    </WalletCtx.Provider>
  );
}

export function useVest() {
  const c = useContext(WalletCtx);
  if (!c) throw new Error("useVest must be used inside WalletProvider");
  return c;
}
