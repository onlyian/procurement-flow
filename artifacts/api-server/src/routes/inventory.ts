import { Router, type IRouter } from "express";
import { eq, lte, sql } from "drizzle-orm";
import { db, inventoryItemsTable } from "@workspace/db";
import {
  ListInventoryItemsQueryParams,
  CreateInventoryItemBody,
  GetInventoryItemParams,
  UpdateInventoryItemParams,
  UpdateInventoryItemBody,
  DeleteInventoryItemParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/inventory", async (req, res): Promise<void> => {
  const parsed = ListInventoryItemsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  let query = db.select().from(inventoryItemsTable).$dynamic();

  if (parsed.data.category) {
    query = query.where(eq(inventoryItemsTable.category, parsed.data.category));
  }

  if (parsed.data.lowStock === true) {
    query = query.where(lte(inventoryItemsTable.stockLevel, inventoryItemsTable.lowStockThreshold));
  }

  const items = await query.orderBy(inventoryItemsTable.name);
  res.json(items.map(serializeItem));
});

router.post("/inventory", async (req, res): Promise<void> => {
  const parsed = CreateInventoryItemBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [item] = await db
    .insert(inventoryItemsTable)
    .values({
      ...parsed.data,
      unitPrice: String(parsed.data.unitPrice),
    })
    .returning();

  res.status(201).json(serializeItem(item));
});

router.get("/inventory/:id", async (req, res): Promise<void> => {
  const params = GetInventoryItemParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [item] = await db
    .select()
    .from(inventoryItemsTable)
    .where(eq(inventoryItemsTable.id, params.data.id));

  if (!item) {
    res.status(404).json({ error: "Inventory item not found" });
    return;
  }

  res.json(serializeItem(item));
});

router.patch("/inventory/:id", async (req, res): Promise<void> => {
  const params = UpdateInventoryItemParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateInventoryItemBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updateData: Record<string, unknown> = { ...parsed.data };
  if (parsed.data.unitPrice !== undefined) {
    updateData.unitPrice = String(parsed.data.unitPrice);
  }

  const [item] = await db
    .update(inventoryItemsTable)
    .set(updateData)
    .where(eq(inventoryItemsTable.id, params.data.id))
    .returning();

  if (!item) {
    res.status(404).json({ error: "Inventory item not found" });
    return;
  }

  res.json(serializeItem(item));
});

router.delete("/inventory/:id", async (req, res): Promise<void> => {
  const params = DeleteInventoryItemParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [item] = await db
    .delete(inventoryItemsTable)
    .where(eq(inventoryItemsTable.id, params.data.id))
    .returning();

  if (!item) {
    res.status(404).json({ error: "Inventory item not found" });
    return;
  }

  res.sendStatus(204);
});

function serializeItem(item: typeof inventoryItemsTable.$inferSelect) {
  return {
    ...item,
    unitPrice: parseFloat(item.unitPrice),
    createdAt: item.createdAt.toISOString(),
  };
}

export default router;
