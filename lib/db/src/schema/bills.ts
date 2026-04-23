import { pgTable, serial, text, timestamp, integer, numeric, boolean } from "drizzle-orm/pg-core";
import { householdsTable } from "./households";
import { usersTable } from "./users";

export const billsTable = pgTable("bills", {
  id: serial("id").primaryKey(),
  householdId: integer("household_id").notNull().references(() => householdsTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  category: text("category", {
    enum: ["utilities", "telecom", "insurance", "mortgage_rent", "auto_loan", "credit_card", "tolls", "subscription", "other"],
  }).notNull().default("other"),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  currency: text("currency").notNull().default("USD"),
  dueDate: timestamp("due_date").notNull(),
  payee: text("payee"),
  notes: text("notes"),
  recurrence: text("recurrence", { enum: ["none", "weekly", "monthly", "quarterly", "annual"] }).notNull().default("none"),
  status: text("status", {
    enum: ["draft", "pending_approval", "approved", "paid", "overdue", "rejected"],
  }).notNull().default("draft"),
  receiptRequired: boolean("receipt_required").notNull().default(false),
  createdByUserId: integer("created_by_user_id").references(() => usersTable.id),
  approvedByUserId: integer("approved_by_user_id").references(() => usersTable.id),
  rejectionReason: text("rejection_reason"),
  paidAt: timestamp("paid_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const documentsTable = pgTable("documents", {
  id: serial("id").primaryKey(),
  householdId: integer("household_id").notNull().references(() => householdsTable.id, { onDelete: "cascade" }),
  billId: integer("bill_id").references(() => billsTable.id, { onDelete: "set null" }),
  fileName: text("file_name").notNull(),
  mimeType: text("mime_type").notNull(),
  fileSize: integer("file_size").notNull(),
  storageKey: text("storage_key").notNull(),
  type: text("type", { enum: ["statement", "receipt", "other"] }).notNull().default("other"),
  uploadedByUserId: integer("uploaded_by_user_id").references(() => usersTable.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const receiptsTable = pgTable("receipts", {
  id: serial("id").primaryKey(),
  billId: integer("bill_id").notNull().references(() => billsTable.id, { onDelete: "cascade" }),
  fileName: text("file_name").notNull(),
  mimeType: text("mime_type").notNull(),
  fileSize: integer("file_size").notNull(),
  storageKey: text("storage_key").notNull(),
  uploadedByUserId: integer("uploaded_by_user_id").references(() => usersTable.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const paymentsTable = pgTable("payments", {
  id: serial("id").primaryKey(),
  billId: integer("bill_id").notNull().references(() => billsTable.id, { onDelete: "cascade" }),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  paidAt: timestamp("paid_at").notNull(),
  method: text("method").notNull().default("bank_transfer"),
  notes: text("notes"),
  paidByUserId: integer("paid_by_user_id").references(() => usersTable.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type InsertBill = typeof billsTable.$inferInsert;
export type Bill = typeof billsTable.$inferSelect;
export type Document = typeof documentsTable.$inferSelect;
export type Receipt = typeof receiptsTable.$inferSelect;
export type Payment = typeof paymentsTable.$inferSelect;
