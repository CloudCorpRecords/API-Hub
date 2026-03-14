import { pgTable, serial, text, integer, numeric, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const bountiesTable = pgTable("bounties", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  rewardAmount: numeric("reward_amount", { precision: 18, scale: 6 }).notNull(),
  rewardToken: text("reward_token").notNull().default("USDC"),
  status: text("status", { enum: ["open", "claimed", "completed", "cancelled"] }).notNull().default("open"),
  category: text("category").notNull(),
  creatorWallet: text("creator_wallet").notNull(),
  claimerWallet: text("claimer_wallet"),
  proofOfWork: text("proof_of_work"),
  escrowTxSignature: text("escrow_tx_signature"),
  completionTxSignature: text("completion_tx_signature"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertBountySchema = createInsertSchema(bountiesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertBounty = z.infer<typeof insertBountySchema>;
export type Bounty = typeof bountiesTable.$inferSelect;
