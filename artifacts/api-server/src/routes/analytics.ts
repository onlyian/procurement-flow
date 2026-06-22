import { Router, type IRouter } from "express";
import { eq, count, sum, sql, lte } from "drizzle-orm";
import { db, requestsTable, inventoryItemsTable, departmentsTable, transactionsTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/analytics/dashboard", async (req, res): Promise<void> => {
  const [requestStats] = await db
    .select({
      total: count(),
      pending: sql<number>`count(*) filter (where status = 'pending')`,
      approved: sql<number>`count(*) filter (where status = 'approved')`,
      rejected: sql<number>`count(*) filter (where status = 'rejected')`,
    })
    .from(requestsTable);

  const [inventoryStats] = await db
    .select({
      totalItems: count(),
      lowStockCount: sql<number>`count(*) filter (where stock_level <= low_stock_threshold)`,
      totalValue: sql<number>`sum(stock_level * unit_price::numeric)`,
    })
    .from(inventoryItemsTable);

  res.json({
    totalRequests: Number(requestStats?.total ?? 0),
    pendingRequests: Number(requestStats?.pending ?? 0),
    approvedRequests: Number(requestStats?.approved ?? 0),
    rejectedRequests: Number(requestStats?.rejected ?? 0),
    totalInventoryItems: Number(inventoryStats?.totalItems ?? 0),
    lowStockCount: Number(inventoryStats?.lowStockCount ?? 0),
    totalInventoryValue: parseFloat(String(inventoryStats?.totalValue ?? "0")),
  });
});

router.get("/analytics/department-usage", async (req, res): Promise<void> => {
  const usage = await db
    .select({
      departmentId: transactionsTable.departmentId,
      departmentName: departmentsTable.name,
      totalQuantity: sum(transactionsTable.quantityDeducted),
      totalRequests: count(),
    })
    .from(transactionsTable)
    .leftJoin(departmentsTable, eq(transactionsTable.departmentId, departmentsTable.id))
    .groupBy(transactionsTable.departmentId, departmentsTable.name)
    .orderBy(departmentsTable.name);

  res.json(
    usage.map((u) => ({
      departmentId: u.departmentId,
      departmentName: u.departmentName ?? "Unknown",
      totalQuantity: Number(u.totalQuantity ?? 0),
      totalRequests: Number(u.totalRequests ?? 0),
    })),
  );
});

router.get("/analytics/low-stock", async (req, res): Promise<void> => {
  const items = await db
    .select()
    .from(inventoryItemsTable)
    .where(lte(inventoryItemsTable.stockLevel, inventoryItemsTable.lowStockThreshold))
    .orderBy(inventoryItemsTable.stockLevel);

  res.json(
    items.map((item) => ({
      ...item,
      unitPrice: parseFloat(item.unitPrice),
      createdAt: item.createdAt.toISOString(),
    })),
  );
});

export default router;
