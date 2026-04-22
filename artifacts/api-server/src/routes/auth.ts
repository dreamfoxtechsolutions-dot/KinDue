import { Router } from "express";
import { db, usersTable, notificationSettingsTable, pushTokensTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";

const router = Router();

router.get("/me", requireAuth, async (req, res) => {
  const user = req.dbUser!;
  res.json({
    id: user.id,
    clerkUserId: user.clerkUserId,
    email: user.email,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  });
});

router.patch("/me", requireAuth, async (req, res) => {
  const user = req.dbUser!;
  const { displayName, avatarUrl } = req.body;

  const [updated] = await db
    .update(usersTable)
    .set({
      displayName: displayName ?? user.displayName,
      avatarUrl: avatarUrl ?? user.avatarUrl,
      updatedAt: new Date(),
    })
    .where(eq(usersTable.id, user.id))
    .returning();

  res.json(updated);
});

router.get("/me/notification-settings", requireAuth, async (req, res) => {
  const user = req.dbUser!;
  let settings = await db.query.notificationSettingsTable.findFirst({
    where: eq(notificationSettingsTable.userId, user.id),
  });

  if (!settings) {
    const [created] = await db
      .insert(notificationSettingsTable)
      .values({ userId: user.id })
      .returning();
    settings = created;
  }

  res.json(settings);
});

router.patch("/me/notification-settings", requireAuth, async (req, res) => {
  const user = req.dbUser!;
  const updates = req.body;

  const existing = await db.query.notificationSettingsTable.findFirst({
    where: eq(notificationSettingsTable.userId, user.id),
  });

  if (!existing) {
    const [created] = await db
      .insert(notificationSettingsTable)
      .values({ userId: user.id, ...updates })
      .returning();
    return res.json(created);
  }

  const [updated] = await db
    .update(notificationSettingsTable)
    .set({ ...updates, updatedAt: new Date() })
    .where(eq(notificationSettingsTable.userId, user.id))
    .returning();

  res.json(updated);
});

router.post("/me/push-tokens", requireAuth, async (req, res) => {
  const user = req.dbUser!;
  const { token, platform } = req.body;

  const existing = await db.query.pushTokensTable.findFirst({
    where: eq(pushTokensTable.token, token),
  });

  if (existing) {
    return res.status(201).json(existing);
  }

  const [created] = await db
    .insert(pushTokensTable)
    .values({ userId: user.id, token, platform })
    .returning();

  res.status(201).json(created);
});

router.delete("/me/push-tokens/:token", requireAuth, async (req, res) => {
  const { token } = req.params;
  await db.delete(pushTokensTable).where(eq(pushTokensTable.token, token));
  res.status(204).send();
});

router.post("/me/re-authenticate", requireAuth, async (req, res) => {
  const sensitiveToken = `sat_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  res.json({ token: sensitiveToken, expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString() });
});

export default router;
