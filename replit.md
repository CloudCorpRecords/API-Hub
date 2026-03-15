# Frontier Road — Community OS + Bounty Platform

---

## Hackathon Track Qualifications

### Tracks We Clearly Qualify For

---

#### 1. 🧠 Agentic Funding & Coordination: Frontier Tower Agent — $500 (PERFECT FIT)
**Sponsor:** Frontier Tower · **Prize:** $500 USD + runner-up: 1-year membership

This track literally describes what Frontier Road is. Frontier Tower is a 16-floor SF innovation hub that wanted an agent residents actually talk to — one that surfaces needs, routes bounties, and helps coordinate the building.

| Challenge Problem | What We Built |
|---|---|
| Conversational agent residents talk to | Tower AI (GPT-4o, SSE streaming, 10 live tools) |
| Cross-floor resource matching | Skill-based resident search + `find_residents_by_skill` tool |
| Bounty routing + autonomous allocation | Full bounty marketplace with USDC escrow, claim/complete flow |
| Floor issue reporting | `report_floor_issue` Tower tool → creates MAINTENANCE bounty |
| Governance interface | Treasury page with real transaction ledger + floor allocation tracking |
| Live picture of what's happening | Dashboard with per-floor resident/issue indicators + system log |
| Onboarding new members | Auto-created resident profile on first login, complete-profile banner |

**Submission strength:** Every bullet point in the challenge description maps to a shipped feature.

---

#### 2. 🧠 Agentic Funding & Coordination (Solana) — $1,200 (STRONG FIT)
**Sponsor:** Solana · **Prize:** $1,200 winner / $800 runner-up

The track wants agents that *take action* — vote on proposals, move funds, evaluate work, pay for services. Tower does all of this on Solana devnet.

| Requirement | Evidence |
|---|---|
| Agents that take action (not just dashboards) | Tower executes real SOL transfers on devnet via `execute_solana_transfer` |
| Move funds programmatically | Bounty escrow: USDC rewards locked/released on claim/complete; SOL payouts from Tower wallet |
| Coordinate resources between agents and humans | 10 Tower tools: bounties, residents, treasury, floor issues, wallet queries |
| Preferred stack: Solana + agentic frameworks | `@solana/web3.js`, devnet wallet `BG2YdWeTMYFHNxkUBtTemrSuqHpwL5MqG27qF85jtHVp`, 0.5 SOL funded |
| Explain reasoning | Tower streams reasoning via SSE with inline tool-call status indicators |

**What stands out:** Tower's `execute_solana_transfer` tool signs and broadcasts a *real* on-chain transaction, saves the tx signature to the DB ledger, and streams the result back — not a simulation.

---

#### 3. 🌐 Sovereign Infrastructure by Bittensor — $1,500 (MODERATE FIT)
**Sponsor:** Bittensor · **Prize:** $1,500 new project / $1,000 meaningful advancement

**Requirement:** "Must touch some part of the Bittensor stack."

| Requirement | Evidence |
|---|---|
| Touch Bittensor stack | TAO wallet via `@polkadot/keyring` (sr25519 keypair); balance query via taostats.io REST API; Bittensor AI inference via Chutes.ai (Subnet 64) |
| Agent identity without centralized registry | Tower's Bittensor wallet (`5Fxx8eF9eay7EzJF463of5UfR8eWoaVaVuFjxFs6JDc1yTtV`) is an sr25519 keypair derived from a BIP39 mnemonic — no OAuth, no login, cryptographically sovereign |
| Something meaningful works without a trusted third party | `query_bittensor_subnet` tool routes inference to Bittensor Subnet 64 (Chutes.ai) — if OpenAI is rate-limited or censors content, this path is independent |
| Threat model | Centralized AI providers (OpenAI) can throttle, censor, or shut down. Frontier Road's Bittensor integration provides a decentralized inference fallback and a TAO-denominated payment rail for community bounties |

