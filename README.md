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
Tower is an AI assistant that knows the live state of your community. Ask it in plain English:
- *"What bounties are open right now?"*
- *"Who on floor 3 knows networking?"*
- *"Report a broken heater in the floor 2 kitchen"*
- *"How much is in the treasury?"*

Tower answers using real data from the database and streams its response word by word. When it needs to look something up, you see a live indicator ("Querying bounty board...") before the answer arrives.

### Resident Hub
Every community member gets a profile with their skills, floor, bio, and stats (bounties completed, USDC earned). Profiles linked to a real Replit login show a **Verified** badge. You can search residents by skill to find who can help with a specific task.

### Treasury
A live financial dashboard showing the total community pool, how much is locked in escrow for active bounties, total paid out over time, and a full transaction ledger. No real blockchain required — all accounting is handled in the database.

### Profile System
When you log in for the first time, a resident profile is automatically created from your Replit identity (name and avatar). You can then fill in your skills, bio, and floor. If you were already in the system as a seed resident, you can claim that profile and link it to your account.

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

All are auto-provisioned in the Replit environment:

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | PostgreSQL connection string |
| `AI_INTEGRATIONS_OPENAI_BASE_URL` | OpenAI proxy base URL |
| `AI_INTEGRATIONS_OPENAI_API_KEY` | OpenAI API key |
| `PORT` | API server port |

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
