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
];

const TOOL_STATUS_LABELS: Record<string, string> = {
  list_bounties: "Querying bounty board...",
  find_residents_by_skill: "Looking up residents...",
  get_residents_by_floor: "Checking floor roster...",
  get_treasury_status: "Checking treasury...",
  report_floor_issue: "Creating maintenance report...",
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
          bounties: rows.slice(0, 10).map(b => ({
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

router.post("/openai/conversations", async (req, res) => {
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

router.post("/openai/conversations/:id/messages", async (req, res) => {
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
