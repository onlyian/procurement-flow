import { Router, type IRouter } from "express";
import { eq, and, sql } from "drizzle-orm";
import { db, requestsTable, inventoryItemsTable, departmentsTable, transactionsTable } from "@workspace/db";
import {
  ListRequestsQueryParams,
  CreateRequestBody,
  GetRequestParams,
  ApproveRequestParams,
  RejectRequestParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/requests", async (req, res): Promise<void> => {
  const parsed = ListRequestsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  let query = db
    .select({
      id: requestsTable.id,
      employeeEmail: requestsTable.employeeEmail,
      departmentId: requestsTable.departmentId,
      itemId: requestsTable.itemId,
      quantity: requestsTable.quantity,
      status: requestsTable.status,
      createdAt: requestsTable.createdAt,
      departmentName: departmentsTable.name,
      itemName: inventoryItemsTable.name,
      itemSku: inventoryItemsTable.sku,
    })
    .from(requestsTable)
    .leftJoin(departmentsTable, eq(requestsTable.departmentId, departmentsTable.id))
    .leftJoin(inventoryItemsTable, eq(requestsTable.itemId, inventoryItemsTable.id))
    .$dynamic();

  const conditions = [];
  if (parsed.data.status) {
    conditions.push(eq(requestsTable.status, parsed.data.status));
  }
  if (parsed.data.departmentId) {
    conditions.push(eq(requestsTable.departmentId, parsed.data.departmentId));
  }
  if (conditions.length > 0) {
    query = query.where(and(...conditions));
  }

  const requests = await query.orderBy(requestsTable.createdAt);
  res.json(requests.map(serializeRequest));
});

router.post("/requests", async (req, res): Promise<void> => {
  const parsed = CreateRequestBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [request] = await db
    .insert(requestsTable)
    .values({ ...parsed.data, status: "pending" })
    .returning();

  res.status(201).json(serializeRequest({
    ...request,
    departmentName: null,
    itemName: null,
    itemSku: null,
  }));
});

router.get("/requests/:id", async (req, res): Promise<void> => {
  const params = GetRequestParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [request] = await db
    .select({
      id: requestsTable.id,
      employeeEmail: requestsTable.employeeEmail,
      departmentId: requestsTable.departmentId,
      itemId: requestsTable.itemId,
      quantity: requestsTable.quantity,
      status: requestsTable.status,
      createdAt: requestsTable.createdAt,
      departmentName: departmentsTable.name,
      itemName: inventoryItemsTable.name,
      itemSku: inventoryItemsTable.sku,
    })
    .from(requestsTable)
    .leftJoin(departmentsTable, eq(requestsTable.departmentId, departmentsTable.id))
    .leftJoin(inventoryItemsTable, eq(requestsTable.itemId, inventoryItemsTable.id))
    .where(eq(requestsTable.id, params.data.id));

  if (!request) {
    res.status(404).json({ error: "Request not found" });
    return;
  }

  res.json(serializeRequest(request));
});

router.post("/requests/:id/approve", async (req, res): Promise<void> => {
  const params = ApproveRequestParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [existing] = await db
    .select()
    .from(requestsTable)
    .where(eq(requestsTable.id, params.data.id));

  if (!existing) {
    res.status(404).json({ error: "Request not found" });
    return;
  }

  if (existing.status !== "pending") {
    res.status(400).json({ error: `Request is already ${existing.status}` });
    return;
  }

  // Check stock and deduct atomically via UPDATE ... RETURNING
  const [updatedItem] = await db
    .update(inventoryItemsTable)
    .set({ stockLevel: sql`${inventoryItemsTable.stockLevel} - ${existing.quantity}` })
    .where(
      and(
        eq(inventoryItemsTable.id, existing.itemId),
        sql`${inventoryItemsTable.stockLevel} >= ${existing.quantity}`,
      ),
    )
    .returning();

  if (!updatedItem) {
    res.status(400).json({ error: "Insufficient stock to fulfill this request" });
    return;
  }

  const [approved] = await db
    .update(requestsTable)
    .set({ status: "approved" })
    .where(eq(requestsTable.id, params.data.id))
    .returning();

  // Log the transaction
  await db.insert(transactionsTable).values({
    requestId: existing.id,
    itemId: existing.itemId,
    departmentId: existing.departmentId,
    quantityDeducted: existing.quantity,
  });

  res.json(serializeRequest({
    ...approved,
    departmentName: null,
    itemName: null,
    itemSku: null,
  }));
});

router.post("/requests/:id/reject", async (req, res): Promise<void> => {
  const params = RejectRequestParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [existing] = await db
    .select()
    .from(requestsTable)
    .where(eq(requestsTable.id, params.data.id));

  if (!existing) {
    res.status(404).json({ error: "Request not found" });
    return;
  }

  if (existing.status !== "pending") {
    res.status(400).json({ error: `Request is already ${existing.status}` });
    return;
  }

  const [rejected] = await db
    .update(requestsTable)
    .set({ status: "rejected" })
    .where(eq(requestsTable.id, params.data.id))
    .returning();

  res.json(serializeRequest({
    ...rejected,
    departmentName: null,
    itemName: null,
    itemSku: null,
  }));
});

function serializeRequest(r: {
  id: number;
  employeeEmail: string;
  departmentId: number;
  itemId: number;
  quantity: number;
  status: string;
  createdAt: Date;
  departmentName: string | null;
  itemName: string | null;
  itemSku: string | null;
}) {
  return {
    ...r,
    createdAt: r.createdAt.toISOString(),
  };
}

export default router;
