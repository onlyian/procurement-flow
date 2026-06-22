import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { SidebarLayout } from "@/components/layout-sidebar";
import {
  useListRequests,
  getListRequestsQueryKey,
  getGetDashboardSummaryQueryKey,
  getListInventoryItemsQueryKey,
  useApproveRequest,
  useRejectRequest,
  type ListRequestsStatus,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle, XCircle, ClipboardList, Filter } from "lucide-react";
import { toast } from "sonner";

const STATUS_OPTIONS = [
  { value: "", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "fulfilled", label: "Fulfilled" },
] as const;

function statusBadge(status: string) {
  const config: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    pending: { label: "Pending", variant: "secondary" },
    approved: { label: "Approved", variant: "default" },
    rejected: { label: "Rejected", variant: "destructive" },
    fulfilled: { label: "Fulfilled", variant: "outline" },
  };
  const c = config[status] ?? { label: status, variant: "outline" as const };
  return <Badge variant={c.variant} className="text-xs capitalize">{c.label}</Badge>;
}

export default function RequestsPage() {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<ListRequestsStatus | "">("");

  const { data: requests, isLoading } = useListRequests(
    statusFilter ? { status: statusFilter } : {},
  );
  const approveMutation = useApproveRequest();
  const rejectMutation = useRejectRequest();

  function invalidate() {
    qc.invalidateQueries({ queryKey: getListRequestsQueryKey() });
    qc.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
    qc.invalidateQueries({ queryKey: getListInventoryItemsQueryKey() });
  }

  function handleApprove(id: number) {
    approveMutation.mutate(
      { id },
      {
        onSuccess: () => {
          toast.success("Request approved and stock deducted");
          invalidate();
        },
        onError: (err: unknown) => {
          const msg =
            (err as { data?: { error?: string } })?.data?.error ??
            "Failed to approve request";
          toast.error(msg);
        },
      },
    );
  }

  function handleReject(id: number) {
    rejectMutation.mutate(
      { id },
      {
        onSuccess: () => {
          toast.success("Request rejected");
          invalidate();
        },
        onError: () => toast.error("Failed to reject request"),
      },
    );
  }

  const sortedRequests = [...(requests ?? [])].sort((a, b) => {
    // Pending requests first
    if (a.status === "pending" && b.status !== "pending") return -1;
    if (b.status === "pending" && a.status !== "pending") return 1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const pendingCount = requests?.filter((r) => r.status === "pending").length ?? 0;

  return (
    <SidebarLayout>
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold text-foreground">Requests</h1>
              {pendingCount > 0 && (
                <span className="rounded-full bg-amber-100 text-amber-700 text-xs font-medium px-2 py-0.5">
                  {pendingCount} pending
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">Process employee procurement requests</p>
          </div>
        </div>

        {/* Status filter */}
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <div className="flex gap-1">
            {STATUS_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setStatusFilter(opt.value)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  statusFilter === opt.value
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="rounded-xl border border-border overflow-hidden bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wide">Employee</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wide">Item</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wide">Department</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wide">Qty</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wide">Status</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wide">Date</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading
                ? Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-b border-border/50">
                      <td className="px-4 py-3" colSpan={7}>
                        <Skeleton className="h-4 w-full" />
                      </td>
                    </tr>
                  ))
                : sortedRequests.length === 0
                ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center">
                      <ClipboardList className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">No requests found</p>
                    </td>
                  </tr>
                )
                : sortedRequests.map((req) => {
                    const isPending = req.status === "pending";
                    const isProcessing =
                      (approveMutation.isPending && approveMutation.variables?.id === req.id) ||
                      (rejectMutation.isPending && rejectMutation.variables?.id === req.id);

                    return (
                      <tr
                        key={req.id}
                        className={`border-b border-border/50 last:border-0 transition-colors ${
                          isPending ? "bg-amber-50/40 hover:bg-amber-50/60" : "hover:bg-muted/20"
                        }`}
                      >
                        <td className="px-4 py-3">
                          <span className="text-xs font-mono text-muted-foreground">{req.employeeEmail}</span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium">{req.itemName ?? `Item #${req.itemId}`}</div>
                          {req.itemSku && <div className="text-xs text-muted-foreground font-mono">{req.itemSku}</div>}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{req.departmentName ?? `Dept #${req.departmentId}`}</td>
                        <td className="px-4 py-3 text-right font-medium">{req.quantity}</td>
                        <td className="px-4 py-3">{statusBadge(req.status)}</td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {new Date(req.createdAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {isPending ? (
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs gap-1 border-green-200 text-green-700 hover:bg-green-50 hover:text-green-800"
                                onClick={() => handleApprove(req.id)}
                                disabled={isProcessing}
                              >
                                <CheckCircle className="h-3 w-3" />
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs gap-1 border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800"
                                onClick={() => handleReject(req.id)}
                                disabled={isProcessing}
                              >
                                <XCircle className="h-3 w-3" />
                                Reject
                              </Button>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
            </tbody>
          </table>
        </div>
      </div>
    </SidebarLayout>
  );
}
