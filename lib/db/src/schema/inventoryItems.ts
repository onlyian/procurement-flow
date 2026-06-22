import { pgTable, serial, text, integer, numeric, timestamp, check } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { sql } from "drizzle-orm";
import { z } from "zod/v4";

export const inventoryItemsTable = pgTable("inventory_items", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  sku: text("sku").notNull().unique(),
  stockLevel: integer("stock_level").notNull().default(0),
  unitPrice: numeric("unit_price", { precision: 10, scale: 2 }).notNull(),
  category: text("category").notNull(),
  lowStockThreshold: integer("low_stock_threshold").notNull().default(10),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  check("stock_level_non_negative", sql`${table.stockLevel} >= 0`),
]);

export const insertInventoryItemSchema = createInsertSchema(inventoryItemsTable).omit({
  id: true,
  createdAt: true,
});
export type InsertInventoryItem = z.infer<typeof insertInventoryItemSchema>;
export type InventoryItem = typeof inventoryItemsTable.$inferSelect;
