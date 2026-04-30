import { Router } from "express";
import { db, subscriptionsTable } from "@workspace/db";
import { and, eq } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";

const router = Router();

function serialize(row: typeof subscriptionsTable.$inferSelect) {
  return {
    id: row.id,
    userId: row.userId,
    name: row.name,
    provider: row.provider,
    amount: Number(row.amount ?? 0),
    billingCycle: row.billingCycle,
    serviceLocationLabel: row.serviceLocationLabel,
    status: row.status,
    cancelUrl: row.cancelUrl,
    cancelPhone: row.cancelPhone,
    cancelEmail: row.cancelEmail,
    dismissed: row.dismissed,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

router.get("/subscriptions", requireAuth, async (req, res) => {
  const user = req.dbUser!;

  const rows = await db.query.subscriptionsTable.findMany({
    where: eq(subscriptionsTable.userId, user.id),
    orderBy: (t, { desc }) => [desc(t.createdAt)],
  });

  res.json(rows.map(serialize));
});

router.post("/subscriptions", requireAuth, async (req, res) => {
  const user = req.dbUser!;
  const body = (req.body ?? {}) as {
    name?: unknown;
    provider?: unknown;
    amount?: unknown;
    billingCycle?: unknown;
    serviceLocationLabel?: unknown;
    cancelUrl?: unknown;
    cancelPhone?: unknown;
    cancelEmail?: unknown;
  };

  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) {
    res.status(400).json({ error: "Subscription name is required" });
    return;
  }

  const amountRaw = body.amount;
  const amountNum =
    typeof amountRaw === "number"
      ? amountRaw
      : typeof amountRaw === "string"
        ? Number(amountRaw)
        : NaN;
  if (!Number.isFinite(amountNum) || amountNum < 0) {
    res.status(400).json({ error: "amount must be a non-negative number" });
    return;
  }

  const allowedCycles = ["weekly", "monthly", "quarterly", "annual"] as const;
  const cycle =
    typeof body.billingCycle === "string" &&
    (allowedCycles as readonly string[]).includes(body.billingCycle)
      ? (body.billingCycle as (typeof allowedCycles)[number])
      : "monthly";

  const optStr = (v: unknown): string | null => {
    if (typeof v !== "string") return null;
    const t = v.trim();
    return t.length === 0 ? null : t;
  };

  const [row] = await db
    .insert(subscriptionsTable)
    .values({
      userId: user.id,
      name,
      provider: optStr(body.provider),
      amount: amountNum.toFixed(2),
      billingCycle: cycle,
      serviceLocationLabel: optStr(body.serviceLocationLabel),
      status: "active",
      cancelUrl: optStr(body.cancelUrl),
      cancelPhone: optStr(body.cancelPhone),
      cancelEmail: optStr(body.cancelEmail),
      dismissed: false,
    })
    .returning();

  res.status(201).json(serialize(row));
});

router.post("/subscriptions/scan-gmail", requireAuth, async (req, res) => {
  // Stub: a full Gmail scan integration is out of scope. We respond
  // honestly with zero results so the screen doesn't crash.
  res.json({ found: 0, newlyAdded: 0 });
});

router.patch("/subscriptions/:id", requireAuth, async (req, res) => {
  const user = req.dbUser!;
  const id = parseInt(String(req.params["id"]));

  if (Number.isNaN(id)) {
    res.status(400).json({ error: "Invalid subscription id" });
    return;
  }

  const existing = await db.query.subscriptionsTable.findFirst({
    where: and(
      eq(subscriptionsTable.id, id),
      eq(subscriptionsTable.userId, user.id),
    ),
  });
  if (!existing) {
    res.status(404).json({ error: "Subscription not found" });
    return;
  }

  const body = (req.body ?? {}) as {
    name?: unknown;
    provider?: unknown;
    amount?: unknown;
    billingCycle?: unknown;
    serviceLocationLabel?: unknown;
    status?: unknown;
    cancelUrl?: unknown;
    cancelPhone?: unknown;
    cancelEmail?: unknown;
    dismissed?: unknown;
  };

  const optStr = (v: unknown): string | null | undefined => {
    if (v === undefined) return undefined;
    if (v === null) return null;
    if (typeof v !== "string") return undefined;
    const t = v.trim();
    return t.length === 0 ? null : t;
  };

  const patch: Partial<typeof subscriptionsTable.$inferInsert> = {};

  if (typeof body.name === "string" && body.name.trim()) {
    patch.name = body.name.trim();
  }

  const provider = optStr(body.provider);
  if (provider !== undefined) patch.provider = provider;

  if (body.amount !== undefined) {
    const n =
      typeof body.amount === "number"
        ? body.amount
        : typeof body.amount === "string"
          ? Number(body.amount)
          : NaN;
    if (!Number.isFinite(n) || n < 0) {
      res
        .status(400)
        .json({ error: "amount must be a non-negative number" });
      return;
    }
    patch.amount = n.toFixed(2);
  }

  const allowedCycles = ["weekly", "monthly", "quarterly", "annual"] as const;
  if (
    typeof body.billingCycle === "string" &&
    (allowedCycles as readonly string[]).includes(body.billingCycle)
  ) {
    patch.billingCycle = body.billingCycle as (typeof allowedCycles)[number];
  }

  const allowedStatus = ["active", "paused", "cancelled"] as const;
  if (
    typeof body.status === "string" &&
    (allowedStatus as readonly string[]).includes(body.status)
  ) {
    patch.status = body.status as (typeof allowedStatus)[number];
  }

  const loc = optStr(body.serviceLocationLabel);
  if (loc !== undefined) patch.serviceLocationLabel = loc;

  const cu = optStr(body.cancelUrl);
  if (cu !== undefined) patch.cancelUrl = cu;
  const cp = optStr(body.cancelPhone);
  if (cp !== undefined) patch.cancelPhone = cp;
  const ce = optStr(body.cancelEmail);
  if (ce !== undefined) patch.cancelEmail = ce;

  if (typeof body.dismissed === "boolean") patch.dismissed = body.dismissed;

  if (Object.keys(patch).length === 0) {
    res.json(serialize(existing));
    return;
  }

  patch.updatedAt = new Date();

  const [row] = await db
    .update(subscriptionsTable)
    .set(patch)
    .where(
      and(eq(subscriptionsTable.id, id), eq(subscriptionsTable.userId, user.id)),
    )
    .returning();

  res.json(serialize(row));
});

router.delete("/subscriptions/:id", requireAuth, async (req, res) => {
  const user = req.dbUser!;
  const id = parseInt(String(req.params["id"]));

  if (Number.isNaN(id)) {
    res.status(400).json({ error: "Invalid subscription id" });
    return;
  }

  await db.delete(subscriptionsTable).where(
    and(eq(subscriptionsTable.id, id), eq(subscriptionsTable.userId, user.id)),
  );

  res.status(204).send();
});

export default router;
