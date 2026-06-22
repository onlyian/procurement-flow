import { SidebarLayout } from "@/components/layout-sidebar";
import {
  useGetDashboardSummary,
  useGetDepartmentUsage,
  useGetLowStockItems,
} from "@workspace/api-client-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { Package, ClipboardList, CheckCircle, XCircle, AlertTriangle, DollarSign } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

function KpiCard({
  label,
  value,
  icon: Icon,
  sub,
  accent,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  sub?: string;
  accent?: "primary" | "warning" | "destructive" | "success";
}) {
  const iconColors: Record<string, string> = {
    primary: "text-primary bg-primary/10",
    warning: "text-amber-600 bg-amber-50",
    destructive: "text-destructive bg-destructive/10",
    success: "text-green-600 bg-green-50",
  };
  const cls = iconColors[accent ?? "primary"];
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">{label}</p>
          <p className="text-2xl font-bold text-foreground">{value}</p>
          {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
        </div>
        <div className={`rounded-lg p-2 ${cls}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { data: summary, isLoading: summaryLoading } = useGetDashboardSummary();
  const { data: deptUsage, isLoading: usageLoading } = useGetDepartmentUsage();
  const { data: lowStock, isLoading: lowStockLoading } = useGetLowStockItems();

  return (
    <SidebarLayout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Procurement overview and analytics</p>
        </div>

        {/* KPI Cards */}
        {summaryLoading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 7 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-xl" />
            ))}
          </div>
        ) : summary ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard
              label="Total Requests"
              value={summary.totalRequests}
              icon={ClipboardList}
              accent="primary"
            />
            <KpiCard
              label="Pending"
              value={summary.pendingRequests}
              icon={ClipboardList}
              accent="warning"
              sub="awaiting review"
            />
            <KpiCard
              label="Approved"
              value={summary.approvedRequests}
              icon={CheckCircle}
              accent="success"
            />
            <KpiCard
              label="Rejected"
              value={summary.rejectedRequests}
              icon={XCircle}
              accent="destructive"
            />
            <KpiCard
              label="Inventory Items"
              value={summary.totalInventoryItems}
              icon={Package}
              accent="primary"
            />
            <KpiCard
              label="Low Stock Alerts"
              value={summary.lowStockCount}
              icon={AlertTriangle}
              accent="warning"
              sub={summary.lowStockCount > 0 ? "needs attention" : "all good"}
            />
            <KpiCard
              label="Inventory Value"
              value={`$${summary.totalInventoryValue.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
              icon={DollarSign}
              accent="success"
              sub="total stock value"
            />
          </div>
        ) : null}

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Department Usage Chart */}
          <div className="lg:col-span-2 rounded-xl border border-border bg-card p-5">
            <h2 className="text-sm font-semibold text-foreground mb-1">Department Usage</h2>
            <p className="text-xs text-muted-foreground mb-4">Total items deducted per department</p>
            {usageLoading ? (
              <Skeleton className="h-48 w-full" />
            ) : deptUsage && deptUsage.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={deptUsage} margin={{ top: 0, right: 0, bottom: 0, left: -10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis
                    dataKey="departmentName"
                    tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: 12,
                    }}
                    itemStyle={{ color: "hsl(var(--foreground))" }}
                    cursor={{ fill: "hsl(var(--muted))" }}
                  />
                  <Bar dataKey="totalQuantity" name="Items deducted" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-48 flex items-center justify-center text-sm text-muted-foreground">
                No transaction data yet. Approve some requests to see usage.
              </div>
            )}
          </div>

          {/* Low Stock Alerts */}
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <h2 className="text-sm font-semibold text-foreground">Low Stock Alerts</h2>
            </div>
            {lowStockLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : lowStock && lowStock.length > 0 ? (
              <div className="space-y-2 overflow-auto max-h-[240px]">
                {lowStock.map((item) => (
                  <div key={item.id} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">{item.name}</p>
                      <p className="text-xs text-muted-foreground">{item.sku}</p>
                    </div>
                    <Badge
                      variant={item.stockLevel === 0 ? "destructive" : "secondary"}
                      className="ml-2 shrink-0 text-xs"
                    >
                      {item.stockLevel} left
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-40 flex items-center justify-center text-sm text-muted-foreground text-center">
                All items are well stocked
              </div>
            )}
          </div>
        </div>
      </div>
    </SidebarLayout>
  );
}
