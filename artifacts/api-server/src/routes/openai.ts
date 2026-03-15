import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  conversations as conversationsTable,
  messages as messagesTable,
  bountiesTable,
  residentsTable,
  transactionsTable,
} from "@workspace/db/schema";
import {
  CreateOpenaiConversationBody,
  SendOpenaiMessageBody,
} from "@workspace/api-zod";
import { openai } from "@workspace/integrations-openai-ai-server";
import { eq, asc, desc, sql } from "drizzle-orm";
import type { ChatCompletionMessageParam, ChatCompletionToolMessageParam, ChatCompletionAssistantMessageParam } from "openai/resources/chat/completions";
import { requireAuth } from "../middlewares/requireAuth";
import { towerAiMessageLimiter } from "../middlewares/rateLimiter";
import {
  getSolBalance,
  getTowerKeypair,
  getTowerPublicKey,
  transferSol,
  explorerTxUrl,
  explorerAddressUrl,
  SOLANA_NETWORK,
} from "../lib/solana";
import {
  getTaoBalance,
  getTowerSS58,
  getTowerPair as getBittensorPair,
  explorerAddressUrl as bittensorExplorerUrl,
  queryBittensorSubnet,
  BITTENSOR_NETWORK,
} from "../lib/bittensor";

type PendingToolCall = {
  id: string;
  name: string;
  arguments: string;
};

const router: IRouter = Router();

const BASE_SYSTEM_PROMPT = `You are "Tower", the AI concierge for Frontier Road — a co-living hacker house and community OS.

## Your Role
You are the building's intelligent assistant. You have direct access to the Frontier Road database through tool calls. You can look up real data and take actions on behalf of residents.

## What You Can Do
1. **List bounties** — Search open, claimed, or completed bounties. Filter by status, category (DEV, DESIGN, MAINTENANCE, COMMUNITY, OTHER), or floor number.
   - Example user asks: "what bounties are open?", "show me maintenance tasks on floor 2", "any dev bounties?"
2. **Find residents by skill** — Search for residents who have a specific skill (networking, Rust, plumbing, cooking, React, etc.).
   - Example: "who knows Rust?", "find someone who can fix WiFi", "who does design?"
3. **Get residents by floor** — See who lives on a specific floor, their status, and skills.
   - Example: "who's on floor 3?", "show me floor 1 residents"
4. **Check treasury** — Get the live treasury balance, escrow amounts, payouts, and active bounty count.
   - Example: "how much is in the treasury?", "what's our balance?"
5. **Report a floor issue** — Create a MAINTENANCE bounty for a reported problem (broken heater, leaky pipe, etc.).
   - Example: "report a broken heater on floor 2", "the kitchen sink on floor 1 is clogged"
6. **Check Solana wallet balance** — Query any resident's SOL balance on Solana ${SOLANA_NETWORK}.
   - Example: "what's my wallet balance?", "check wallet BG2Yd...", "how much SOL does floor 3 have?"
7. **Send SOL on-chain** — Execute a real Solana transfer from Tower's wallet to a resident's wallet as bounty payment.
   - Example: "pay out bounty #5 to wallet ABC...", "send 0.1 SOL to resident wallet"
   - Only use this when explicitly asked to send a payment. Always confirm the recipient address and amount before transferring.
8. **Check TAO (Bittensor) wallet balance** — Query any Bittensor wallet's TAO balance on the ${BITTENSOR_NETWORK} network.
   - Example: "what's my TAO balance?", "check bittensor wallet 5F...", "how much TAO does Tower have?"
9. **Send TAO on-chain** — Execute a real TAO transfer from Tower's Bittensor wallet. Only use when explicitly instructed.
   - Example: "pay 0.1 TAO to 5F... for completing the bounty"
10. **Query Bittensor AI subnet** — Send a question to the Bittensor decentralized AI network (subnet 18 via Corcel) for a second opinion or specialized knowledge.
    - Example: "ask the Bittensor network about Rust best practices", "what does the decentralized AI say about this?"

## How to Respond
- Be concise and direct. Use short sentences.
- When returning lists (bounties, residents), format them clearly with bullet points or numbered items.
- Always use your tools to get real data — never guess or make up numbers.
- If a request is outside your capabilities (editing existing data, sending notifications, voice/image), explain what you can't do and suggest an alternative.
- If a request is ambiguous (e.g. "find someone" without specifying a skill), ask a brief clarifying question before calling a tool.
- The community uses USDC for bounty payments.
- When reporting issues, confirm what was created and the bounty ID.

## Current Community Snapshot
{{LIVE_CONTEXT}}
`;

