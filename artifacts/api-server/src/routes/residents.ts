import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { residentsTable } from "@workspace/db/schema";
import {
  CreateResidentBody,
  UpdateResidentBody,
  ListResidentsQueryParams,
} from "@workspace/api-zod";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

router.get("/residents", async (req, res) => {
  const query = ListResidentsQueryParams.safeParse(req.query);
  const rows = await db.select().from(residentsTable);

  const filtered = query.success && query.data.skill
    ? rows.filter((r) => {
        const skills = r.skills as string[];
        return skills.some((s) =>
          s.toLowerCase().includes(query.data.skill!.toLowerCase())
        );
      })
    : rows;

  res.json(
    filtered.map((r) => ({
      ...r,
      totalEarned: Number(r.totalEarned),
      userId: r.userId || null,
    }))
  );
});

router.post("/residents", async (req, res) => {
  const parsed = CreateResidentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [resident] = await db
    .insert(residentsTable)
    .values({
      name: parsed.data.name,
      walletAddress: parsed.data.walletAddress,
      avatar: parsed.data.avatar,
      skills: parsed.data.skills,
      floor: parsed.data.floor,
      bio: parsed.data.bio,
    })
    .returning();

  res.status(201).json({ ...resident, totalEarned: Number(resident.totalEarned), userId: resident.userId || null });
});

router.get("/residents/:id", async (req, res) => {
  const id = Number(req.params.id);
  const [resident] = await db
    .select()
    .from(residentsTable)
    .where(eq(residentsTable.id, id));
  if (!resident) {
    res.status(404).json({ error: "Resident not found" });
    return;
  }
  res.json({ ...resident, totalEarned: Number(resident.totalEarned), userId: resident.userId || null });
});

router.patch("/residents/:id", async (req, res) => {
  const id = Number(req.params.id);
  const parsed = UpdateResidentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [existing] = await db
    .select()
    .from(residentsTable)
    .where(eq(residentsTable.id, id));

  if (!existing) {
    res.status(404).json({ error: "Resident not found" });
    return;
  }

  if (existing.userId) {
    if (!req.isAuthenticated()) {
      res.status(401).json({ error: "Authentication required to update a linked profile" });
      return;
    }
    if (existing.userId !== req.user.id) {
      res.status(403).json({ error: "You can only update your own profile" });
      return;
    }
  }

  const updateData: Record<string, unknown> = {};
  if (parsed.data.name !== undefined) updateData.name = parsed.data.name;
  if (parsed.data.walletAddress !== undefined) updateData.walletAddress = parsed.data.walletAddress;
  if (parsed.data.avatar !== undefined) updateData.avatar = parsed.data.avatar;
  if (parsed.data.skills !== undefined) updateData.skills = parsed.data.skills;
  if (parsed.data.floor !== undefined) updateData.floor = parsed.data.floor;
  if (parsed.data.status !== undefined) updateData.status = parsed.data.status;
  if (parsed.data.bio !== undefined) updateData.bio = parsed.data.bio;

  const [updated] = await db
    .update(residentsTable)
    .set(updateData)
    .where(eq(residentsTable.id, id))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Resident not found" });
    return;
  }

  res.json({ ...updated, totalEarned: Number(updated.totalEarned), userId: updated.userId || null });
});

export default router;
