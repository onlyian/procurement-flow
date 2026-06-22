import { Router, type IRouter } from "express";
import healthRouter from "./health";
import departmentsRouter from "./departments";
import inventoryRouter from "./inventory";
import requestsRouter from "./requests";
import transactionsRouter from "./transactions";
import analyticsRouter from "./analytics";
import webhookRouter from "./webhook";

const router: IRouter = Router();

router.use(healthRouter);
router.use(departmentsRouter);
router.use(inventoryRouter);
router.use(requestsRouter);
router.use(transactionsRouter);
router.use(analyticsRouter);
router.use(webhookRouter);

export default router;
