# Frontier Road — API Reference

**Base URL:** `https://towerroad.replit.app/api`

All endpoints are prefixed with `/api`. Responses are JSON unless noted otherwise. All timestamps are ISO 8601 UTC.

---

## Table of Contents

- [Authentication](#authentication)
- [Bounties](#bounties)
- [Residents](#residents)
- [Treasury](#treasury)
- [Tower AI (Chat)](#tower-ai-chat)
- [Health](#health)
- [Data Models](#data-models)
- [Error Responses](#error-responses)

---

## Authentication

Frontier Road uses Replit OIDC (OpenID Connect with PKCE). Browser sessions are stored server-side. Mobile clients exchange an auth code for a session token.

### Get current user

```
GET https://towerroad.replit.app/api/auth/user
```

Returns the currently authenticated user, or `null` if not logged in.

**Headers (optional):**

| Header | Description |
|--------|-------------|
| `Authorization` | `Bearer <session_token>` — for mobile clients |
| `Cookie: sid=<sid>` | Browser session cookie |

**Response 200:**

```json
{
  "user": {
    "id": "abc123",
    "email": "alex@example.com",
    "firstName": "Alex",
    "lastName": "Chen",
    "profileImageUrl": "https://..."
  }
}
```

```json
{ "user": null }
```

---

### Browser login

```
GET https://towerroad.replit.app/api/login?returnTo=/dashboard
```

Redirects the browser to the Replit OIDC authorization endpoint. On success, redirects back to `returnTo` (defaults to `/`).

| Query Param | Type | Description |
|-------------|------|-------------|
| `returnTo` | string | Optional. Relative path to redirect after login (must start with `/`). |

---

### Browser logout

```
GET https://towerroad.replit.app/api/logout
```

Clears the server session and redirects to the OIDC provider logout URL.

---

### Mobile — exchange auth code for token

```
POST https://towerroad.replit.app/api/mobile-auth/token-exchange
```

Exchange a PKCE authorization code for an opaque session token. Use this token in the `Authorization: Bearer <token>` header for all subsequent mobile API calls.

**Request body:**

```json
{
  "code": "...",
  "code_verifier": "...",
  "redirect_uri": "myapp://auth/callback",
  "state": "...",
  "nonce": "..."
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `code` | string | Yes | Authorization code from the OIDC redirect |
| `code_verifier` | string | Yes | PKCE code verifier |
| `redirect_uri` | string (URI) | Yes | Must match the URI used in the auth request |
| `state` | string | Yes | State value from the auth request |
| `nonce` | string | No | Nonce used during auth |

**Response 200:**

```json
{ "token": "sess_abc123xyz" }
```

**Error responses:** `400`, `401`, `500`

---

### Mobile — logout

```
POST https://towerroad.replit.app/api/mobile-auth/logout
```

**Headers:**

| Header | Description |
|--------|-------------|
| `Authorization` | `Bearer <session_token>` |

**Response 200:**

```json
{ "success": true }
```

---

## Bounties

The bounty board is the core of Frontier Road. Residents post tasks with USDC rewards. Anyone can claim, complete, or cancel a bounty.

### List bounties

```
GET https://towerroad.replit.app/api/bounties
```

| Query Param | Type | Description |
|-------------|------|-------------|
| `status` | `open` \| `claimed` \| `completed` \| `cancelled` | Filter by status |

**Response 200:**

```json
[
  {
    "id": 1,
    "title": "Fix WiFi on Floor 3",
    "description": "Diagnose and fix the wireless access point...",
    "rewardAmount": 75,
    "rewardToken": "USDC",
    "status": "open",
    "category": "MAINTENANCE",
    "creatorWallet": "abc123",
    "claimerWallet": null,
    "proofOfWork": null,
    "escrowTxSignature": null,
    "completionTxSignature": null,
    "createdAt": "2026-03-15T10:00:00.000Z",
    "updatedAt": "2026-03-15T10:00:00.000Z"
  }
]
```

---

### Create a bounty

```
POST https://towerroad.replit.app/api/bounties
```

Creating a bounty automatically records an `escrow_lock` transaction in the treasury ledger.

**Request body:**

```json
{
  "title": "Build a dashboard widget",
  "description": "Create a real-time stats widget for the main dashboard.",
  "rewardAmount": 150,
  "rewardToken": "USDC",
  "category": "DEV",
  "creatorWallet": "user_abc123",
  "escrowTxSignature": "optional_tx_sig"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `title` | string | Yes | Short title for the task |
| `description` | string | Yes | Full task description |
| `rewardAmount` | number | Yes | USDC reward amount |
| `rewardToken` | string | No | Defaults to `USDC` |
| `category` | string | Yes | `DEV`, `DESIGN`, `MAINTENANCE`, `COMMUNITY`, or `OTHER` |
| `creatorWallet` | string | Yes | Creator's wallet address or user ID |
| `escrowTxSignature` | string | No | On-chain escrow transaction signature |

**Response 201:** Returns the created [Bounty](#bounty) object.

---

### Get a bounty

```
GET https://towerroad.replit.app/api/bounties/{id}
```

**Response 200:** [Bounty](#bounty) object.
**Response 404:** `{ "error": "Bounty not found" }`

---

### Claim a bounty

```
POST https://towerroad.replit.app/api/bounties/{id}/claim
```

Marks the bounty as `claimed` and records a `bounty_claim` transaction. Only `open` bounties can be claimed.

**Request body:**

```json
{ "claimerWallet": "user_xyz789" }
```

| Field | Type | Required |
|-------|------|----------|
| `claimerWallet` | string | Yes |

**Response 200:** Updated [Bounty](#bounty) object.
**Response 404:** Not found.
**Response 409:** `{ "error": "Bounty is not available for claiming" }`

---

### Complete a bounty

```
POST https://towerroad.replit.app/api/bounties/{id}/complete
```

Submits proof of work and marks the bounty as `completed`. Records a `payout` transaction. Only `claimed` bounties can be completed.

**Request body:**

```json
{
  "proofOfWork": "https://github.com/myrepo/pr/42",
  "completionTxSignature": "optional_tx_sig"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `proofOfWork` | string | Yes | URL or description of completed work |
| `completionTxSignature` | string | No | On-chain payout transaction signature |

**Response 200:** Updated [Bounty](#bounty) object.
**Response 404:** Not found.
**Response 409:** `{ "error": "Bounty must be claimed before completing" }`

---

### Cancel a bounty

```
POST https://towerroad.replit.app/api/bounties/{id}/cancel
```

Cancels the bounty and records a `refund` transaction. Cannot cancel a `completed` or already `cancelled` bounty.

**Response 200:** Updated [Bounty](#bounty) object.
**Response 404:** Not found.
**Response 409:** `{ "error": "Cannot cancel a bounty that is already completed" }`

---

## Residents

The resident hub stores community member profiles, skills, and stats.

### List residents

```
GET https://towerroad.replit.app/api/residents
```

| Query Param | Type | Description |
|-------------|------|-------------|
| `skill` | string | Filter residents whose skills array contains this keyword (case-insensitive) |

**Example:** `GET /api/residents?skill=Rust`

**Response 200:**

```json
[
  {
    "id": 1,
    "name": "Alex Chen",
    "walletAddress": "8xGZ...",
    "avatar": null,
    "skills": ["Rust", "Networking", "Linux"],
    "floor": 3,
    "status": "online",
    "bio": "Infrastructure wizard. If it's broken, I can fix it.",
    "bountiesCompleted": 4,
    "bountiesCreated": 2,
    "totalEarned": 320.5,
    "createdAt": "2026-03-01T00:00:00.000Z"
  }
]
```

---

### Register a resident

```
POST https://towerroad.replit.app/api/residents
```

**Request body:**

```json
{
  "name": "Jordan Kim",
  "walletAddress": "9yAB...",
  "skills": ["React", "TypeScript", "Design"],
  "floor": 2,
  "bio": "Full-stack dev and occasional DJ.",
  "avatar": "https://..."
}
```

| Field | Type | Required |
|-------|------|----------|
| `name` | string | Yes |
| `skills` | string[] | Yes |
| `walletAddress` | string | No |
| `avatar` | string (URL) | No |
| `floor` | integer | No |
| `bio` | string | No |

**Response 201:** Created [Resident](#resident) object.

---

### Get a resident

```
GET https://towerroad.replit.app/api/residents/{id}
```

**Response 200:** [Resident](#resident) object.
**Response 404:** `{ "error": "Resident not found" }`

---

### Update a resident

```
PATCH https://towerroad.replit.app/api/residents/{id}
```

All fields are optional. Only provided fields are updated.

**Request body:**

```json
{
  "status": "busy",
  "skills": ["Rust", "Networking", "Linux", "Kubernetes"],
  "floor": 1
}
```

| Field | Type | Options |
|-------|------|---------|
| `name` | string | — |
| `walletAddress` | string | — |
| `avatar` | string | — |
| `skills` | string[] | — |
| `floor` | integer | — |
| `status` | string | `online`, `offline`, `busy` |
| `bio` | string | — |

**Response 200:** Updated [Resident](#resident) object.

---

## Treasury

The treasury tracks all USDC flows through the community — bounty escrow, payouts, refunds, and deposits.

### Get treasury overview

```
GET https://towerroad.replit.app/api/treasury
```

**Response 200:**

```json
{
  "totalBalance": 9850,
  "pendingEscrow": 475,
  "totalPaidOut": 1250,
  "activeBounties": 5,
  "completedBounties": 12
}
```

| Field | Description |
|-------|-------------|
| `totalBalance` | Total USDC deposited minus total paid out |
| `pendingEscrow` | USDC currently locked in active bounty escrow |
| `totalPaidOut` | Cumulative USDC paid to bounty completers |
| `activeBounties` | Count of open + claimed bounties |
| `completedBounties` | Count of completed bounties |

---

### List transactions

```
GET https://towerroad.replit.app/api/treasury/transactions
```

| Query Param | Type | Default | Description |
|-------------|------|---------|-------------|
| `limit` | integer | 20 | Max number of transactions to return (most recent first) |

**Response 200:**

```json
[
  {
    "id": 42,
    "type": "payout",
    "amount": 75,
    "token": "USDC",
    "fromWallet": "creator_wallet_abc",
    "toWallet": "claimer_wallet_xyz",
    "bountyId": 7,
    "txSignature": null,
    "description": "Payout for completed bounty: Fix WiFi on Floor 3",
    "createdAt": "2026-03-15T14:22:00.000Z"
  }
]
```

**Transaction types:**

| Type | Description |
|------|-------------|
| `deposit` | USDC added to the community treasury |
| `escrow_lock` | USDC locked when a bounty is created |
| `escrow_release` | Escrow released (manual) |
| `payout` | USDC paid to a bounty completer |
| `refund` | Escrow returned when a bounty is cancelled |
| `bounty_claim` | Recorded when a resident claims a bounty |

---

## Tower AI (Chat)

Tower is the Frontier Road AI concierge. It has live access to the community database and can look up bounties, find residents by skill, check the treasury, and create maintenance reports. Responses stream over Server-Sent Events (SSE).

### Tower's capabilities

Tower can respond to natural language queries like:

- *"What bounties are open right now?"*
- *"Who knows Rust on floor 3?"*
- *"How much is in the treasury?"*
- *"Report a broken heater in the floor 2 kitchen"*
- *"Who can fix the WiFi?"*

### List conversations

```
GET https://towerroad.replit.app/api/openai/conversations
```

**Response 200:**

```json
[
  { "id": 1, "title": "Session_471", "createdAt": "2026-03-14T23:53:19.000Z" }
]
```

---

### Create a conversation

```
POST https://towerroad.replit.app/api/openai/conversations
```

**Request body:**

```json
{ "title": "My Session" }
```

**Response 201:** [Conversation](#openaiconversation) object.

---

### Get a conversation with messages

```
GET https://towerroad.replit.app/api/openai/conversations/{id}
```

**Response 200:**

```json
{
  "id": 1,
  "title": "Session_471",
  "createdAt": "2026-03-14T23:53:19.000Z",
  "messages": [
    { "id": 1, "conversationId": 1, "role": "user", "content": "Who knows Rust?", "createdAt": "..." },
    { "id": 2, "conversationId": 1, "role": "assistant", "content": "I found 2 residents...", "createdAt": "..." }
  ]
}
```

---

### Delete a conversation

```
DELETE https://towerroad.replit.app/api/openai/conversations/{id}
```

**Response 204:** No content.

---

### List messages in a conversation

```
GET https://towerroad.replit.app/api/openai/conversations/{id}/messages
```

**Response 200:** Array of [Message](#openaimessage) objects, ordered oldest first.

---

### Send a message (SSE stream)

```
POST https://towerroad.replit.app/api/openai/conversations/{id}/messages
Content-Type: application/json
```

Sends a user message and streams Tower's response as Server-Sent Events. The user message is saved, then Tower queries any relevant tools (bounties, residents, treasury) before streaming its answer.

**Request body:**

```json
{ "content": "What bounties are open on floor 2?" }
```

**Response:** `Content-Type: text/event-stream`

The stream emits newline-delimited `data:` events. There are three event types:

**1. Tool status** — emitted while Tower is querying the database, before the answer:

```
data: {"tool_status":"Querying bounty board...","tool_name":"list_bounties"}
```

**2. Content chunk** — streamed text tokens of Tower's answer:

```
data: {"content":"Here are the open bounties on floor 2:"}
data: {"content":"\n\n1. **Broken Heater** — 50 USDC..."}
```

**3. Done** — signals end of stream:

```
data: {"done":true}
```

**Error event:**

```
data: {"error":"AI service error"}
```

**Example client (JavaScript):**

```js
const res = await fetch(
  "https://towerroad.replit.app/api/openai/conversations/1/messages",
  {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content: "Who knows networking?" })
  }
);

const reader = res.body.getReader();
const decoder = new TextDecoder();
let buffer = "";

while (true) {
  const { value, done } = await reader.read();
  if (done) break;

  buffer += decoder.decode(value, { stream: true });
  const lines = buffer.split("\n\n");
  buffer = lines.pop() || "";

  for (const line of lines) {
    if (!line.startsWith("data: ")) continue;
    const event = JSON.parse(line.slice(6));
    if (event.done) break;
    if (event.tool_status) console.log("Tower is:", event.tool_status);
    if (event.content) process.stdout.write(event.content);
  }
}
```

---

## Health

```
GET https://towerroad.replit.app/api/healthz
```

**Response 200:**

```json
{ "status": "ok" }
```

---

## Data Models

### Bounty

| Field | Type | Description |
|-------|------|-------------|
| `id` | integer | Unique bounty ID |
| `title` | string | Short task title |
| `description` | string | Full task description |
| `rewardAmount` | number | USDC reward |
| `rewardToken` | string | Always `USDC` |
| `status` | string | `open`, `claimed`, `completed`, `cancelled` |
| `category` | string | `DEV`, `DESIGN`, `MAINTENANCE`, `COMMUNITY`, `OTHER` |
| `creatorWallet` | string | Creator's wallet or user ID |
| `claimerWallet` | string \| null | Claimer's wallet or user ID |
| `proofOfWork` | string \| null | Submitted proof URL |
| `escrowTxSignature` | string \| null | On-chain escrow tx |
| `completionTxSignature` | string \| null | On-chain payout tx |
| `createdAt` | ISO 8601 | Creation timestamp |
| `updatedAt` | ISO 8601 | Last update timestamp |

### Resident

| Field | Type | Description |
|-------|------|-------------|
| `id` | integer | Unique resident ID |
| `name` | string | Display name |
| `walletAddress` | string \| null | Solana wallet address |
| `avatar` | string \| null | Avatar URL |
| `skills` | string[] | List of skills |
| `floor` | integer \| null | Building floor number |
| `status` | string | `online`, `offline`, `busy` |
| `bio` | string \| null | Short bio |
| `bountiesCompleted` | integer | Bounties completed |
| `bountiesCreated` | integer | Bounties posted |
| `totalEarned` | number | Total USDC earned |
| `createdAt` | ISO 8601 | Profile creation timestamp |

### Transaction

| Field | Type | Description |
|-------|------|-------------|
| `id` | integer | Unique transaction ID |
| `type` | string | `deposit`, `escrow_lock`, `escrow_release`, `payout`, `refund`, `bounty_claim` |
| `amount` | number | USDC amount |
| `token` | string | Always `USDC` |
| `fromWallet` | string \| null | Sender wallet |
| `toWallet` | string \| null | Recipient wallet |
| `bountyId` | integer \| null | Associated bounty |
| `txSignature` | string \| null | On-chain transaction signature |
| `description` | string | Human-readable description |
| `createdAt` | ISO 8601 | Timestamp |

### OpenaiConversation

| Field | Type | Description |
|-------|------|-------------|
| `id` | integer | Conversation ID |
| `title` | string | Session title |
| `createdAt` | ISO 8601 | Creation timestamp |

### OpenaiMessage

| Field | Type | Description |
|-------|------|-------------|
| `id` | integer | Message ID |
| `conversationId` | integer | Parent conversation |
| `role` | string | `user` or `assistant` |
| `content` | string | Message text |
| `createdAt` | ISO 8601 | Timestamp |

---

## Error Responses

All errors return a JSON body with an `error` field:

```json
{ "error": "Bounty not found" }
```

| Status | Meaning |
|--------|---------|
| `400` | Bad request — missing or invalid fields |
| `401` | Unauthorized — invalid or missing session |
| `404` | Resource not found |
| `409` | Conflict — invalid state transition (e.g. claiming an already-claimed bounty) |
| `500` | Server error |
