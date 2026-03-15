# Frontier Road — Community OS + Bounty Platform

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
- **AI**: OpenAI via Replit AI Integrations (gpt-5.2 for chat)
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
- **residents** — Community member profiles with name, wallet, skills (jsonb), floor, status (online/offline/busy), bio, stats
- **transactions** — Treasury ledger (escrow_lock, escrow_release, payout, deposit, refund) with amounts, wallets, bounty references
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

### Residents
- `GET /api/residents` — List residents (filter by skill)
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

## Frontend Pages

- **Dashboard** (`/`) — System overview with live stats, recent bounties, activity log
- **Bounty Board** (`/bounties`) — Filterable bounty list with create/claim/complete flows
- **Resident Hub** (`/residents`) — Resident grid with skill tags and search
- **Treasury** (`/treasury`) — Financial overview with transaction ledger
- **AI Concierge** (`/chat`) — Chat with Tower AI assistant

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
