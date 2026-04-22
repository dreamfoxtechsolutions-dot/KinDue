import { relations } from "drizzle-orm";
import { usersTable, notificationSettingsTable, pushTokensTable } from "./users";
import { householdsTable, householdMembersTable } from "./households";
import { billsTable, documentsTable, receiptsTable } from "./bills";
import { gmailConnectionsTable, gmailBillCandidatesTable } from "./gmail";
import { linkedAccountsTable, transactionsTable } from "./plaid";
import { auditLogTable } from "./audit";

export const usersRelations = relations(usersTable, ({ many, one }) => ({
  households: many(householdMembersTable),
  notificationSettings: one(notificationSettingsTable),
  pushTokens: many(pushTokensTable),
  createdBills: many(billsTable, { relationName: "billCreator" }),
  auditLogs: many(auditLogTable),
}));

export const notificationSettingsRelations = relations(notificationSettingsTable, ({ one }) => ({
  user: one(usersTable, { fields: [notificationSettingsTable.userId], references: [usersTable.id] }),
}));

export const pushTokensRelations = relations(pushTokensTable, ({ one }) => ({
  user: one(usersTable, { fields: [pushTokensTable.userId], references: [usersTable.id] }),
}));

export const householdsRelations = relations(householdsTable, ({ many }) => ({
  members: many(householdMembersTable),
  bills: many(billsTable),
  documents: many(documentsTable),
  gmailConnections: many(gmailConnectionsTable),
  gmailCandidates: many(gmailBillCandidatesTable),
  linkedAccounts: many(linkedAccountsTable),
  auditLogs: many(auditLogTable),
}));

export const householdMembersRelations = relations(householdMembersTable, ({ one }) => ({
  household: one(householdsTable, { fields: [householdMembersTable.householdId], references: [householdsTable.id] }),
  user: one(usersTable, { fields: [householdMembersTable.userId], references: [usersTable.id] }),
}));

export const billsRelations = relations(billsTable, ({ one, many }) => ({
  household: one(householdsTable, { fields: [billsTable.householdId], references: [householdsTable.id] }),
  createdBy: one(usersTable, { fields: [billsTable.createdByUserId], references: [usersTable.id], relationName: "billCreator" }),
  approvedBy: one(usersTable, { fields: [billsTable.approvedByUserId], references: [usersTable.id], relationName: "billApprover" }),
  documents: many(documentsTable),
  receipts: many(receiptsTable),
}));

export const documentsRelations = relations(documentsTable, ({ one }) => ({
  household: one(householdsTable, { fields: [documentsTable.householdId], references: [householdsTable.id] }),
  bill: one(billsTable, { fields: [documentsTable.billId], references: [billsTable.id] }),
  uploadedBy: one(usersTable, { fields: [documentsTable.uploadedByUserId], references: [usersTable.id] }),
}));

export const receiptsRelations = relations(receiptsTable, ({ one }) => ({
  bill: one(billsTable, { fields: [receiptsTable.billId], references: [billsTable.id] }),
  uploadedBy: one(usersTable, { fields: [receiptsTable.uploadedByUserId], references: [usersTable.id] }),
}));

export const gmailConnectionsRelations = relations(gmailConnectionsTable, ({ one }) => ({
  household: one(householdsTable, { fields: [gmailConnectionsTable.householdId], references: [householdsTable.id] }),
}));

export const gmailBillCandidatesRelations = relations(gmailBillCandidatesTable, ({ one }) => ({
  household: one(householdsTable, { fields: [gmailBillCandidatesTable.householdId], references: [householdsTable.id] }),
}));

export const linkedAccountsRelations = relations(linkedAccountsTable, ({ one, many }) => ({
  household: one(householdsTable, { fields: [linkedAccountsTable.householdId], references: [householdsTable.id] }),
  transactions: many(transactionsTable),
}));

export const transactionsRelations = relations(transactionsTable, ({ one }) => ({
  linkedAccount: one(linkedAccountsTable, { fields: [transactionsTable.linkedAccountId], references: [linkedAccountsTable.id] }),
}));

export const auditLogRelations = relations(auditLogTable, ({ one }) => ({
  household: one(householdsTable, { fields: [auditLogTable.householdId], references: [householdsTable.id] }),
  actor: one(usersTable, { fields: [auditLogTable.actorUserId], references: [usersTable.id] }),
}));
