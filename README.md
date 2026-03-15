# Frontier Road

**Community OS for co-living and hacker spaces.**

Frontier Road is a full-stack platform that gives co-living communities a shared operating system — a bounty marketplace where residents earn USDC for getting things done, an AI concierge that knows your house, a resident directory with skill matching, and a live treasury that tracks every dollar in and out.

**Live at:** [https://towerroad.replit.app](https://towerroad.replit.app)  
**API Base URL:** `https://towerroad.replit.app/api`  
**Full API Reference:** [API_REFERENCE.md](./API_REFERENCE.md)

---

## What it does

### Bounty Marketplace
Residents post tasks with a USDC reward attached. Anyone in the community can claim a bounty, do the work, and submit proof to get paid. Every transaction — escrow lock, claim, payout, refund — is recorded in the treasury ledger. Floor issues (broken heaters, WiFi outages, etc.) can be posted as maintenance bounties directly from the dashboard or by telling Tower AI.

### Tower AI Concierge
Tower is an AI assistant that knows the live state of your community — and can take real on-chain action on Solana. Ask it in plain English:
- *"What bounties are open right now?"*
- *"Who on floor 3 knows networking?"*
- *"Report a broken heater in the floor 2 kitchen"*
- *"How much is in the treasury?"*
- *"What's the SOL balance of wallet ABC...?"*
- *"Send 0.1 SOL to wallet XYZ... for completing bounty #5"*

Tower answers using real data from the database and streams its response word by word. When it needs to look something up or execute an on-chain transaction, you see a live status indicator before the answer arrives. Solana transfers are recorded to the ledger with a real transaction signature you can verify on Solana Explorer.

### Resident Hub
Every community member gets a profile with their skills, floor, bio, and stats (bounties completed, USDC earned). Profiles linked to a real Replit login show a **Verified** badge. You can search residents by skill to find who can help with a specific task.

### Treasury
A live financial dashboard showing the total community pool, how much is locked in escrow for active bounties, total paid out over time, and a full transaction ledger. The treasury also shows Tower AI's live Solana wallet — a real devnet wallet with a balance, address, and link to Solana Explorer. On-chain payouts executed by Tower AI appear in the ledger with their Solana transaction signatures.

### Profile System
When you log in for the first time, a resident profile is automatically created from your Replit identity (name and avatar). You can then fill in your skills, bio, and floor. If you were already in the system as a seed resident, you can claim that profile and link it to your account.

---

## Solana integration

Tower AI has a real Solana wallet that operates on devnet. The integration uses `@solana/web3.js` directly — no third-party abstraction layer.

**What Tower can do on-chain:**

| Tower AI tool | What it does |
|---------------|-------------|
| `get_wallet_balance` | Queries any Solana wallet's SOL balance from devnet in real time |
| `execute_solana_transfer` | Signs and broadcasts a real SOL transfer from Tower's wallet to any recipient address |

**How a payout works:**
1. A resident completes a bounty and submits proof of work
2. You (or Tower AI autonomously) call: *"Send 0.1 SOL to wallet ABC... for bounty #5"*
3. Tower checks its own balance, signs the transaction, and broadcasts it to Solana devnet
4. The Solana transaction signature is saved to the treasury ledger
5. The transaction is immediately visible on [Solana Explorer](https://explorer.solana.com/?cluster=devnet)

**Tower's wallet:** `BG2YdWeTMYFHNxkUBtTemrSuqHpwL5MqG27qF85jtHVp` ([view on Explorer](https://explorer.solana.com/address/BG2YdWeTMYFHNxkUBtTemrSuqHpwL5MqG27qF85jtHVp?cluster=devnet))

**REST endpoint:** `GET /api/solana/tower-wallet` — returns the wallet address, live SOL balance, network, Solana Explorer URL, and current slot number. The Treasury page polls this every 30 seconds.

**Funding on devnet:** The Treasury page includes a "Request Devnet SOL" button that calls the Solana devnet RPC directly from the browser (bypassing any server-side rate limits). If rate-limited, it links directly to [faucet.solana.com](https://faucet.solana.com).

---

## Bittensor integration

Tower AI also has a real Bittensor wallet (sr25519 keypair, SS58-encoded) on the Finney mainnet, plus the ability to query Bittensor AI subnets as a second inference backend.

**What Tower can do with Bittensor:**

| Tower AI tool | What it does |
|---------------|-------------|
| `get_tao_balance` | Queries any Bittensor wallet's TAO balance via the taostats.io API. Pass `"tower"` to check Tower's own wallet. |
| `execute_tao_transfer` | Records a TAO payout from Tower's wallet to a resident in the treasury ledger (on-chain broadcasting requires a funded wallet) |
| `query_bittensor_subnet` | Sends a prompt to the Bittensor decentralized AI network (subnet 18 via Corcel) and returns the response |

**Bittensor AI backend (subnet inference):**
Tower AI can consult the Bittensor decentralized AI network directly from a conversation. Example prompts:
- *"Ask the Bittensor network what the best approach to optimize a Rust server is"*
- *"Query Bittensor subnet about co-living community conflict resolution"*
- *"What does the decentralized AI say about this problem?"*

If a `CORCEL_API_KEY` is set, queries are routed to Bittensor subnet 18 (Corcel gateway, OpenAI-compatible). Without the key, Tower gracefully explains the subnet is unreachable and the Treasury page shows an "AI subnet NO_KEY" status indicator.

**Tower's TAO wallet:** `5Fxx8eF9eay7EzJF463of5UfR8eWoaVaVuFjxFs6JDc1yTtV` ([view on Taostats](https://taostats.io/coldkey/5Fxx8eF9eay7EzJF463of5UfR8eWoaVaVuFjxFs6JDc1yTtV))

**REST endpoint:** `GET /api/bittensor/tower-wallet` — returns the TAO wallet address, live TAO balance (free + staked), network, Taostats Explorer URL, and whether the Corcel AI key is configured. The Treasury page polls this every 60 seconds.

**Wallet library:** `@polkadot/keyring` + `@polkadot/util-crypto` — the same keypair format used by Polkadot/Substrate chains. The wallet is loaded from a mnemonic stored in `TOWER_BITTENSOR_MNEMONIC`.

---

## Pages

| Route | What it is |
|-------|-----------|
| `/` | Landing page |
| `/dashboard` | System overview — live stats, building status by floor, recent activity |
| `/bounties` | Bounty board — post, claim, complete, and cancel tasks |
| `/residents` | Resident directory with skill search |
| `/treasury` | Financial overview and transaction history |
| `/chat` | Tower AI concierge |
| `/profile` | Your own profile — edit skills, bio, floor |

---

## Security model

All read endpoints are public — anyone can browse bounties, residents, and the treasury. Every write action requires you to be logged in.

The server enforces identity on bounties — it uses your login session to set who created and who claimed a bounty. You cannot spoof another user's wallet address. You can only cancel bounties you created, and only complete bounties you claimed.

Rate limits are in place to prevent abuse: 5 bounty creations per hour, 10 claims per hour, 30 Tower AI messages per 10 minutes.

---

## Mobile integration

The API is fully mobile-ready. Mobile apps authenticate using Replit OIDC (standard PKCE flow), exchange the auth code for a session token, and then pass that token as `Authorization: Bearer <token>` on every write request. There is no separate API key — the session token is the credential.

See the [API Reference](./API_REFERENCE.md) for the complete Mobile Auth Quick Start, SSE streaming examples in Swift and JavaScript, and the full endpoint list.

---

## Tech stack

| Layer | Tech |
|-------|------|
| Frontend | React, Vite, Tailwind CSS |
| Backend | Node.js, Express 5 |
| Database | PostgreSQL, Drizzle ORM |
| AI | OpenAI gpt-4o with tool calling, SSE streaming |
| Blockchain | Solana (`@solana/web3.js`), devnet — real wallet, balance queries, SOL transfers; Bittensor (`@polkadot/keyring`), Finney — sr25519 TAO wallet, balance queries, TAO payouts, subnet AI |
| Auth | Replit OIDC (PKCE) |
| Validation | Zod |
| API codegen | OpenAPI spec → Orval (React Query hooks + Zod schemas) |
| Monorepo | pnpm workspaces |

---

## Running locally

Start both services (they run concurrently in Replit):

```bash
# API server (port assigned via $PORT)
pnpm --filter @workspace/api-server run dev

# Frontend
pnpm --filter @workspace/frontier-road run dev
```

Push schema changes to the database:

```bash
pnpm --filter @workspace/db run push
```

Seed sample residents, bounties, and transactions:

```bash
pnpm --filter @workspace/scripts run seed
```

Regenerate API types and React Query hooks after changing the OpenAPI spec:

```bash
pnpm --filter @workspace/api-spec run codegen
```

---

## Environment variables

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | PostgreSQL connection string (auto-provisioned) |
| `AI_INTEGRATIONS_OPENAI_BASE_URL` | OpenAI proxy base URL (auto-provisioned) |
| `AI_INTEGRATIONS_OPENAI_API_KEY` | OpenAI API key (auto-provisioned) |
| `PORT` | API server port (auto-provisioned) |
| `TOWER_SOLANA_PRIVATE_KEY` | Tower AI's Solana wallet private key (base64) |
| `TOWER_SOLANA_PUBKEY` | Tower AI's Solana wallet public address |
| `SOLANA_NETWORK` | Solana network to use (`devnet` or `mainnet-beta`) |
| `TOWER_BITTENSOR_MNEMONIC` | Tower AI's Bittensor wallet mnemonic (12-word BIP39) |
| `TOWER_BITTENSOR_SS58` | Tower AI's Bittensor SS58 address |
| `BITTENSOR_NETWORK` | Bittensor network (`finney` for mainnet, `test` for testnet) |
| `CORCEL_API_KEY` | (optional) Corcel API key — enables Bittensor subnet AI inference |

To fund the Tower AI Solana wallet on devnet, visit the Treasury page and click **"Request Devnet SOL"** — or go to [faucet.solana.com](https://faucet.solana.com).

To enable Bittensor subnet AI queries, set `CORCEL_API_KEY` with a key from [corcel.io](https://corcel.io). Without it, Tower gracefully reports that the subnet is offline.

---

## Project structure

```
├── artifacts/
│   ├── api-server/       — Express REST API (all routes, auth, Tower AI)
│   └── frontier-road/    — React + Vite web app
├── lib/
│   ├── api-spec/         — OpenAPI spec + codegen config
│   ├── api-client-react/ — Generated React Query hooks
│   ├── api-zod/          — Generated Zod request/response schemas
│   ├── db/               — Drizzle schema + DB connection
│   └── replit-auth-web/  — useAuth() hook for Replit OIDC
├── scripts/              — Seed script
└── API_REFERENCE.md      — Full REST API documentation
```
