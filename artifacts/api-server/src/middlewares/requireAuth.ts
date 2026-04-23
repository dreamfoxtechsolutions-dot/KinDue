import { type Request, type Response, type NextFunction } from "express";
import { getAuth } from "@clerk/express";
import { db, usersTable, notificationSettingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

declare global {
  namespace Express {
    interface Request {
      dbUser?: typeof usersTable.$inferSelect;
    }
  }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const { userId } = getAuth(req);

  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    let user = await db.query.usersTable.findFirst({
      where: eq(usersTable.clerkUserId, userId),
    });

    if (!user) {
      const clerkUser = await (await import("@clerk/express")).clerkClient.users.getUser(userId);
      const email = clerkUser.emailAddresses[0]?.emailAddress ?? "";
      const displayName = `${clerkUser.firstName ?? ""} ${clerkUser.lastName ?? ""}`.trim() || null;
      const avatarUrl = clerkUser.imageUrl || null;

      const [upserted] = await db
        .insert(usersTable)
        .values({ clerkUserId: userId, email, displayName, avatarUrl })
        .onConflictDoUpdate({
          target: usersTable.clerkUserId,
          set: { displayName, avatarUrl, updatedAt: new Date() },
        })
        .returning();

      try {
        await db.insert(notificationSettingsTable).values({ userId: upserted.id });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        if (!msg.includes("duplicate key") && !msg.includes("unique constraint")) {
          req.log?.warn({ err }, "Unexpected error inserting notification settings");
        }
      }

      user = upserted;
    }

    req.dbUser = user;
    next();
  } catch (err) {
    req.log?.error({ err }, "requireAuth failed");
    res.status(500).json({ error: "Internal server error" });
  }
}
