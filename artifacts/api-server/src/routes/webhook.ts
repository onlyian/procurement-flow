import { Router, type IRouter } from "express";
import { eq, ilike } from "drizzle-orm";
import { db, requestsTable, departmentsTable, inventoryItemsTable } from "@workspace/db";
import { GoogleFormsWebhookBody } from "@workspace/api-zod";
import { logger } from "../lib/logger";

const router: IRouter = Router();

router.post("/webhook/google-forms", async (req, res): Promise<void> => {
  // Always return 200 to prevent Google from spamming retries
  const parsed = GoogleFormsWebhookBody.safeParse(req.body);
  if (!parsed.success) {
    logger.warn({ errors: parsed.error.message }, "Invalid Google Forms webhook payload");
    res.json({ received: true, message: "Invalid payload — logged" });
    return;
  }

  const { employeeEmail, departmentName, itemName, quantity } = parsed.data;

  try {
    // Find or create department
    let [department] = await db
      .select()
      .from(departmentsTable)
      .where(ilike(departmentsTable.name, departmentName));

    if (!department) {
      [department] = await db
        .insert(departmentsTable)
        .values({ name: departmentName })
        .returning();
    }

    // Find item by name (case-insensitive)
    const [item] = await db
      .select()
      .from(inventoryItemsTable)
      .where(ilike(inventoryItemsTable.name, itemName));

    if (!item) {
      logger.warn({ itemName }, "Google Forms webhook: item not found in inventory");
      res.json({ received: true, message: `Item '${itemName}' not found in inventory` });
      return;
    }

    await db.insert(requestsTable).values({
      employeeEmail,
      departmentId: department.id,
      itemId: item.id,
      quantity,
      status: "pending",
    });

    res.json({ received: true, message: "Request created successfully" });
  } catch (err) {
    logger.error({ err }, "Error processing Google Forms webhook");
    res.json({ received: true, message: "Internal error — logged" });
  }
});

export default router;
