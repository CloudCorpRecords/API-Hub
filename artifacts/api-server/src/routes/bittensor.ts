import { Router, type IRouter } from "express";
import {
  getTaoBalance,
  getTowerSS58,
  explorerAddressUrl,
  BITTENSOR_NETWORK,
} from "../lib/bittensor";

const router: IRouter = Router();

router.get("/bittensor/tower-wallet", async (_req, res) => {
  const address = getTowerSS58();

  if (!address) {
    res.status(503).json({ error: "Tower Bittensor wallet not configured." });
    return;
  }

  try {
    const balanceInfo = await getTaoBalance(address);
    res.json({
      address,
      network: BITTENSOR_NETWORK,
      balanceTao: balanceInfo.freeBalance,
      stakedTao: balanceInfo.stakedBalance,
      totalTao: balanceInfo.balance,
      explorerUrl: explorerAddressUrl(address),
      hasCorcelKey: Boolean(process.env.CORCEL_API_KEY),
    });
  } catch (err) {
    console.error("Failed to fetch Bittensor wallet info:", err);
    res.status(500).json({ error: "Failed to fetch Bittensor wallet info." });
  }
});

export default router;
