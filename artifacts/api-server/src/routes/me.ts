import { Router, type IRouter, type Request, type Response } from "express";
import { db, residentsTable } from "@workspace/db";
import { UpdateResidentBody } from "@workspace/api-zod";
import { eq, and, isNull } from "drizzle-orm";

const router: IRouter = Router();

router.get("/me", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const user = req.user;

  const [resident] = await db
    .select()
    .from(residentsTable)
    .where(eq(residentsTable.userId, user.id));

  res.json({
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      profileImageUrl: user.profileImageUrl,
    },
    resident: resident
      ? { ...resident, totalEarned: Number(resident.totalEarned) }
      : null,
  });
});

router.patch("/me", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const user = req.user;

  const [resident] = await db
    .select()
    .from(residentsTable)
    .where(eq(residentsTable.userId, user.id));

  if (!resident) {
    res.status(404).json({ error: "No resident profile linked to this account" });
    return;
  }

  const parsed = UpdateResidentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updateData: Record<string, unknown> = {};
  if (parsed.data.skills !== undefined) updateData.skills = parsed.data.skills;
  if (parsed.data.bio !== undefined) updateData.bio = parsed.data.bio;
  if (parsed.data.floor !== undefined) updateData.floor = parsed.data.floor;
  if (parsed.data.status !== undefined) updateData.status = parsed.data.status;
  if (parsed.data.walletAddress !== undefined) updateData.walletAddress = parsed.data.walletAddress;
  if (parsed.data.name !== undefined) updateData.name = parsed.data.name;

  if (Object.keys(updateData).length === 0) {
    res.json({ ...resident, totalEarned: Number(resident.totalEarned) });
    return;
  }

  const [updated] = await db
    .update(residentsTable)
    .set(updateData)
    .where(eq(residentsTable.id, resident.id))
    .returning();

  res.json({ ...updated, totalEarned: Number(updated.totalEarned) });
});

router.post("/me/link-resident/:residentId", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const user = req.user;
  const residentId = Number(req.params.residentId);

  if (isNaN(residentId)) {
    res.status(400).json({ error: "Invalid resident ID" });
    return;
  }

  const [target] = await db
    .select()
    .from(residentsTable)
    .where(eq(residentsTable.id, residentId));

  if (!target) {
    res.status(404).json({ error: "Resident not found" });
    return;
  }

  if (target.userId && target.userId !== user.id) {
    res.status(409).json({ error: "This resident is already linked to another account" });
    return;
  }

  if (target.userId === user.id) {
    res.json({ ...target, totalEarned: Number(target.totalEarned) });
    return;
  }

  const [existingLinked] = await db
    .select()
    .from(residentsTable)
    .where(eq(residentsTable.userId, user.id));

  if (existingLinked && existingLinked.id !== residentId) {
    await db
      .update(residentsTable)
      .set({ userId: null, linkedAt: null })
      .where(eq(residentsTable.id, existingLinked.id));
  }

  const [updated] = await db
    .update(residentsTable)
    .set({
      userId: user.id,
      linkedAt: new Date(),
      avatar: target.avatar || req.user.profileImageUrl || null,
    })
    .where(and(eq(residentsTable.id, residentId), isNull(residentsTable.userId)))
    .returning();

  if (!updated) {
    res.status(409).json({ error: "This resident was just linked to another account" });
    return;
  }

  res.json({ ...updated, totalEarned: Number(updated.totalEarned) });
});

export default router;
