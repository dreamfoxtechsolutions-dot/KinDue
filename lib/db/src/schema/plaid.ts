import { pgTable, serial, text, timestamp, integer, numeric, boolean } from "drizzle-orm/pg-core";
import { householdsTable } from "./households";

export const linkedAccountsTable = pgTable("linked_accounts", {
  id: serial("id").primaryKey(),
  householdId: integer("household_id").notNull().references(() => householdsTable.id, { onDelete: "cascade" }),
  plaidItemId: text("plaid_item_id").notNull(),
  plaidAccessToken: text("plaid_access_token").notNull(),
  plaidAccountId: text("plaid_account_id").notNull(),
  institutionName: text("institution_name").notNull(),
  institutionId: text("institution_id").notNull(),
  accountName: text("account_name").notNull(),
  accountType: text("account_type", { enum: ["checking", "savings", "credit", "investment", "other"] }).notNull().default("other"),
  mask: text("mask"),
  currentBalance: numeric("current_balance", { precision: 12, scale: 2 }),
  availableBalance: numeric("available_balance", { precision: 12, scale: 2 }),
  lastSyncAt: timestamp("last_sync_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const transactionsTable = pgTable("transactions", {
  id: serial("id").primaryKey(),
  linkedAccountId: integer("linked_account_id").notNull().references(() => linkedAccountsTable.id, { onDelete: "cascade" }),
  plaidTransactionId: text("plaid_transaction_id").notNull().unique(),
  name: text("name").notNull(),
  merchantName: text("merchant_name"),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  date: timestamp("date").notNull(),
  category: text("category"),
  pending: boolean("pending").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type LinkedAccount = typeof linkedAccountsTable.$inferSelect;
export type Transaction = typeof transactionsTable.$inferSelect;
