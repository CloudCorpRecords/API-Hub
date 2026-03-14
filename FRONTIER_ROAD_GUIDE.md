# Frontier Road — How It Works

## What Is It?

Frontier Road is a community operating system for co-living spaces and hacker houses. It combines three things in one web app:

1. **A bounty marketplace** — residents post tasks with USDC rewards attached; other residents claim and complete them to earn
2. **A resident directory** — skill-matching and presence tracking for everyone in the house
3. **A treasury dashboard** — tracks community funds, escrow locks, and payouts
4. **An AI concierge ("Tower")** — an AI assistant that knows the house and can answer questions about bounties, residents, and anything else

---

## System Architecture

```
Browser (React App)
       |
       | HTTP / SSE
       |
Express API Server (/api/*)
       |
       |---> PostgreSQL Database (bounties, residents, treasury, chat)
       |
       |---> OpenAI (via Replit AI proxy) — for Tower AI chat
```

The frontend and backend are both running locally. All data is real — nothing is mocked except the Solana wallet connection (which uses a placeholder for the demo).

---

## The Five Pages

### 1. SYS_DASHBOARD (`/`)
The home screen. Shows a live overview of the community:
- **Active bounties** — how many tasks are currently open or claimed
- **Treasury pool** — total USDC balance (deposits minus payouts)
- **Residents online** — who's active right now
- **Tower AI status** — whether the AI concierge is reachable
- **Recent bounties** — a live-updating list of the latest tasks
- **System log** — a feed of community events

### 2. BOUNTY_BOARD (`/bounties`)
The marketplace for community tasks. Bounties have four states:

| Status | Meaning |
|--------|---------|
| **open** | Available to claim — anyone can take it |
| **claimed** | Someone is working on it |
| **completed** | Done — reward has been paid out |
| **cancelled** | Cancelled — escrow refunded to creator |

**Posting a bounty:** Click NEW_TASK, fill in the title, description, reward amount (USDC), and category. Requires a connected wallet.

**Claiming a bounty:** Click CLAIM_TASK on any open bounty. The reward is locked in escrow until completion.

**Completing a bounty:** If you claimed a bounty, you'll see SUBMIT_PROOF. Enter a link to your work (GitHub PR, image, etc.). This triggers the payout.

### 3. RESIDENT_HUB (`/residents`)
A grid of everyone living at Frontier Road. Each card shows:
- Name and floor/sector
- Bio
- Skill tags (used for matching — e.g. "who can fix the WiFi?")
- Online/busy/offline status indicator
- Bounties completed and total USDC earned

Use the search bar to filter by name or skill.

### 4. TREASURY_LINK (`/treasury`)
Financial overview of the community fund:
- **Total Value Locked** — deposits minus payouts (the real balance)
- **Pending Escrow** — USDC currently locked in active bounties
- **Lifetime Paid** — total USDC distributed to residents

Below the stats is the **ledger** — a full transaction history showing every escrow lock, payout, refund, and deposit with timestamps.

### 5. AI_CONCIERGE (`/chat`)
Chat with Tower, the house AI. Tower knows about the community and can help with:
- Finding open bounties ("what tasks need doing?")
- Skill matching ("who knows Solana?")
- Treasury questions ("how much is in escrow?")
- General house coordination

**Starting a session:** Click `+ INIT_NEW_SESSION`. This creates a persistent conversation. Your chat history is saved — you can return to past conversations from the COMMLINKS sidebar.

**How it streams:** Responses arrive word-by-word using Server-Sent Events (SSE). You'll see Tower typing in real time.

---

## The Database

Five tables power everything:

| Table | Purpose |
|-------|---------|
| `bounties` | All tasks — title, description, reward, status, wallets |
| `residents` | Member profiles — skills, floor, bio, stats |
| `transactions` | Every financial event — escrow locks, payouts, refunds |
| `conversations` | AI chat sessions with titles and timestamps |
| `messages` | Individual messages within each conversation |

---

## The REST API

Everything the frontend does goes through the API at `/api`. This means a mobile app or any external tool can use the exact same endpoints.

### Bounties
| Method | Path | What It Does |
|--------|------|-------------|
| GET | `/api/bounties` | List all bounties (filter by `?status=open`) |
| POST | `/api/bounties` | Create a new bounty |
| GET | `/api/bounties/:id` | Get one bounty's details |
| POST | `/api/bounties/:id/claim` | Claim a bounty |
| POST | `/api/bounties/:id/complete` | Submit proof and release escrow |
| POST | `/api/bounties/:id/cancel` | Cancel and refund escrow |

### Residents
| Method | Path | What It Does |
|--------|------|-------------|
| GET | `/api/residents` | List all residents (filter by `?skill=Rust`) |
| POST | `/api/residents` | Register a new resident |
| GET | `/api/residents/:id` | Get one resident's profile |
| PATCH | `/api/residents/:id` | Update profile info |

### Treasury
| Method | Path | What It Does |
|--------|------|-------------|
| GET | `/api/treasury` | Balance overview and stats |
| GET | `/api/treasury/transactions` | Full transaction ledger |

### AI Concierge
| Method | Path | What It Does |
|--------|------|-------------|
| GET | `/api/openai/conversations` | List all chat sessions |
| POST | `/api/openai/conversations` | Start a new session |
| GET | `/api/openai/conversations/:id` | Get session + message history |
| DELETE | `/api/openai/conversations/:id` | Delete a session |
| POST | `/api/openai/conversations/:id/messages` | Send a message (streams back via SSE) |

---

## How Payments Work (Current State)

Payments are **tracked in the database** rather than executed on-chain. Here's the flow:

1. A resident posts a bounty with a reward amount
2. An `escrow_lock` transaction is recorded in the ledger
3. When another resident claims the bounty, the escrow is held
4. When proof is submitted and the bounty is completed, a `payout` transaction is recorded
5. If cancelled, a `refund` transaction is recorded

The `escrowTxSignature` and `completionTxSignature` fields are reserved for real Solana transaction hashes — wiring up actual on-chain settlement via `@solana/web3.js` is the natural next step.

---

## E2E Test Results (March 14, 2026)

All flows were verified automatically by a Playwright browser agent:

| Flow | Result |
|------|--------|
| Dashboard overview — stat cards, recent bounties, system log | ✅ Passed |
| Bounty Board — tabs (open/claimed/completed), card display | ✅ Passed |
| Resident Hub — grid layout, skill tags, status indicators | ✅ Passed |
| Treasury — balance cards, transaction ledger | ✅ Passed |
| AI Concierge — session creation, message sending, streaming response | ✅ Passed |
| Bounty creation form — fields present, wallet guard triggers correctly | ✅ Passed |
| Connect Wallet — button state updates to DISCONNECT after connecting | ✅ Passed |

---

## What's Coming Next

- **Real Solana wallet adapter** — swap the localStorage mock for Phantom/Solflare via `@solana/wallet-adapter-react`
- **On-chain escrow** — use `@solana/web3.js` to lock and release real USDC on devnet
- **Mobile app** — the REST API is already mobile-ready; an Expo app can consume all the same endpoints
- **Push notifications** — notify residents when a bounty they care about gets posted or claimed
- **Path parameter validation** — tighten bounty ID validation and add per-user authorization checks
