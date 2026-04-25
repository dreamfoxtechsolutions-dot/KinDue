import { pgTable, serial, text, timestamp, integer, numeric, boolean } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const subscriptionsTable = pgTable("subscriptions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  provider: text("provider"),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull().default("0"),
  billingCycle: text("billing_cycle", {
    enum: ["weekly", "monthly", "quarterly", "annual"],
  }).notNull().default("monthly"),
  serviceLocationLabel: text("service_location_label"),
  status: text("status", { enum: ["active", "paused", "cancelled"] }).notNull().default("active"),
  cancelUrl: text("cancel_url"),
  cancelPhone: text("cancel_phone"),
  cancelEmail: text("cancel_email"),
  dismissed: boolean("dismissed").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type Subscription = typeof subscriptionsTable.$inferSelect;
