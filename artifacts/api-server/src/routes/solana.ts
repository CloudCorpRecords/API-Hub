import { Router, type IRouter } from "express";
import {
  connection,
  getSolBalance,
  getTowerPublicKey,
  explorerAddressUrl,
  SOLANA_NETWORK,
  SOLANA_RPC,
} from "../lib/solana";

const router: IRouter = Router();

router.get("/solana/tower-wallet", async (_req, res) => {
  try {
    const address = getTowerPublicKey();
    if (!address) {
      res.status(503).json({ error: "Tower Solana wallet not configured." });
      return;
    }

    const balance = await getSolBalance(address);
    const slot = await connection.getSlot();

    res.json({
      address,
      network: SOLANA_NETWORK,
      rpc: SOLANA_RPC,
      balanceSol: balance,
      explorerUrl: explorerAddressUrl(address),
      slot,
    });
  } catch (err: any) {
    console.error("Solana tower-wallet error:", err);
    res.status(500).json({ error: "Failed to fetch Solana wallet info.", detail: err?.message });
  }
});

export default router;
