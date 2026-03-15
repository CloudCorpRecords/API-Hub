import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import bountiesRouter from "./bounties";
import residentsRouter from "./residents";
import treasuryRouter from "./treasury";
import openaiRouter from "./openai";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(bountiesRouter);
router.use(residentsRouter);
router.use(treasuryRouter);
router.use(openaiRouter);

export default router;