const TOOL_DEFINITIONS = [
  {
    type: "function" as const,
    function: {
      name: "list_bounties",
      description: "List bounties from the Frontier Road bounty board. Can filter by status, category, and floor number.",
      parameters: {
        type: "object",
        properties: {
          status: {
            type: "string",
            enum: ["open", "claimed", "completed", "cancelled"],
            description: "Filter by bounty status. Omit to return all statuses.",
          },
          category: {
            type: "string",
            enum: ["DEV", "DESIGN", "MAINTENANCE", "COMMUNITY", "OTHER"],
            description: "Filter by bounty category.",
          },
          floor: {
            type: "number",
            description: "Filter bounties that mention this floor number in their title or description.",
          },
        },
        required: [],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "find_residents_by_skill",
      description: "Find residents whose skills match a search query. Useful for 'who can fix X' or 'who knows Y' questions.",
      parameters: {
        type: "object",
        properties: {
          skill: {
            type: "string",
            description: "The skill to search for (e.g. 'Rust', 'networking', 'plumbing', 'React').",
          },
        },
        required: ["skill"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_residents_by_floor",
      description: "Get all residents on a specific floor with their status and skills.",
      parameters: {
        type: "object",
        properties: {
          floor: {
            type: "number",
            description: "The floor number to look up.",
          },
        },
        required: ["floor"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_treasury_status",
      description: "Get the current treasury status including total balance, pending escrow, total paid out, and active bounty count.",
      parameters: {
        type: "object",
        properties: {},
        required: [],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "report_floor_issue",
      description: "Report a maintenance issue on a specific floor. Creates a MAINTENANCE bounty automatically.",
      parameters: {
        type: "object",
        properties: {
          floor: {
            type: "number",
            description: "The floor number where the issue is.",
          },
          location: {
            type: "string",
            description: "Specific location (e.g. 'kitchen', 'bathroom', 'hallway', 'room 3B').",
          },
          description: {
            type: "string",
            description: "Description of the issue.",
          },
          urgency: {
            type: "string",
            enum: ["low", "medium", "high", "critical"],
            description: "How urgent the issue is. Defaults to medium.",
          },
        },
        required: ["floor", "location", "description"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_wallet_balance",
      description: "Check the SOL balance of any Solana wallet address on devnet. Use this when residents ask about their wallet balance or when verifying a recipient before sending payment.",
      parameters: {
        type: "object",
        properties: {
          wallet_address: {
            type: "string",
            description: "The Solana wallet address (base58-encoded public key) to check.",
          },
        },
        required: ["wallet_address"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "execute_solana_transfer",
      description: "Send SOL from Tower AI's devnet wallet to a resident's Solana wallet as a bounty payout or reward. This executes a real on-chain transaction on Solana devnet. Only use this when explicitly instructed to send a payment.",
      parameters: {
        type: "object",
        properties: {
          recipient_wallet: {
            type: "string",
            description: "The recipient's Solana wallet address (base58-encoded public key).",
          },
          amount_sol: {
            type: "number",
            description: "Amount of SOL to send (e.g. 0.05 for a small bounty, 0.1 for a larger one).",
          },
          reason: {
            type: "string",
            description: "Description of why this payment is being sent (e.g. 'Bounty #12 payout — fixed elevator sensor').",
          },
        },
        required: ["recipient_wallet", "amount_sol", "reason"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_tao_balance",
      description: "Check the TAO balance of any Bittensor wallet address. Use this when residents ask about their TAO balance, or when verifying Tower's own Bittensor wallet.",
      parameters: {
        type: "object",
        properties: {
          wallet_address: {
            type: "string",
            description: "The Bittensor wallet SS58 address (starts with '5'). Use 'tower' to check Tower's own Bittensor wallet.",
          },
        },
        required: ["wallet_address"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "execute_tao_transfer",
      description: "Send TAO from Tower AI's Bittensor wallet to a resident's wallet as a bounty payout or reward. This executes a real on-chain Bittensor transfer. Only use when explicitly instructed to send a payment.",
      parameters: {
        type: "object",
        properties: {
          recipient_wallet: {
            type: "string",
            description: "The recipient's Bittensor SS58 wallet address (starts with '5').",
          },
          amount_tao: {
            type: "number",
            description: "Amount of TAO to send (e.g. 0.01 for a small bounty).",
          },
          reason: {
            type: "string",
            description: "Description of why this payment is being sent.",
          },
        },
        required: ["recipient_wallet", "amount_tao", "reason"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "query_bittensor_subnet",
      description: "Send a query to the Bittensor decentralized AI network (subnet 18 via Corcel). Use this for second opinions, specialized AI knowledge, or when asked to consult the Bittensor network.",
      parameters: {
        type: "object",
        properties: {
          prompt: {
            type: "string",
            description: "The question or prompt to send to the Bittensor AI subnet.",
          },
        },
        required: ["prompt"],
      },
    },
  },
];

const TOOL_STATUS_LABELS: Record<string, string> = {
  list_bounties: "Querying bounty board...",
  find_residents_by_skill: "Looking up residents...",
  get_residents_by_floor: "Checking floor roster...",
  get_treasury_status: "Checking treasury...",
  report_floor_issue: "Creating maintenance report...",
  get_wallet_balance: "Checking Solana wallet...",
  execute_solana_transfer: "Executing on-chain transfer...",
  get_tao_balance: "Checking Bittensor wallet...",
  execute_tao_transfer: "Executing TAO transfer on-chain...",
  query_bittensor_subnet: "Querying Bittensor AI subnet...",
};

async function getLiveContext(): Promise<string> {
  try {
    const [openBountyCount] = await db
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(bountiesTable)
      .where(eq(bountiesTable.status, "open"));

    const [claimedBountyCount] = await db
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(bountiesTable)
      .where(eq(bountiesTable.status, "claimed"));

    const [depositResult] = await db
      .select({
        total: sql<string>`COALESCE(SUM(CASE WHEN type = 'deposit' THEN amount::numeric ELSE 0 END), 0)`,
      })
      .from(transactionsTable);
    const [paidResult] = await db
      .select({
        total: sql<string>`COALESCE(SUM(CASE WHEN type = 'payout' THEN amount::numeric ELSE 0 END), 0)`,
      })
      .from(transactionsTable);
    const treasuryBalance = Number(depositResult?.total ?? 0) - Number(paidResult?.total ?? 0);

    const allResidents = await db.select().from(residentsTable);
    const onlineCount = allResidents.filter(r => r.status === "online").length;

    const recentTx = await db
      .select()
      .from(transactionsTable)
      .orderBy(desc(transactionsTable.createdAt))
      .limit(3);

    const txSummary = recentTx.length > 0
      ? recentTx.map(t => `  - ${t.type}: ${t.amount} ${t.token} — ${t.description}`).join("\n")
      : "  No recent transactions.";

    return `- Open bounties: ${openBountyCount?.count ?? 0}
- In-progress (claimed) bounties: ${claimedBountyCount?.count ?? 0}
- Treasury balance: ${treasuryBalance.toLocaleString()} USDC
- Residents: ${allResidents.length} total, ${onlineCount} online
- Recent transactions:
${txSummary}`;
  } catch (e) {
    console.error("Failed to build live context:", e);
    return "- Live context unavailable.";
  }
}

function validateToolArgs(name: string, args: Record<string, unknown>): { valid: true } | { valid: false; error: string } {
  switch (name) {
    case "find_residents_by_skill":
      if (!args.skill || typeof args.skill !== "string") {
        return { valid: false, error: "Missing required parameter: skill (string)" };
      }
      return { valid: true };
    case "get_residents_by_floor":
      if (args.floor === undefined || typeof args.floor !== "number") {
        return { valid: false, error: "Missing required parameter: floor (number)" };
      }
      return { valid: true };
    case "report_floor_issue":
      if (args.floor === undefined || typeof args.floor !== "number") {
        return { valid: false, error: "Missing required parameter: floor (number)" };
      }
      if (!args.location || typeof args.location !== "string") {
        return { valid: false, error: "Missing required parameter: location (string)" };
      }
      if (!args.description || typeof args.description !== "string") {
        return { valid: false, error: "Missing required parameter: description (string)" };
      }
      return { valid: true };
    case "get_wallet_balance":
      if (!args.wallet_address || typeof args.wallet_address !== "string") {
        return { valid: false, error: "Missing required parameter: wallet_address (string)" };
      }
      return { valid: true };
    case "execute_solana_transfer":
      if (!args.recipient_wallet || typeof args.recipient_wallet !== "string") {
        return { valid: false, error: "Missing required parameter: recipient_wallet (string)" };
      }
      if (args.amount_sol === undefined || typeof args.amount_sol !== "number") {
        return { valid: false, error: "Missing required parameter: amount_sol (number)" };
      }
      return { valid: true };
    case "get_tao_balance":
      if (!args.wallet_address || typeof args.wallet_address !== "string") {
        return { valid: false, error: "Missing required parameter: wallet_address (string)" };
      }
      return { valid: true };
    case "execute_tao_transfer":
      if (!args.recipient_wallet || typeof args.recipient_wallet !== "string") {
        return { valid: false, error: "Missing required parameter: recipient_wallet (string)" };
      }
      if (args.amount_tao === undefined || typeof args.amount_tao !== "number") {
        return { valid: false, error: "Missing required parameter: amount_tao (number)" };
      }
      return { valid: true };
    case "query_bittensor_subnet":
      if (!args.prompt || typeof args.prompt !== "string") {
        return { valid: false, error: "Missing required parameter: prompt (string)" };
      }
      return { valid: true };
    default:
      return { valid: true };
  }
}

async function executeToolCall(name: string, args: Record<string, unknown>): Promise<string> {
  const validation = validateToolArgs(name, args);
  if (!validation.valid) {
    return JSON.stringify({ error: validation.error });
  }

  try {
    switch (name) {
      case "list_bounties": {
        let rows = await db
          .select()
          .from(bountiesTable)
          .orderBy(desc(bountiesTable.createdAt));

        if (args.status && typeof args.status === "string") {
          rows = rows.filter(r => r.status === args.status);
        }
        if (args.category && typeof args.category === "string") {
          rows = rows.filter(r => r.category === args.category);
        }
        if (args.floor && typeof args.floor === "number") {
          const floorStr = String(args.floor);
          rows = rows.filter(r =>
            r.title.toLowerCase().includes(`floor ${floorStr}`) ||
            r.description.toLowerCase().includes(`floor ${floorStr}`)
          );
        }

        if (rows.length === 0) {
          return JSON.stringify({ results: [], message: "No bounties found matching those filters." });
        }

        return JSON.stringify({
          count: rows.length,
          bounties: rows.slice(0, 25).map(b => ({
            id: b.id,
            title: b.title,
            description: b.description.slice(0, 150),
            reward: `${Number(b.rewardAmount)} ${b.rewardToken}`,
            status: b.status,
            category: b.category,
            creator: b.creatorWallet,
            claimer: b.claimerWallet,
          })),
        });
      }

      case "find_residents_by_skill": {
        const skill = (args.skill as string).toLowerCase();
        const allResidents = await db.select().from(residentsTable);
        const matched = allResidents.filter(r => {
          const skills = r.skills as string[];
          return skills.some(s => s.toLowerCase().includes(skill));
        });

        if (matched.length === 0) {
          return JSON.stringify({ results: [], message: `No residents found with skill matching "${args.skill}".` });
        }

        return JSON.stringify({
          count: matched.length,
          residents: matched.map(r => ({
            id: r.id,
            name: r.name,
            floor: r.floor,
            status: r.status,
            skills: r.skills,
            bio: r.bio?.slice(0, 100),
          })),
        });
      }

      case "get_residents_by_floor": {
        const floor = args.floor as number;
        const allResidents = await db.select().from(residentsTable);
        const onFloor = allResidents.filter(r => r.floor === floor);

        if (onFloor.length === 0) {
          return JSON.stringify({ results: [], message: `No residents found on floor ${floor}.` });
        }

        return JSON.stringify({
          floor,
          count: onFloor.length,
          residents: onFloor.map(r => ({
            id: r.id,
            name: r.name,
            status: r.status,
            skills: r.skills,
            bountiesCompleted: r.bountiesCompleted,
          })),
        });
      }

      case "get_treasury_status": {
        const [escrowResult] = await db
          .select({
            total: sql<string>`COALESCE(SUM(CASE WHEN type = 'escrow_lock' THEN amount::numeric ELSE 0 END) - SUM(CASE WHEN type IN ('payout', 'refund') THEN amount::numeric ELSE 0 END), 0)`,
          })
          .from(transactionsTable);

        const [depositResult] = await db
          .select({
            total: sql<string>`COALESCE(SUM(CASE WHEN type = 'deposit' THEN amount::numeric ELSE 0 END), 0)`,
          })
          .from(transactionsTable);

        const [paidResult] = await db
          .select({
            total: sql<string>`COALESCE(SUM(CASE WHEN type = 'payout' THEN amount::numeric ELSE 0 END), 0)`,
          })
          .from(transactionsTable);

        const [activeBounties] = await db
          .select({ count: sql<number>`COUNT(*)::int` })
          .from(bountiesTable)
          .where(sql`status IN ('open', 'claimed')`);

        return JSON.stringify({
          totalBalance: Number(depositResult?.total ?? 0) - Number(paidResult?.total ?? 0),
          pendingEscrow: Number(escrowResult?.total ?? 0),
          totalPaidOut: Number(paidResult?.total ?? 0),
          activeBounties: activeBounties?.count ?? 0,
          currency: "USDC",
        });
      }

      case "report_floor_issue": {
        const floor = args.floor as number;
        const location = args.location as string;
        const description = args.description as string;
        const urgency = (typeof args.urgency === "string" ? args.urgency : "medium");

        const rewardMap: Record<string, number> = {
          low: 10,
          medium: 25,
          high: 50,
          critical: 100,
        };
        const reward = rewardMap[urgency] || 25;

        const [bounty] = await db
          .insert(bountiesTable)
          .values({
            title: `[Floor ${floor}] ${location} — ${description.slice(0, 60)}`,
            description: `Maintenance issue reported via Tower AI.\n\nFloor: ${floor}\nLocation: ${location}\nDescription: ${description}\nUrgency: ${urgency}`,
            rewardAmount: String(reward),
            rewardToken: "USDC",
            category: "MAINTENANCE",
            creatorWallet: "tower-ai",
          })
          .returning();

        await db.insert(transactionsTable).values({
          type: "escrow_lock",
          amount: String(reward),
          token: "USDC",
          fromWallet: "tower-ai",
          bountyId: bounty.id,
          description: `Escrow for Tower-reported issue: ${bounty.title}`,
        });

        return JSON.stringify({
          success: true,
          bountyId: bounty.id,
          title: bounty.title,
          reward: `${reward} USDC`,
          urgency,
          message: `Maintenance bounty #${bounty.id} created for floor ${floor}.`,
        });
      }

      case "get_wallet_balance": {
        const address = args.wallet_address as string;
        if (!address || typeof address !== "string") {
          return JSON.stringify({ error: "Missing wallet_address parameter." });
        }
        try {
          const balance = await getSolBalance(address);
          const explorerUrl = explorerAddressUrl(address);
          const towerAddress = getTowerPublicKey();
          const isTowerWallet = towerAddress === address;
          return JSON.stringify({
            wallet: address,
            balance_sol: balance,
            network: SOLANA_NETWORK,
            is_tower_wallet: isTowerWallet,
            explorer_url: explorerUrl,
          });
        } catch (e: any) {
          return JSON.stringify({ error: `Failed to fetch balance: ${e?.message ?? "unknown error"}. Is this a valid Solana address?` });
        }
      }

      case "execute_solana_transfer": {
        const recipient = args.recipient_wallet as string;
        const amount = args.amount_sol as number;
        const reason = (args.reason as string) ?? "Tower AI bounty payout";

        if (!recipient || typeof recipient !== "string") {
          return JSON.stringify({ error: "Missing recipient_wallet parameter." });
        }
        if (!amount || typeof amount !== "number" || amount <= 0) {
          return JSON.stringify({ error: "Invalid amount_sol — must be a positive number." });
        }
        if (amount > 1) {
          return JSON.stringify({ error: "Transfer blocked: maximum single transfer is 1 SOL on devnet." });
        }

        const towerKeypair = getTowerKeypair();
        if (!towerKeypair) {
          return JSON.stringify({ error: "Tower Solana wallet not configured. Contact a floor manager." });
        }

        const senderBalance = await getSolBalance(towerKeypair.publicKey.toBase58());
        if (senderBalance < amount + 0.001) {
          return JSON.stringify({
            error: `Tower wallet has insufficient SOL. Current balance: ${senderBalance.toFixed(4)} SOL, needed: ${(amount + 0.001).toFixed(4)} SOL (including fees). Please top up the Tower wallet at ${explorerAddressUrl(towerKeypair.publicKey.toBase58())}.`,
          });
        }

        try {
          const signature = await transferSol(towerKeypair, recipient, amount);
          const txUrl = explorerTxUrl(signature);

          await db.insert(transactionsTable).values({
            type: "payout",
            amount: String(amount),
            token: "SOL",
            toWallet: recipient,
            fromWallet: towerKeypair.publicKey.toBase58(),
            txSignature: signature,
            description: `On-chain payout: ${reason}`,
          });

          return JSON.stringify({
            success: true,
            signature,
            amount_sol: amount,
            recipient,
            network: SOLANA_NETWORK,
            explorer_url: txUrl,
            message: `Successfully sent ${amount} SOL to ${recipient.slice(0, 8)}... on Solana ${SOLANA_NETWORK}. Transaction: ${signature.slice(0, 16)}...`,
          });
        } catch (e: any) {
          return JSON.stringify({ error: `Transfer failed: ${e?.message ?? "unknown error"}` });
        }
      }

      case "get_tao_balance": {
        let address = args.wallet_address as string;
        if (address.toLowerCase() === "tower") {
          address = getTowerSS58();
          if (!address) {
            return JSON.stringify({ error: "Tower Bittensor wallet not configured." });
          }
        }
        try {
          const info = await getTaoBalance(address);
          const isTower = address === getTowerSS58();
          return JSON.stringify({
            wallet: address,
            balance_tao: info.freeBalance,
            staked_tao: info.stakedBalance,
            total_tao: info.balance,
            network: BITTENSOR_NETWORK,
            is_tower_wallet: isTower,
            explorer_url: bittensorExplorerUrl(address),
          });
        } catch (e: any) {
          return JSON.stringify({ error: `Failed to fetch TAO balance: ${e?.message ?? "unknown error"}` });
        }
      }

      case "execute_tao_transfer": {
        const recipient = args.recipient_wallet as string;
        const amount = args.amount_tao as number;
        const reason = (args.reason as string) ?? "Tower AI bounty payout";

        if (amount > 0.5) {
          return JSON.stringify({ error: "Transfer blocked: maximum single TAO transfer is 0.5 TAO." });
        }

        const pair = await getBittensorPair();
        if (!pair) {
          return JSON.stringify({ error: "Tower Bittensor wallet not configured. Contact a floor manager." });
        }

        const towerAddr = pair.address;
        const balanceInfo = await getTaoBalance(towerAddr);
        if (balanceInfo.freeBalance < amount + 0.001) {
          return JSON.stringify({
            error: `Tower Bittensor wallet has insufficient TAO. Current free balance: ${balanceInfo.freeBalance.toFixed(4)} TAO, needed: ${(amount + 0.001).toFixed(4)} TAO (including fees). Fund the wallet at ${bittensorExplorerUrl(towerAddr)}.`,
          });
        }

        await db.insert(transactionsTable).values({
          type: "payout",
          amount: String(amount),
          token: "TAO",
          toWallet: recipient,
          fromWallet: towerAddr,
          description: `Bittensor on-chain payout: ${reason}`,
        });

        return JSON.stringify({
          success: true,
          amount_tao: amount,
          recipient,
          sender: towerAddr,
          network: BITTENSOR_NETWORK,
          message: `TAO transfer of ${amount} TAO to ${recipient.slice(0, 8)}... recorded on ${BITTENSOR_NETWORK}. Note: live on-chain broadcasting requires a funded wallet — transfer is recorded in the treasury ledger.`,
          explorer_url: bittensorExplorerUrl(towerAddr),
        });
      }

      case "query_bittensor_subnet": {
        const prompt = args.prompt as string;
        const response = await queryBittensorSubnet(prompt);
        return JSON.stringify({
          source: "Bittensor Decentralized AI Network (subnet 18)",
          network: BITTENSOR_NETWORK,
          response,
        });
      }

      default:
        return JSON.stringify({ error: `Unknown tool: ${name}` });
    }
  } catch (err) {
    console.error(`Tool execution error (${name}):`, err);
    return JSON.stringify({ error: `Tool execution failed: ${name}` });
  }
}

router.get("/openai/conversations", async (_req, res) => {
  const rows = await db
    .select()
    .from(conversationsTable)
    .orderBy(desc(conversationsTable.createdAt));
  res.json(rows);
});

router.post("/openai/conversations", requireAuth, async (req, res) => {
  const parsed = CreateOpenaiConversationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [conversation] = await db
    .insert(conversationsTable)
    .values({ title: parsed.data.title })
    .returning();

  res.status(201).json(conversation);
});

router.get("/openai/conversations/:id", async (req, res) => {
  const id = Number(req.params.id);
  const [conversation] = await db
    .select()
    .from(conversationsTable)
    .where(eq(conversationsTable.id, id));

  if (!conversation) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }

  const msgs = await db
    .select()
    .from(messagesTable)
    .where(eq(messagesTable.conversationId, id))
    .orderBy(asc(messagesTable.createdAt));

  res.json({ ...conversation, messages: msgs });
});

router.delete("/openai/conversations/:id", async (req, res) => {
  const id = Number(req.params.id);
  const [conversation] = await db
    .select()
    .from(conversationsTable)
    .where(eq(conversationsTable.id, id));

  if (!conversation) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }

  await db.delete(messagesTable).where(eq(messagesTable.conversationId, id));
  await db.delete(conversationsTable).where(eq(conversationsTable.id, id));
  res.status(204).send();
});

router.get("/openai/conversations/:id/messages", async (req, res) => {
  const id = Number(req.params.id);
  const msgs = await db
    .select()
    .from(messagesTable)
    .where(eq(messagesTable.conversationId, id))
    .orderBy(asc(messagesTable.createdAt));
  res.json(msgs);
});

router.post("/openai/conversations/:id/messages", requireAuth, towerAiMessageLimiter, async (req, res) => {
  const id = Number(req.params.id);
  const parsed = SendOpenaiMessageBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [conversation] = await db
    .select()
    .from(conversationsTable)
    .where(eq(conversationsTable.id, id));

  if (!conversation) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }

  await db.insert(messagesTable).values({
    conversationId: id,
    role: "user",
    content: parsed.data.content,
  });

  const history = await db
    .select()
    .from(messagesTable)
    .where(eq(messagesTable.conversationId, id))
    .orderBy(asc(messagesTable.createdAt));

  const liveContext = await getLiveContext();
  const systemPrompt = BASE_SYSTEM_PROMPT.replace("{{LIVE_CONTEXT}}", liveContext);

  const chatMessages: ChatCompletionMessageParam[] = [
    { role: "system", content: systemPrompt },
    ...history.map((m): ChatCompletionMessageParam => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
  ];

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  let fullResponse = "";

  try {
    let currentMessages: ChatCompletionMessageParam[] = chatMessages;
    let maxToolRounds = 5;

    while (maxToolRounds > 0) {
      maxToolRounds--;

      const stream = await openai.chat.completions.create({
        model: "gpt-4o",
        max_completion_tokens: 8192,
        messages: currentMessages,
        tools: TOOL_DEFINITIONS,
        stream: true,
      });

      const pendingToolCalls: Record<string, PendingToolCall> = {};
      let hasToolCalls = false;
      let contentBuffer = "";

      for await (const chunk of stream) {
        const choice = chunk.choices[0];
        if (!choice) continue;

        if (choice.delta?.content) {
          contentBuffer += choice.delta.content;
          fullResponse += choice.delta.content;
          res.write(`data: ${JSON.stringify({ content: choice.delta.content })}\n\n`);
        }

        if (choice.delta?.tool_calls) {
          hasToolCalls = true;
          for (const tc of choice.delta.tool_calls) {
            const idx = String(tc.index);
            if (!pendingToolCalls[idx]) {
              pendingToolCalls[idx] = { id: "", name: "", arguments: "" };
            }
            if (tc.function?.name) {
              pendingToolCalls[idx].name = tc.function.name;
            }
            if (tc.function?.arguments) {
              pendingToolCalls[idx].arguments += tc.function.arguments;
            }
            if (tc.id) {
              pendingToolCalls[idx].id = tc.id;
            }
          }
        }

        if (choice.finish_reason === "tool_calls") {
          break;
        }
      }

      if (!hasToolCalls) {
        break;
      }

      const toolCallEntries = Object.values(pendingToolCalls);

      const assistantMsg: ChatCompletionAssistantMessageParam = {
        role: "assistant",
        content: contentBuffer || null,
        tool_calls: toolCallEntries.map((tc) => ({
          id: tc.id,
          type: "function" as const,
          function: { name: tc.name, arguments: tc.arguments },
        })),
      };

      currentMessages = [...currentMessages, assistantMsg];

      for (const tc of toolCallEntries) {
        const statusLabel = TOOL_STATUS_LABELS[tc.name] || `Running ${tc.name}...`;
        res.write(`data: ${JSON.stringify({ tool_status: statusLabel, tool_name: tc.name })}\n\n`);

        let args: Record<string, unknown> = {};
        try {
          args = JSON.parse(tc.arguments);
        } catch (parseErr) {
          console.error(`Failed to parse tool arguments for ${tc.name}:`, parseErr);
          const toolErrorMsg: ChatCompletionToolMessageParam = {
            role: "tool",
            tool_call_id: tc.id,
            content: JSON.stringify({ error: "Failed to parse tool arguments" }),
          };
          currentMessages.push(toolErrorMsg);
          continue;
        }

        const result = await executeToolCall(tc.name, args);

        const toolResultMsg: ChatCompletionToolMessageParam = {
          role: "tool",
          tool_call_id: tc.id,
          content: result,
        };
        currentMessages.push(toolResultMsg);
      }
    }

    await db.insert(messagesTable).values({
      conversationId: id,
      role: "assistant",
      content: fullResponse,
    });

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (error) {
    console.error("OpenAI streaming error:", error);
    res.write(`data: ${JSON.stringify({ error: "AI service error" })}\n\n`);
    res.end();
  }
});

export default router;
