import { pgTable, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { requestsTable } from "./requests";
import { inventoryItemsTable } from "./inventoryItems";
import { departmentsTable } from "./departments";

export const transactionsTable = pgTable("transactions", {
  id: serial("id").primaryKey(),
  requestId: integer("request_id").notNull().references(() => requestsTable.id),
  itemId: integer("item_id").notNull().references(() => inventoryItemsTable.id),
  departmentId: integer("department_id").notNull().references(() => departmentsTable.id),
  quantityDeducted: integer("quantity_deducted").notNull(),
  timestamp: timestamp("timestamp", { withTimezone: true }).notNull().defaultNow(),
});

export const insertTransactionSchema = createInsertSchema(transactionsTable).omit({
  id: true,
  timestamp: true,
});
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type Transaction = typeof transactionsTable.$inferSelect;