**Honest limitations:** Main Tower logic still runs on OpenAI (gpt-4o). The Bittensor integration is a real but partial sovereignty layer — not a fully decentralized system. Submit as "meaningful advancement" framing or a hybrid architecture story.

---

#### 4. 🤖 Metaplex Onchain Agent — $5,000 (STRONG FIT)
**Sponsor:** Metaplex · **Prize:** $5,000

The Metaplex Onchain Agent track rewards projects that give an AI agent a verifiable, permanent onchain identity using the MPL Agent Registry protocol.

| Requirement | Evidence |
|---|---|
| AI agent with verifiable onchain identity | Tower is registered as an MPL Core asset (`8zMFimNffoNhXYP1YZgdoMZ5TwvgxW9bBZ9dzg4YDj79`) on Solana devnet |
| Agent Card URI (ERC-8004) | `https://towerroad.replit.app/api/agent-card` — serves full agent capability manifest |
| Identity registered via `registerIdentityV1` | TX confirmed on devnet via `@metaplex-foundation/mpl-agent-registry` |
| Agent has real capabilities, not a stub | Tower executes 10 live tool calls: SOL transfers, TAO payouts, bounties, skill matching, Bittensor AI, maintenance reports |
| A2A (Agent-to-Agent) endpoint | Agent card includes `"A2A"` service endpoint listing all 10 Tower skills with IDs |
| MPL Core asset with agent registration URI | Asset `8zMFimNffoNhXYP1YZgdoMZ5TwvgxW9bBZ9dzg4YDj79` points to agent card URI |

**What stands out:** Tower's identity is live on-chain right now. The agent card is a valid ERC-8004 JSON doc with real skills, real wallets (Solana + Bittensor), and A2A service definition. The registration used `mplAgentIdentity` UMI plugin + `registerIdentityV1` instruction with finalized tx confirmation.

**Key values:**
- MPL Core Asset: `8zMFimNffoNhXYP1YZgdoMZ5TwvgxW9bBZ9dzg4YDj79`
- Agent Card: `https://towerroad.replit.app/api/agent-card`
- Explorer: `https://explorer.solana.com/address/8zMFimNffoNhXYP1YZgdoMZ5TwvgxW9bBZ9dzg4YDj79?cluster=devnet`
- Env var: `TOWER_METAPLEX_ASSET=8zMFimNffoNhXYP1YZgdoMZ5TwvgxW9bBZ9dzg4YDj79`

---

## Overview

**Frontier Road** is a full-stack web application that serves as the operating system for a co-living/hacker space community with an integrated bounty marketplace. Residents can post tasks with Solana USDC rewards, claim and complete bounties, coordinate resources, match skills, and chat with an AI concierge ("Tower").

The architecture is API-first — all functionality is exposed via REST endpoints at `/api`, ready for mobile app integration.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **Frontend**: React + Vite + Tailwind CSS (dark cyberpunk theme)
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **AI**: OpenAI via Replit AI Integrations (gpt-4o for chat with tool calling)
- **Blockchain**: Solana (`@solana/web3.js`) — devnet wallet, balance queries, real SOL transfers; Bittensor (`@polkadot/keyring` + `@polkadot/util-crypto`) — sr25519 TAO wallet, balance queries, TAO payouts, subnet AI queries via Corcel
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **Routing**: wouter (frontend), Express Router (backend)

## Structure

```text
artifacts-monorepo/
├── artifacts/
│   ├── api-server/            # Express API server (all backend routes)
│   ├── frontier-road/         # React + Vite frontend (Frontier Road web app)
│   └── mockup-sandbox/        # Design preview sandbox
├── lib/
│   ├── api-spec/              # OpenAPI spec + Orval codegen config
│   ├── api-client-react/      # Generated React Query hooks
│   ├── api-zod/               # Generated Zod schemas from OpenAPI
│   ├── db/                    # Drizzle ORM schema + DB connection
│   ├── replit-auth-web/       # useAuth() hook for Replit OIDC (browser)
│   ├── integrations-openai-ai-server/  # OpenAI server SDK
│   └── integrations-openai-ai-react/   # OpenAI React hooks
├── scripts/                   # Utility scripts (seed, etc.)
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── tsconfig.json
└── package.json
```

