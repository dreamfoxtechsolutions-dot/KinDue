import { Router } from "express";
import { db, usersTable, notificationSettingsTable, pushTokensTable } from "@workspace/db";
import { and, eq } from "drizzle-orm";
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
  const { displayName, avatarUrl } = req.body as { displayName?: string; avatarUrl?: string };

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
  const updates = req.body as Record<string, unknown>;

  const existing = await db.query.notificationSettingsTable.findFirst({
    where: eq(notificationSettingsTable.userId, user.id),
  });

  if (!existing) {
    const [created] = await db
      .insert(notificationSettingsTable)
      .values({ userId: user.id, ...updates })
      .returning();
    res.json(created);
    return;
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
  const { token, platform } = req.body as { token: string; platform: string };
  const validPlatforms = ["ios", "android", "web"] as const;
  type Platform = (typeof validPlatforms)[number];
  const safePlatform = (validPlatforms.includes(platform as Platform) ? platform : "web") as Platform;

  const existing = await db.query.pushTokensTable.findFirst({
    where: eq(pushTokensTable.token, token),
  });

  if (existing) {
    res.status(201).json(existing);
    return;
  }

  const [created] = await db
    .insert(pushTokensTable)
    .values({ userId: user.id, token, platform: safePlatform })
    .returning();

  res.status(201).json(created);
});

router.delete("/me/push-tokens/:token", requireAuth, async (req, res) => {
  const token = String(req.params["token"]);
  const user = req.dbUser!;
  await db.delete(pushTokensTable).where(
    and(eq(pushTokensTable.token, token), eq(pushTokensTable.userId, user.id))
  );
  res.status(204).send();
});

export default router;
