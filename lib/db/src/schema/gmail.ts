import { pgTable, serial, text, timestamp, integer, numeric, boolean } from "drizzle-orm/pg-core";
import { householdsTable } from "./households";

export const gmailConnectionsTable = pgTable("gmail_connections", {
  id: serial("id").primaryKey(),
  householdId: integer("household_id").notNull().references(() => householdsTable.id, { onDelete: "cascade" }),
  email: text("email").notNull(),
  accessToken: text("access_token").notNull(),
  refreshToken: text("refresh_token"),
  tokenExpiry: timestamp("token_expiry"),
  connected: boolean("connected").notNull().default(true),
  lastScanAt: timestamp("last_scan_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const gmailBillCandidatesTable = pgTable("gmail_bill_candidates", {
  id: serial("id").primaryKey(),
  householdId: integer("household_id").notNull().references(() => householdsTable.id, { onDelete: "cascade" }),
  emailSubject: text("email_subject").notNull(),
  emailFrom: text("email_from").notNull(),
  emailDate: timestamp("email_date").notNull(),
  gmailMessageId: text("gmail_message_id").notNull(),
  extractedBillerName: text("extracted_biller_name"),
  extractedAmount: numeric("extracted_amount", { precision: 12, scale: 2 }),
  extractedDueDate: timestamp("extracted_due_date"),
  suggestedCategory: text("suggested_category", {
    enum: ["utilities", "telecom", "insurance", "mortgage_rent", "auto_loan", "credit_card", "tolls", "subscription", "other"],
  }),
  status: text("status", { enum: ["pending", "accepted", "dismissed"] }).notNull().default("pending"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type GmailConnection = typeof gmailConnectionsTable.$inferSelect;
export type GmailBillCandidate = typeof gmailBillCandidatesTable.$inferSelect;
