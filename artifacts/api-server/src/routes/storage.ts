import { Router, type IRouter, type Request, type Response } from "express";
import { Readable } from "stream";
import { ObjectStorageService, ObjectNotFoundError } from "../lib/objectStorage";
import { requireAuth } from "../middlewares/requireAuth";
import { db, documentsTable, receiptsTable, billsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { getMemberRole } from "../lib/memberGuard";

const router: IRouter = Router();
const objectStorageService = new ObjectStorageService();

router.post("/storage/uploads/request-url", requireAuth, async (req: Request, res: Response) => {
  const { name, size, contentType } = req.body;
  if (!name || size == null || !contentType) {
    res.status(400).json({ error: "Missing required fields: name, size, contentType" });
    return;
  }

  try {
    const uploadURL = await objectStorageService.getObjectEntityUploadURL();
    const objectPath = objectStorageService.normalizeObjectEntityPath(uploadURL);

    res.json({ uploadURL, objectPath, metadata: { name, size, contentType } });
  } catch (error) {
    req.log.error({ err: error }, "Error generating upload URL");
    res.status(500).json({ error: "Failed to generate upload URL" });
  }
});

router.get("/storage/public-objects/*filePath", async (req: Request, res: Response) => {
  try {
    const raw = req.params.filePath;
    const filePath = Array.isArray(raw) ? raw.join("/") : raw;
    const file = await objectStorageService.searchPublicObject(filePath);
    if (!file) {
      res.status(404).json({ error: "File not found" });
      return;
    }

    const response = await objectStorageService.downloadObject(file);
    res.status(response.status);
    response.headers.forEach((value, key) => res.setHeader(key, value));

    if (response.body) {
      const nodeStream = Readable.fromWeb(response.body as ReadableStream<Uint8Array>);
      nodeStream.pipe(res);
    } else {
      res.end();
    }
  } catch (error) {
    req.log.error({ err: error }, "Error serving public object");
    res.status(500).json({ error: "Failed to serve public object" });
  }
});

async function resolveHouseholdForStorageKey(storageKey: string): Promise<number | null> {
  const doc = await db.query.documentsTable.findFirst({
    where: eq(documentsTable.storageKey, storageKey),
    columns: { householdId: true },
  });
  if (doc) return doc.householdId;

  const receipt = await db.query.receiptsTable.findFirst({
    where: eq(receiptsTable.storageKey, storageKey),
    columns: { billId: true },
  });
  if (!receipt) return null;

  const bill = await db.query.billsTable.findFirst({
    where: eq(billsTable.id, receipt.billId),
    columns: { householdId: true },
  });
  return bill?.householdId ?? null;
}

router.get("/storage/objects/*path", requireAuth, async (req: Request, res: Response) => {
  try {
    const raw = req.params.path;
    const wildcardPath = Array.isArray(raw) ? raw.join("/") : raw;
    const objectPath = `/objects/${wildcardPath}`;
    const user = req.dbUser!;

    const householdId = await resolveHouseholdForStorageKey(objectPath);
    if (householdId === null) {
      req.log.warn({ objectPath }, "Object not registered in documents or receipts");
      res.status(404).json({ error: "Object not found" });
      return;
    }

    const role = await getMemberRole(householdId, user.id);
    if (!role) {
      res.status(403).json({ error: "Access denied" });
      return;
    }

    const objectFile = await objectStorageService.getObjectEntityFile(objectPath);
    const response = await objectStorageService.downloadObject(objectFile);
    res.status(response.status);
    response.headers.forEach((value, key) => res.setHeader(key, value));

    if (response.body) {
      const nodeStream = Readable.fromWeb(response.body as ReadableStream<Uint8Array>);
      nodeStream.pipe(res);
    } else {
      res.end();
    }
  } catch (error) {
    if (error instanceof ObjectNotFoundError) {
      req.log.warn({ err: error }, "Object not found");
      res.status(404).json({ error: "Object not found" });
      return;
    }
    req.log.error({ err: error }, "Error serving object");
    res.status(500).json({ error: "Failed to serve object" });
  }
});

export default router;
