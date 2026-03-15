import { pgTable, serial, text, integer, numeric, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { bountiesTable } from "./bounties";

export const transactionsTable = pgTable("transactions", {
  id: serial("id").primaryKey(),
  type: text("type", { enum: ["escrow_lock", "escrow_release", "payout", "deposit", "refund", "bounty_claim"] }).notNull(),
  amount: numeric("amount", { precision: 18, scale: 6 }).notNull(),
  token: text("token").notNull().default("USDC"),
  fromWallet: text("from_wallet"),
  toWallet: text("to_wallet"),
  bountyId: integer("bounty_id").references(() => bountiesTable.id),
  txSignature: text("tx_signature"),
  description: text("description").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertTransactionSchema = createInsertSchema(transactionsTable).omit({ id: true, createdAt: true });
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type Transaction = typeof transactionsTable.$inferSelect;