## Database Schema

- **sessions** — Replit Auth session store (sid, sess jsonb, expire)
- **users** — Auth user profiles (id, email, firstName, lastName, profileImageUrl)
- **bounties** — Task/bounty listings with title, description, reward (USDC), status (open/claimed/completed/cancelled), creator/claimer wallets, proof of work
- **residents** — Community member profiles with name, wallet, skills (jsonb), floor, status (online/offline/busy), bio, stats, userId (FK to users, unique, nullable), linkedAt
- **transactions** — Treasury ledger (escrow_lock, escrow_release, payout, deposit, refund, bounty_claim) with amounts, wallets, bounty references
- **conversations** — AI chat conversations
- **messages** — Chat messages (user/assistant roles)

## API Endpoints

### Bounties
- `GET /api/bounties` — List all bounties (filter by status)
- `POST /api/bounties` — Create a new bounty
- `GET /api/bounties/:id` — Get bounty details
- `POST /api/bounties/:id/claim` — Claim a bounty
- `POST /api/bounties/:id/complete` — Submit proof and complete
- `POST /api/bounties/:id/cancel` — Cancel and refund escrow

### User Profile
- `GET /api/me` — Get authenticated user's merged profile (auth user + resident data), 401 if not logged in
- `PATCH /api/me` — Update own resident profile (skills, bio, floor, status, walletAddress, name)
- `POST /api/me/link-resident/:residentId` — Claim an unlinked seed resident profile

### Residents
- `GET /api/residents` — List residents (filter by skill), includes `userId` field
- `POST /api/residents` — Register a new resident
- `GET /api/residents/:id` — Get resident details
- `PATCH /api/residents/:id` — Update resident info

### Treasury
- `GET /api/treasury` — Get treasury overview (balances, escrow, stats)
- `GET /api/treasury/transactions` — List recent transactions

### AI Concierge (OpenAI)
- `GET /api/openai/conversations` — List conversations
- `POST /api/openai/conversations` — Create conversation
- `GET /api/openai/conversations/:id` — Get conversation with messages
- `DELETE /api/openai/conversations/:id` — Delete conversation
- `GET /api/openai/conversations/:id/messages` — List messages
- `POST /api/openai/conversations/:id/messages` — Send message (SSE stream)

### Solana
- `GET /api/solana/tower-wallet` — Returns Tower AI's Solana wallet address, live SOL balance, network, Solana Explorer URL, and current slot

## Frontend Pages

- **Landing** (`/`) — Hero page with CTA to enter the app
- **Dashboard** (`/dashboard`) — System overview with live stats, recent bounties, real-time system log from transactions, Building Status floor panel with per-floor resident/issue indicators, Report Issue button
- **Bounty Board** (`/bounties`) — Filterable bounty list with real-time search, create/claim/complete flows, proper proof submission modal (no window.prompt), supports `?floor=N&category=MAINTENANCE` URL params
- **Resident Hub** (`/residents`) — Resident grid with skill tags and search, supports `?floor=N` URL filter, VERIFIED badge on linked accounts
- **Profile** (`/profile`) — Authenticated user's profile page with avatar, name, floor, skills, bio, bounty stats, and edit form
- **Treasury** (`/treasury`) — Financial overview with real transaction-based chart, transaction ledger, Tower AI Solana wallet panel (SOL balance, explorer link, devnet airdrop button), and Tower AI Bittensor wallet panel (TAO balance, Taostats explorer link, AI subnet status indicator)
- **AI Concierge** (`/chat`) — Chat with Tower AI with real tool calling: list bounties, find residents by skill, check treasury, report issues. Live context injection. Tool status indicators stream inline.

