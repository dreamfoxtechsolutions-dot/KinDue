import {
  pgTable,
  serial,
  text,
  timestamp,
  boolean,
  integer,
} from "drizzle-orm/pg-core";

export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  clerkUserId: text("clerk_user_id").notNull().unique(),
  email: text("email").notNull(),
  displayName: text("display_name"),
  avatarUrl: text("avatar_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const notificationSettingsTable = pgTable("notification_settings", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  emailOverdue: boolean("email_overdue").default(true).notNull(),
  emailPendingApproval: boolean("email_pending_approval")
    .default(true)
    .notNull(),
  emailBillPaid: boolean("email_bill_paid").default(true).notNull(),
  emailBillRejected: boolean("email_bill_rejected").default(true).notNull(),
  emailLowBalance: boolean("email_low_balance").default(false).notNull(),
  pushOverdue: boolean("push_overdue").default(true).notNull(),
  pushPendingApproval: boolean("push_pending_approval").default(true).notNull(),
  pushBillPaid: boolean("push_bill_paid").default(false).notNull(),
  pushBillRejected: boolean("push_bill_rejected").default(true).notNull(),
  pushLowBalance: boolean("push_low_balance").default(false).notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const pushTokensTable = pgTable("push_tokens", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  platform: text("platform", { enum: ["ios", "android", "web"] }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type InsertUser = typeof usersTable.$inferInsert;
export type User = typeof usersTable.$inferSelect;
export type NotificationSettings =
  typeof notificationSettingsTable.$inferSelect;
export type PushToken = typeof pushTokensTable.$inferSelect;
