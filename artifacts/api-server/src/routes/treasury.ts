import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { bountiesTable, transactionsTable } from "@workspace/db/schema";
import { ListTransactionsQueryParams } from "@workspace/api-zod";
import { eq, desc, sql } from "drizzle-orm";

const router: IRouter = Router();

router.get("/treasury", async (req, res) => {
  const [escrowResult] = await db
    .select({
      total: sql<string>`COALESCE(SUM(CASE WHEN ${transactionsTable.type} = 'escrow_lock' THEN ${transactionsTable.amount}::numeric ELSE 0 END) - SUM(CASE WHEN ${transactionsTable.type} IN ('payout', 'refund') THEN ${transactionsTable.amount}::numeric ELSE 0 END), 0)`,
    })
    .from(transactionsTable);

  const [depositResult] = await db
    .select({
      total: sql<string>`COALESCE(SUM(CASE WHEN ${transactionsTable.type} = 'deposit' THEN ${transactionsTable.amount}::numeric ELSE 0 END), 0)`,
    })
    .from(transactionsTable);

  const [paidResult] = await db
    .select({
      total: sql<string>`COALESCE(SUM(CASE WHEN ${transactionsTable.type} = 'payout' THEN ${transactionsTable.amount}::numeric ELSE 0 END), 0)`,
    })
    .from(transactionsTable);

  const activeBounties = await db
    .select({ count: sql<number>`COUNT(*)::int` })
    .from(bountiesTable)
    .where(sql`${bountiesTable.status} IN ('open', 'claimed')`);

  const completedBounties = await db
    .select({ count: sql<number>`COUNT(*)::int` })
    .from(bountiesTable)
    .where(eq(bountiesTable.status, "completed"));

  const pendingEscrow = Number(escrowResult?.total ?? 0);
  const totalDeposits = Number(depositResult?.total ?? 0);
  const totalPaidOut = Number(paidResult?.total ?? 0);

  res.json({
    totalBalance: totalDeposits - totalPaidOut,
    pendingEscrow,
    totalPaidOut,
    activeBounties: activeBounties[0]?.count ?? 0,
    completedBounties: completedBounties[0]?.count ?? 0,
  });
});

router.get("/treasury/transactions", async (req, res) => {
  const query = ListTransactionsQueryParams.safeParse(req.query);
  const limit = (query.success && query.data.limit) || 20;

  const rows = await db
    .select()
    .from(transactionsTable)
    .orderBy(desc(transactionsTable.createdAt))
    .limit(limit);

  res.json(rows.map((r) => ({ ...r, amount: Number(r.amount) })));
});

export default router;
