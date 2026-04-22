import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import householdsRouter from "./households";
import billsRouter from "./bills";
import documentsRouter from "./documents";
import triageRouter from "./triage";
import gmailRouter from "./gmail";
import plaidRouter from "./plaid";
import auditRouter from "./audit";
import storageRouter from "./storage";

const router: IRouter = Router();

router.use(healthRouter);
router.use(storageRouter);
router.use(authRouter);
router.use(householdsRouter);
router.use(billsRouter);
router.use(documentsRouter);
router.use(triageRouter);
router.use(gmailRouter);
router.use(plaidRouter);
router.use(auditRouter);

export default router;
