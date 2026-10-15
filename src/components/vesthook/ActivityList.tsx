import { ArrowUp, X, FileText, ExternalLink } from "lucide-react";
import type { Activity } from "@/lib/demo";
import { fmt, fmtDate } from "@/lib/vesting";
import { useVest } from "@/lib/wallet";

export function ActivityList({ items }: { items: Activity[] }) {
  const { grant, cluster } = useVest();
  if (!items.length) return <p className="text-sm text-muted-foreground">No activity yet.</p>;
  return (
    <ul className="divide-y divide-border">
      {items.map((a) => {
        const failed = a.status === "failed";
        const Icon = a.kind === "grant" ? FileText : failed ? X : ArrowUp;
        const tone = a.kind === "grant" ? "bg-locked/20 text-locked" : failed ? "bg-destructive/20 text-destructive" : "bg-success/15 text-success";
        return (
          <li key={a.id} className="flex items-start gap-3 py-3">
            <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${tone}`}><Icon className="h-5 w-5" /></span>
            <div className="min-w-0 flex-1">
              <div className="font-medium">{a.kind === "grant" ? "Grant Created" : failed ? "Transfer (Failed)" : "Transfer"}</div>
              <div className="text-sm text-muted-foreground">{fmt(a.amount, grant.decimals)} tokens</div>
              <div className="text-xs text-muted-foreground">{fmtDate(a.time)}</div>
              {a.note && <div className="mt-1 text-xs text-destructive">{a.note}</div>}
            </div>
            <div className="flex flex-col items-end gap-2">
              <span className={`rounded-full px-2.5 py-0.5 text-xs ${failed ? "bg-destructive/20 text-destructive" : "bg-success/15 text-success"}`}>{failed ? "Failed" : "Success"}</span>
              {a.signature ? (
                <a className="flex items-center gap-1 text-xs text-primary hover:underline" target="_blank" rel="noreferrer" href={`https://explorer.solana.com/tx/${a.signature}?cluster=${cluster}`}>
                  View on Explorer <ExternalLink className="h-3 w-3" />
                </a>
              ) : (
                <span className="text-xs text-muted-foreground">Simulated</span>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
