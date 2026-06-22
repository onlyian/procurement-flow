import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { departmentsTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/departments", async (req, res): Promise<void> => {
  const departments = await db.select().from(departmentsTable).orderBy(departmentsTable.name);
  res.json(departments);
});

export default router;
