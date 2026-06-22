import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, transactionsTable, inventoryItemsTable, departmentsTable } from "@workspace/db";
import { ListTransactionsQueryParams } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/transactions", async (req, res): Promise<void> => {
  const parsed = ListTransactionsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  let query = db
    .select({
      id: transactionsTable.id,
      requestId: transactionsTable.requestId,
      itemId: transactionsTable.itemId,
      departmentId: transactionsTable.departmentId,
      quantityDeducted: transactionsTable.quantityDeducted,
      timestamp: transactionsTable.timestamp,
      itemName: inventoryItemsTable.name,
      departmentName: departmentsTable.name,
    })
    .from(transactionsTable)
    .leftJoin(inventoryItemsTable, eq(transactionsTable.itemId, inventoryItemsTable.id))
    .leftJoin(departmentsTable, eq(transactionsTable.departmentId, departmentsTable.id))
    .$dynamic();

  const conditions = [];
  if (parsed.data.departmentId) {
    conditions.push(eq(transactionsTable.departmentId, parsed.data.departmentId));
  }
  if (parsed.data.itemId) {
    conditions.push(eq(transactionsTable.itemId, parsed.data.itemId));
  }
  if (conditions.length > 0) {
    query = query.where(and(...conditions));
  }

  const txns = await query.orderBy(transactionsTable.timestamp);
  res.json(txns.map((t) => ({ ...t, timestamp: t.timestamp.toISOString() })));
});

export default router;