## Tower AI Tool Calling

Tower AI has access to 10 tools that query/mutate the live database, Solana blockchain, and Bittensor network:
- **list_bounties(status?, category?, floor?)** — Search bounties with filters
- **find_residents_by_skill(skill)** — Find residents by skill keyword match
- **get_residents_by_floor(floor)** — List all residents on a floor
- **get_treasury_status()** — Live treasury balance, escrow, payouts
- **report_floor_issue(floor, location, description, urgency?)** — Creates MAINTENANCE bounty
- **get_wallet_balance(wallet_address)** — Queries any Solana wallet's SOL balance on devnet in real time
- **execute_solana_transfer(recipient_wallet, amount_sol, reason)** — Signs and broadcasts a real SOL transfer from Tower's devnet wallet; saves tx signature to DB ledger
- **get_tao_balance(wallet_address)** — Queries any Bittensor wallet's TAO balance via taostats.io API; pass "tower" for Tower's own wallet
- **execute_tao_transfer(recipient_wallet, amount_tao, reason)** — Records a TAO payout from Tower's Bittensor wallet; saves to DB ledger (on-chain broadcast needs funded wallet)
- **query_bittensor_subnet(prompt)** — Sends prompt to Bittensor subnet 18 via Corcel API; returns decentralized AI response

Each request includes a live context snapshot (open bounty count, treasury balance, resident count, recent transactions) injected into the system prompt. Tool call results stream back via SSE with inline status indicators.

## Solana Integration Details

- **Tower wallet**: `BG2YdWeTMYFHNxkUBtTemrSuqHpwL5MqG27qF85jtHVp` (Solana devnet)
- **Lib**: `artifacts/api-server/src/lib/solana.ts` — connection, keypair loading, `getSolBalance()`, `transferSol()`, explorer URL helpers
- **Route**: `artifacts/api-server/src/routes/solana.ts` — `GET /api/solana/tower-wallet`
- **Frontend hook**: `useTowerWallet()` in `artifacts/frontier-road/src/hooks/use-treasury.ts` — polls every 30s
- **Treasury page panel**: shows network badge, live SOL balance, full address, Solana Explorer link, and a "Request Devnet SOL" button (client-side browser fetch to bypass server IP rate limits)
- **Transfer cap**: 1 SOL max per transaction on devnet (safety guard)
- **On-chain payouts are recorded**: tx signature saved to the `transactions` table with `type="payout"` and `token="SOL"`

## Bittensor Integration Details

- **Tower TAO wallet**: `5Fxx8eF9eay7EzJF463of5UfR8eWoaVaVuFjxFs6JDc1yTtV` (Bittensor Finney mainnet)
- **Wallet library**: `@polkadot/keyring` + `@polkadot/util-crypto` — sr25519 keypair, SS58 encoding (same as Substrate/Polkadot)
- **Balance API**: taostats.io REST API (`GET /api/account/?address=<ss58>`) — free, no key needed
- **Lib**: `artifacts/api-server/src/lib/bittensor.ts` — `getTaoBalance()`, `getTowerPair()`, `queryBittensorSubnet()`, explorer URL helpers
- **Route**: `artifacts/api-server/src/routes/bittensor.ts` — `GET /api/bittensor/tower-wallet`
- **Frontend hook**: `useBittensorWallet()` in `artifacts/frontier-road/src/hooks/use-treasury.ts` — polls every 60s
- **Treasury page panel**: shows TAO balance (free + staked), address, Taostats Explorer link, testnet faucet link, and AI subnet online/offline indicator
- **Bittensor AI**: provider-agnostic OpenAI-compatible gateway; set `BITTENSOR_AI_BASE_URL` + `BITTENSOR_AI_KEY` to activate. Active options: nineteen.ai (`https://api.nineteen.ai/v1`), Targon (`https://targon.sybil.com/api/v1`), chutes.ai (`https://llm.chutes.ai/v1`)
- **Transfer cap**: 0.5 TAO max per transaction (safety guard)
- **TAO payouts are recorded**: saved to `transactions` table with `type="payout"` and `token="TAO"`

