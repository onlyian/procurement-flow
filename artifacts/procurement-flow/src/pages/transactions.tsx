import { SidebarLayout } from "@/components/layout-sidebar";
import { useListTransactions } from "@workspace/api-client-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowRightLeft } from "lucide-react";

export default function TransactionsPage() {
  const { data: transactions, isLoading } = useListTransactions();

  const sorted = [...(transactions ?? [])].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  );

  return (
    <SidebarLayout>
      <div className="p-6 space-y-4">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Transactions</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Read-only log of all fulfilled stock deductions
          </p>
        </div>

        <div className="rounded-xl border border-border overflow-hidden bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wide">ID</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wide">Item</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wide">Department</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wide">Qty Deducted</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wide">Request</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wide">Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {isLoading
                ? Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-b border-border/50">
                      <td className="px-4 py-3" colSpan={6}>
                        <Skeleton className="h-4 w-full" />
                      </td>
                    </tr>
                  ))
                : sorted.length === 0
                ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center">
                      <ArrowRightLeft className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">No transactions yet</p>
                      <p className="text-xs text-muted-foreground mt-1">Transactions are created when requests are approved</p>
                    </td>
                  </tr>
                )
                : sorted.map((txn) => (
                    <tr key={txn.id} className="border-b border-border/50 last:border-0 hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3 text-xs text-muted-foreground font-mono">#{txn.id}</td>
                      <td className="px-4 py-3 font-medium">{txn.itemName ?? `Item #${txn.itemId}`}</td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className="text-xs">
                          {txn.departmentName ?? `Dept #${txn.departmentId}`}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="font-medium text-foreground">−{txn.quantityDeducted}</span>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground font-mono">
                        req #{txn.requestId}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {new Date(txn.timestamp).toLocaleString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
      </div>
    </SidebarLayout>
  );
}
