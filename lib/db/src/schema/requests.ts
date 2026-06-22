import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { departmentsTable } from "./departments";
import { inventoryItemsTable } from "./inventoryItems";

export const requestStatusEnum = ["pending", "approved", "rejected", "fulfilled"] as const;
export type RequestStatus = typeof requestStatusEnum[number];

export const requestsTable = pgTable("requests", {
  id: serial("id").primaryKey(),
  employeeEmail: text("employee_email").notNull(),
  departmentId: integer("department_id").notNull().references(() => departmentsTable.id),
  itemId: integer("item_id").notNull().references(() => inventoryItemsTable.id),
  quantity: integer("quantity").notNull(),
  status: text("status").notNull().default("pending").$type<RequestStatus>(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertRequestSchema = createInsertSchema(requestsTable).omit({
  id: true,
  status: true,
  createdAt: true,
});
export type InsertRequest = z.infer<typeof insertRequestSchema>;
export type Request = typeof requestsTable.$inferSelect;
