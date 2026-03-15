import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { bountiesTable, transactionsTable } from "@workspace/db/schema";
import {
  CreateBountyBody,
  ClaimBountyBody,
  CompleteBountyBody,
  ListBountiesQueryParams,
} from "@workspace/api-zod";
import { eq, desc, and } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import { bountyCreateLimiter, bountyClaimLimiter } from "../middlewares/rateLimiter";

const router: IRouter = Router();

router.get("/bounties", async (req, res) => {
  const query = ListBountiesQueryParams.safeParse(req.query);
  const rows = await db
    .select()
    .from(bountiesTable)
    .orderBy(desc(bountiesTable.createdAt));

  const filtered = query.success && query.data.status
    ? rows.filter((r) => r.status === query.data.status)
    : rows;

  res.json(
    filtered.map((r) => ({
      ...r,
      rewardAmount: Number(r.rewardAmount),
    }))
  );
});

router.post("/bounties", requireAuth, bountyCreateLimiter, async (req, res) => {
  const parsed = CreateBountyBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [bounty] = await db
    .insert(bountiesTable)
    .values({
      title: parsed.data.title,
      description: parsed.data.description,
      rewardAmount: String(parsed.data.rewardAmount),
      rewardToken: parsed.data.rewardToken ?? "USDC",
      category: parsed.data.category,
      creatorWallet: req.user!.id,
      escrowTxSignature: parsed.data.escrowTxSignature,
    })
    .returning();

  await db.insert(transactionsTable).values({
    type: "escrow_lock",
    amount: String(parsed.data.rewardAmount),
    token: parsed.data.rewardToken ?? "USDC",
    fromWallet: req.user!.id,
    bountyId: bounty.id,
    txSignature: parsed.data.escrowTxSignature,
    description: `Escrow locked for bounty: ${parsed.data.title}`,
  });

  res.status(201).json({ ...bounty, rewardAmount: Number(bounty.rewardAmount) });
});

router.get("/bounties/:id", async (req, res) => {
  const id = Number(req.params.id);
  const [bounty] = await db.select().from(bountiesTable).where(eq(bountiesTable.id, id));
  if (!bounty) {
    res.status(404).json({ error: "Bounty not found" });
    return;
  }
  res.json({ ...bounty, rewardAmount: Number(bounty.rewardAmount) });
});

router.post("/bounties/:id/claim", requireAuth, bountyClaimLimiter, async (req, res) => {
  const id = Number(req.params.id);

  const [bounty] = await db.select().from(bountiesTable).where(eq(bountiesTable.id, id));
  if (!bounty) {
    res.status(404).json({ error: "Bounty not found" });
    return;
  }
  if (bounty.status !== "open") {
    res.status(409).json({ error: "Bounty is not available for claiming" });
    return;
  }

  const [updated] = await db
    .update(bountiesTable)
    .set({
      status: "claimed",
      claimerWallet: req.user!.id,
      updatedAt: new Date(),
    })
    .where(and(eq(bountiesTable.id, id), eq(bountiesTable.status, "open")))
    .returning();

  if (!updated) {
    res.status(409).json({ error: "Bounty is no longer available for claiming" });
    return;
  }

  await db.insert(transactionsTable).values({
    type: "bounty_claim",
    amount: bounty.rewardAmount,
    token: bounty.rewardToken,
    fromWallet: req.user!.id,
    bountyId: bounty.id,
    description: `Bounty claimed: ${bounty.title}`,
  });

  res.json({ ...updated, rewardAmount: Number(updated.rewardAmount) });
});

router.post("/bounties/:id/complete", requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  const parsed = CompleteBountyBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [bounty] = await db.select().from(bountiesTable).where(eq(bountiesTable.id, id));
  if (!bounty) {
    res.status(404).json({ error: "Bounty not found" });
    return;
  }
  if (bounty.status !== "claimed") {
    res.status(409).json({ error: "Bounty must be claimed before completing" });
    return;
  }
  if (bounty.claimerWallet !== req.user!.id) {
    res.status(403).json({
      error: "Forbidden",
      message: "Only the claimer can complete this bounty.",
    });
    return;
  }

  const [updated] = await db
    .update(bountiesTable)
    .set({
      status: "completed",
      proofOfWork: parsed.data.proofOfWork,
      completionTxSignature: parsed.data.completionTxSignature,
      updatedAt: new Date(),
    })
    .where(and(eq(bountiesTable.id, id), eq(bountiesTable.status, "claimed")))
    .returning();

  if (!updated) {
    res.status(409).json({ error: "Bounty state changed concurrently" });
    return;
  }

  await db.insert(transactionsTable).values({
    type: "payout",
    amount: bounty.rewardAmount,
    token: bounty.rewardToken,
    fromWallet: bounty.creatorWallet,
    toWallet: bounty.claimerWallet,
    bountyId: bounty.id,
    txSignature: parsed.data.completionTxSignature,
    description: `Payout for completed bounty: ${bounty.title}`,
  });

  res.json({ ...updated, rewardAmount: Number(updated.rewardAmount) });
});

router.post("/bounties/:id/cancel", requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  const [bounty] = await db.select().from(bountiesTable).where(eq(bountiesTable.id, id));
  if (!bounty) {
    res.status(404).json({ error: "Bounty not found" });
    return;
  }
  if (bounty.status === "completed" || bounty.status === "cancelled") {
    res.status(409).json({ error: `Cannot cancel a bounty that is already ${bounty.status}` });
    return;
  }
  if (bounty.creatorWallet !== req.user!.id) {
    res.status(403).json({
      error: "Forbidden",
      message: "Only the creator can cancel this bounty.",
    });
    return;
  }

  const [updated] = await db
    .update(bountiesTable)
    .set({ status: "cancelled", updatedAt: new Date() })
    .where(and(
      eq(bountiesTable.id, id),
      eq(bountiesTable.creatorWallet, req.user!.id),
    ))
    .returning();

  if (!updated) {
    res.status(409).json({ error: "Bounty state changed concurrently" });
    return;
  }

  await db.insert(transactionsTable).values({
    type: "refund",
    amount: bounty.rewardAmount,
    token: bounty.rewardToken,
    toWallet: bounty.creatorWallet,
    bountyId: bounty.id,
    description: `Refund for cancelled bounty: ${bounty.title}`,
  });

  res.json({ ...updated, rewardAmount: Number(updated.rewardAmount) });
});

export default router;