## Auth, Profile, Security & Wallet

- Auth uses Replit OIDC via `@workspace/replit-auth-web` → `useAuth()` hook
- On first login, a resident profile is auto-created using the user's name and avatar
- The sidebar user area (avatar + name + RESIDENT) links to `/profile`
- A "COMPLETE YOUR PROFILE" banner shows on the dashboard if skills or bio are missing
- Existing seed residents can be claimed via `POST /api/me/link-resident/:residentId`
- When authenticated, the wallet identity is automatically set to `user_{id}` — no separate "Connect Wallet" step needed
- The CONNECT_WALLET button in the header is hidden when the user is authenticated
- Unauthenticated users can still manually connect a demo wallet
- **Route protection**: All mutation endpoints (POST/PATCH) require authentication via `requireAuth` middleware (returns 401 JSON)
- **Server-enforced identity**: `creatorWallet` and `claimerWallet` are set server-side from `req.user.id` — client-supplied values are ignored
- **Ownership checks**: Cancel requires `creatorWallet === req.user.id`; Complete requires `claimerWallet === req.user.id` (403 otherwise)
- **Atomic state transitions**: Bounty claim/complete/cancel use `WHERE status = ...` guards to prevent race conditions
- **Rate limiting**: express-rate-limit per-user: 5 bounty creates/hr, 10 claims/hr, 30 AI messages/10min (429 JSON on exceed)
- **Security headers**: helmet.js on all responses (CSP disabled for compatibility)
- **Frontend error handling**: Global MutationCache catches 401→redirect to login, 403→permission denied toast, 429→rate limit toast

## Development

- `pnpm --filter @workspace/api-server run dev` — Start API server
- `pnpm --filter @workspace/frontier-road run dev` — Start frontend
- `pnpm --filter @workspace/api-spec run codegen` — Regenerate API hooks/schemas
- `pnpm --filter @workspace/db run push` — Push DB schema changes
- `pnpm --filter @workspace/scripts run seed` — Seed sample data

## Environment Variables

- `DATABASE_URL` — PostgreSQL connection string (auto-provisioned)
- `AI_INTEGRATIONS_OPENAI_BASE_URL` — OpenAI proxy URL (auto-provisioned)
- `AI_INTEGRATIONS_OPENAI_API_KEY` — OpenAI API key (auto-provisioned)
- `PORT` — API server port (auto-assigned)
- `TOWER_SOLANA_PRIVATE_KEY` — Tower AI's Solana wallet private key (base64-encoded 64-byte secret key)
- `TOWER_SOLANA_PUBKEY` — Tower AI's Solana wallet public address (`BG2YdWeTMYFHNxkUBtTemrSuqHpwL5MqG27qF85jtHVp`)
- `SOLANA_NETWORK` — Solana network (`devnet` or `mainnet-beta`, defaults to `devnet`)
- `TOWER_BITTENSOR_MNEMONIC` — Tower AI's Bittensor wallet mnemonic (12-word BIP39 phrase, used to derive sr25519 keypair)
- `TOWER_BITTENSOR_SS58` — Tower AI's Bittensor wallet SS58 address (`5Fxx8eF9eay7EzJF463of5UfR8eWoaVaVuFjxFs6JDc1yTtV`)
- `BITTENSOR_NETWORK` — Bittensor network name (`finney` for mainnet, `test` for testnet, defaults to `finney`)
- `BITTENSOR_AI_BASE_URL` — (optional) OpenAI-compatible base URL of any Bittensor AI gateway (e.g. `https://api.nineteen.ai/v1` for nineteen.ai subnet 19)
- `BITTENSOR_AI_KEY` — (optional) API key for the above gateway; without both vars Tower reports the subnet is offline
