import { pgTable, serial, text, integer, numeric, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./auth";

export const residentsTable = pgTable("residents", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  walletAddress: text("wallet_address"),
  avatar: text("avatar"),
  skills: jsonb("skills").$type<string[]>().notNull().default([]),
  floor: integer("floor"),
  status: text("status", { enum: ["online", "offline", "busy"] }).notNull().default("online"),
  bio: text("bio"),
  bountiesCompleted: integer("bounties_completed").notNull().default(0),
  bountiesCreated: integer("bounties_created").notNull().default(0),
  totalEarned: numeric("total_earned", { precision: 18, scale: 6 }).notNull().default("0"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  userId: text("user_id").unique().references(() => usersTable.id),
  linkedAt: timestamp("linked_at"),
});

export const insertResidentSchema = createInsertSchema(residentsTable).omit({ id: true, createdAt: true, bountiesCompleted: true, bountiesCreated: true, totalEarned: true });
export type InsertResident = z.infer<typeof insertResidentSchema>;
export type Resident = typeof residentsTable.$inferSelect;
