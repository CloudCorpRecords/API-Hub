import { Router } from "express";
import {
  registerTowerAgent,
  getTowerAgentStatus,
  AGENT_CARD_URI,
  AGENT_REGISTRY_PROGRAM,
} from "../lib/metaplex";

const router = Router();

router.get("/agent-card", (_req, res) => {
  const assetKey = process.env.TOWER_METAPLEX_ASSET ?? null;
  const baseUrl = "https://towerroad.replit.app";

  res.json({
    type: "agent-registration-v1",
    name: "Tower",
    description:
      "Tower is the AI concierge for Frontier Road, a co-living and hacker space community OS. Tower helps residents find skills, post and claim bounties, report floor issues, manage the community treasury, and coordinate resources across floors. Tower can execute real Solana SOL transfers, query Bittensor subnet AI, and take autonomous action on behalf of the community.",
    image: `${baseUrl}/tower-logo.png`,
    services: [
      {
        name: "web",
        endpoint: `${baseUrl}/chat`,
      },
      {
        name: "api",
        endpoint: `${baseUrl}/api`,
        version: "1.0.0",
      },
      {
        name: "A2A",
        endpoint: `${baseUrl}/api/agent-card`,
        version: "0.3.0",
        skills: [
          {
            id: "list_bounties",
            name: "List Bounties",
            description: "List open community bounties with USDC rewards",
          },
          {
            id: "find_residents_by_skill",
            name: "Find Residents by Skill",
            description: "Match residents by skill keyword",
          },
          {
            id: "get_residents_by_floor",
            name: "Get Residents by Floor",
            description: "List all residents on a specific floor",
          },
          {
            id: "get_treasury_status",
            name: "Get Treasury Status",
            description: "Live treasury balance and escrow overview",
          },
          {
            id: "report_floor_issue",
            name: "Report Floor Issue",
            description: "Create a maintenance bounty for a floor issue",
          },
          {
            id: "get_wallet_balance",
            name: "Get Wallet Balance",
            description: "Query any Solana wallet SOL balance",
          },
          {
            id: "execute_solana_transfer",
            name: "Execute Solana Transfer",
            description: "Sign and broadcast SOL transfer from Tower wallet",
          },
          {
            id: "get_tao_balance",
            name: "Get TAO Balance",
            description: "Query Bittensor TAO wallet balance",
          },
          {
            id: "execute_tao_transfer",
            name: "Execute TAO Transfer",
            description: "Record TAO payout from Tower Bittensor wallet",
          },
          {
            id: "query_bittensor_subnet",
            name: "Query Bittensor Subnet",
            description:
              "Send prompt to decentralized Bittensor AI subnet (Subnet 64 via Chutes.ai)",
          },
        ],
        domains: ["community-coordination", "defi", "bounty-marketplace"],
      },
    ],
    active: true,
    registrations: assetKey
      ? [
          {
            agentId: assetKey,
            agentRegistry: `solana:${process.env.SOLANA_NETWORK ?? "devnet"}:${AGENT_REGISTRY_PROGRAM}`,
          },
        ]
      : [],
    supportedTrust: ["reputation", "crypto-economic"],
    wallet: {
      solana: process.env.TOWER_SOLANA_PUBKEY ?? null,
      bittensor: process.env.TOWER_BITTENSOR_SS58 ?? null,
    },
  });
});

router.get("/metaplex/tower-agent", async (_req, res) => {
  try {
    const status = await getTowerAgentStatus();
    res.json(status);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/metaplex/register", async (_req, res) => {
  try {
    if (process.env.TOWER_METAPLEX_ASSET) {
      const status = await getTowerAgentStatus();
      return res.json({
        already_registered: true,
        ...status,
        message: `Tower already registered. Asset: ${process.env.TOWER_METAPLEX_ASSET}`,
      });
    }
    const result = await registerTowerAgent();
    res.json({
      success: true,
      ...result,
      agentCardUri: AGENT_CARD_URI,
      next_step: `Set TOWER_METAPLEX_ASSET=${result.assetPublicKey} in Replit Secrets, then restart the server`,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
