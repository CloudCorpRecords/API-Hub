# Frontier Road — API Reference

**Base URL:** `https://towerroad.replit.app/api`

All endpoints are prefixed with `/api`. Responses are JSON unless noted otherwise. All timestamps are ISO 8601 UTC.

---

## Table of Contents

- [Authentication](#authentication)
- [Mobile Auth Quick Start](#mobile-auth-quick-start)
- [Protected vs Public Endpoints](#protected-vs-public-endpoints)
- [My Profile (`/me`)](#my-profile)
- [Bounties](#bounties)
- [Residents](#residents)
- [Treasury](#treasury)
- [Tower AI (Chat)](#tower-ai-chat)
- [Health](#health)
- [Data Models](#data-models)
- [Error Responses](#error-responses)

---

## Authentication

Frontier Road uses **Replit OIDC (OpenID Connect with PKCE)** for authentication. There are two session models:

| Client type | How it works |
|-------------|--------------|
| **Browser** | Server sets a `sid` cookie after login. Sent automatically. |
| **Mobile** | App performs PKCE login, then calls `/api/mobile-auth/token-exchange` to get a session token. Pass it as `Authorization: Bearer <token>` on every request. |

There is **no separate static API key**. The session token returned from the token exchange endpoint IS the credential for your mobile app. Treat it like a password — store it securely (e.g. iOS Keychain, Android Keystore) and never log or expose it.

---

## Mobile Auth Quick Start

This is the complete flow for a mobile app to authenticate and make protected API calls.

### Step 1 — Initiate PKCE login

Your mobile app opens the Replit OIDC authorization URL in a browser/webview. Generate a PKCE code verifier and challenge before redirecting:

```
GET https://replit.com/oidc/authorize
  ?response_type=code
  &client_id=<YOUR_REPL_ID>
  &redirect_uri=myapp://auth/callback
  &scope=openid email profile offline_access
  &code_challenge=<sha256_base64url(code_verifier)>
  &code_challenge_method=S256
  &state=<random_state>
  &nonce=<random_nonce>
```

### Step 2 — Exchange the code for a session token

After the user logs in, Replit redirects to your `redirect_uri` with a `code` parameter. Exchange it immediately:

```
POST https://towerroad.replit.app/api/mobile-auth/token-exchange
Content-Type: application/json
```

```json
{
  "code": "<code from redirect>",
  "code_verifier": "<your PKCE verifier>",
  "redirect_uri": "myapp://auth/callback",
  "state": "<state you generated>",
  "nonce": "<nonce you generated>"
}
```

**Response 200:**

```json
{ "token": "a3f9b2c1d4e5f6..." }
```

**Save this token.** It is your Bearer credential for all protected API calls. It expires after 7 days and is invalidated on logout.

### Step 3 — Use the token on every protected request

```
Authorization: Bearer a3f9b2c1d4e5f6...
```

Example:

```
POST https://towerroad.replit.app/api/bounties
Authorization: Bearer a3f9b2c1d4e5f6...
Content-Type: application/json

{ "title": "Fix the sink", "description": "...", "rewardAmount": 50, "category": "MAINTENANCE" }
```

### Step 4 — Logout

```
POST https://towerroad.replit.app/api/mobile-auth/logout
Authorization: Bearer a3f9b2c1d4e5f6...
```

**Response 200:** `{ "success": true }`

This invalidates the token server-side immediately.

---

## Protected vs Public Endpoints

| Endpoint | Auth required? |
|----------|---------------|
| `GET /bounties` | No |
| `GET /bounties/:id` | No |
| `POST /bounties` | **Yes** |
| `POST /bounties/:id/claim` | **Yes** |
| `POST /bounties/:id/complete` | **Yes** |
| `POST /bounties/:id/cancel` | **Yes** |
| `GET /residents` | No |
| `GET /residents/:id` | No |
| `POST /residents` | **Yes** |
| `PATCH /residents/:id` | **Yes** (owner only) |
| `GET /treasury` | No |
| `GET /treasury/transactions` | No |
| `GET /me` | **Yes** |
| `PATCH /me` | **Yes** |
| `POST /me/link-resident/:id` | **Yes** |
| `GET /openai/conversations` | No |
| `GET /openai/conversations/:id` | No |
| `POST /openai/conversations` | **Yes** |
| `POST /openai/conversations/:id/messages` | **Yes** |
| `DELETE /openai/conversations/:id` | No |
| `GET /healthz` | No |

Unauthenticated calls to protected endpoints return **401**. Calling a protected endpoint as the wrong owner returns **403**.

---

## My Profile

The `/me` endpoints always operate on the currently authenticated user. This is the recommended way for a mobile app to read and edit the logged-in user's own profile.

### Get my profile

```
GET https://towerroad.replit.app/api/me
Authorization: Bearer <token>
```

Returns the authenticated user's identity merged with their linked resident profile. `resident` is `null` if no resident profile has been linked yet (this should not happen after first login, since a stub is auto-created).

**Response 200:**

```json
{
  "user": {
    "id": "replit_user_id_abc",
    "email": "alex@example.com",
    "firstName": "Alex",
    "lastName": "Chen",
    "profileImageUrl": "https://cdn.replit.com/..."
  },
  "resident": {
    "id": 3,
    "name": "Alex Chen",
    "walletAddress": null,
    "avatar": "https://cdn.replit.com/...",
    "skills": ["Rust", "TypeScript"],
    "floor": 2,
    "status": "online",
    "bio": "Building the agent economy.",
    "bountiesCompleted": 4,
    "bountiesCreated": 2,
    "totalEarned": 320.5,
    "userId": "replit_user_id_abc",
    "linkedAt": "2026-03-15T10:00:00.000Z",
    "createdAt": "2026-03-15T10:00:00.000Z"
  }
}
```

**Response 401:** Not authenticated.

---

### Update my profile

```
PATCH https://towerroad.replit.app/api/me
Authorization: Bearer <token>
Content-Type: application/json
```

Updates the authenticated user's resident profile. All fields are optional.

**Request body:**

```json
{
  "name": "Alex Chen",
  "bio": "Full-stack blockchain dev.",
  "skills": ["Rust", "TypeScript", "Solidity"],
  "floor": 3,
  "status": "busy",
  "walletAddress": "8xGZabcd..."
}
```

| Field | Type | Options |
|-------|------|---------|
| `name` | string | — |
| `bio` | string | — |
| `skills` | string[] | — |
| `floor` | integer | — |
| `status` | string | `online`, `offline`, `busy` |
| `walletAddress` | string | — |

**Response 200:** Updated [Resident](#resident) object.
**Response 401:** Not authenticated.
**Response 404:** No resident profile linked (rare).

---

### Link an existing resident to my account

```
POST https://towerroad.replit.app/api/me/link-resident/{residentId}
Authorization: Bearer <token>
```

Links a seed/unlinked resident row to the authenticated user's account. Useful if a resident was created before you logged in for the first time. If your account already has a linked stub, the stub is unlinked automatically to make room.

**Response 200:** Updated [Resident](#resident) object (now linked to your account).
**Response 404:** Resident not found.
**Response 409:** `{ "error": "This resident is already linked to another account" }`

---

## Bounties

The bounty board is the core of Frontier Road. Residents post tasks with USDC rewards.

> **Note:** `creatorWallet` is set server-side from your authenticated user ID — you do not send it in the request. Same for `claimerWallet` on claim. This prevents spoofing.

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
    "creatorWallet": "replit_user_id_abc",
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
Authorization: Bearer <token>
Content-Type: application/json
```

Creating a bounty automatically records an `escrow_lock` transaction in the treasury ledger. The server sets `creatorWallet` from your session — do not include it in the request body.

**Rate limit:** 5 per user per hour.

**Request body:**

```json
{
  "title": "Build a dashboard widget",
  "description": "Create a real-time stats widget for the main dashboard.",
  "rewardAmount": 150,
  "rewardToken": "USDC",
  "category": "DEV",
  "escrowTxSignature": "optional_on_chain_tx_sig"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `title` | string | Yes | Short title for the task |
| `description` | string | Yes | Full task description |
| `rewardAmount` | number | Yes | USDC reward amount |
| `rewardToken` | string | No | Defaults to `USDC` |
| `category` | string | Yes | `DEV`, `DESIGN`, `MAINTENANCE`, `COMMUNITY`, or `OTHER` |
| `escrowTxSignature` | string | No | On-chain escrow transaction signature |

**Response 201:** Created [Bounty](#bounty) object.
**Response 401:** Not authenticated.
**Response 429:** Rate limit exceeded.

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
Authorization: Bearer <token>
```

Marks the bounty as `claimed`. The server sets `claimerWallet` from your session — no request body needed. Only `open` bounties can be claimed. You cannot claim your own bounty.

**Rate limit:** 10 per user per hour.

**Response 200:** Updated [Bounty](#bounty) object.
**Response 401:** Not authenticated.
**Response 409:** `{ "error": "Bounty is not available for claiming" }`
**Response 429:** Rate limit exceeded.

---

### Complete a bounty

```
POST https://towerroad.replit.app/api/bounties/{id}/complete
Authorization: Bearer <token>
Content-Type: application/json
```

Submits proof of work and marks the bounty as `completed`. Records a `payout` transaction. Only the user who claimed the bounty (`claimerWallet === your user ID`) can complete it.

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
**Response 401:** Not authenticated.
**Response 403:** `{ "error": "Only the claimer can complete this bounty" }`
**Response 409:** `{ "error": "Bounty must be claimed before completing" }`

---

### Cancel a bounty

```
POST https://towerroad.replit.app/api/bounties/{id}/cancel
Authorization: Bearer <token>
```

Cancels the bounty and records a `refund` transaction. Only the creator (`creatorWallet === your user ID`) can cancel. Cannot cancel a `completed` or already `cancelled` bounty.

**Response 200:** Updated [Bounty](#bounty) object.
**Response 401:** Not authenticated.
**Response 403:** `{ "error": "Only the creator can cancel this bounty" }`
**Response 409:** `{ "error": "Cannot cancel a bounty that is already completed" }`

---

## Residents

The resident hub stores community member profiles, skills, and stats. Residents with a linked Replit account show a **verified** flag (`userId` non-null).

### List residents

```
GET https://towerroad.replit.app/api/residents
```

| Query Param | Type | Description |
|-------------|------|-------------|
| `skill` | string | Filter residents whose skills array contains this keyword (case-insensitive) |

**Response 200:** Array of [Resident](#resident) objects.

---

### Register a resident

```
POST https://towerroad.replit.app/api/residents
Authorization: Bearer <token>
Content-Type: application/json
```

> For most mobile use cases, prefer `PATCH /me` to edit your own profile rather than creating a new resident row. This endpoint is for admin-level profile creation.

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

**Response 201:** Created [Resident](#resident) object.
**Response 401:** Not authenticated.

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
Authorization: Bearer <token>
Content-Type: application/json
```

Only the owner of the resident profile (i.e. the user whose `userId` matches this resident) can update it. To update your own profile, prefer `PATCH /me`.

**Response 200:** Updated [Resident](#resident) object.
**Response 401:** Not authenticated.
**Response 403:** `{ "error": "You do not have permission to update this resident" }`

---

## Treasury

The treasury tracks all USDC flows — bounty escrow, payouts, refunds, and deposits. All treasury endpoints are public (read-only).

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

---

### List transactions

```
GET https://towerroad.replit.app/api/treasury/transactions
```

| Query Param | Type | Default | Description |
|-------------|------|---------|-------------|
| `limit` | integer | 20 | Max number of transactions to return (most recent first) |

**Response 200:** Array of [Transaction](#transaction) objects.

**Transaction types:**

| Type | Description |
|------|-------------|
| `deposit` | USDC added to the community treasury |
| `escrow_lock` | USDC locked when a bounty is created |
| `escrow_release` | Escrow released manually |
| `payout` | USDC paid to a bounty completer |
| `refund` | Escrow returned when a bounty is cancelled |
| `bounty_claim` | Recorded when a resident claims a bounty |

---

## Tower AI (Chat)

Tower is the Frontier Road AI concierge. It has live access to the community database and can look up bounties, find residents by skill, check the treasury, and file maintenance reports. Responses stream over Server-Sent Events (SSE).

Creating conversations and sending messages **requires authentication**.

### Tower's capabilities

Tower responds to natural language like:

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
Authorization: Bearer <token>
Content-Type: application/json
```

```json
{ "title": "My Session" }
```

**Response 201:** [Conversation](#openaiconversation) object.
**Response 401:** Not authenticated.

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

### List messages

```
GET https://towerroad.replit.app/api/openai/conversations/{id}/messages
```

**Response 200:** Array of [Message](#openaimessage) objects, ordered oldest first.

---

### Send a message (SSE stream)

```
POST https://towerroad.replit.app/api/openai/conversations/{id}/messages
Authorization: Bearer <token>
Content-Type: application/json
```

**Rate limit:** 30 messages per user per 10 minutes.

Sends a user message and streams Tower's response as Server-Sent Events. The user message is saved, Tower queries any relevant tools, then streams its answer token by token.

**Request body:**

```json
{ "content": "What bounties are open on floor 2?" }
```

**Response:** `Content-Type: text/event-stream`

Three event types are emitted:

**1. Tool status** — while Tower queries the database:

```
data: {"tool_status":"Querying bounty board...","tool_name":"list_bounties"}
```

**2. Content chunk** — streamed text tokens:

```
data: {"content":"Here are the open bounties on floor 2:"}
data: {"content":"\n\n1. **Broken Heater** — 50 USDC..."}
```

**3. Done** — end of stream:

```
data: {"done":true}
```

**Error event:**

```
data: {"error":"AI service error"}
```

**Mobile SSE example (Swift-style pseudocode):**

```swift
var request = URLRequest(url: URL(string: ".../conversations/1/messages")!)
request.httpMethod = "POST"
request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
request.setValue("application/json", forHTTPHeaderField: "Content-Type")
request.httpBody = try! JSONSerialization.data(withJSONObject: ["content": "Who knows Rust?"])

let (stream, _) = try await URLSession.shared.bytes(for: request)
for try await line in stream.lines {
    guard line.hasPrefix("data: ") else { continue }
    let json = line.dropFirst(6)
    let event = try! JSONDecoder().decode(TowerEvent.self, from: Data(json.utf8))
    if event.done == true { break }
    if let chunk = event.content { print(chunk, terminator: "") }
}
```

**JavaScript example:**

```js
const res = await fetch(".../conversations/1/messages", {
  method: "POST",
  headers: {
    "Authorization": `Bearer ${token}`,
    "Content-Type": "application/json"
  },
  body: JSON.stringify({ content: "Who knows networking?" })
});

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

**Response 200:** `{ "status": "ok" }`

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
| `creatorWallet` | string | Creator's user ID (set server-side from auth session) |
| `claimerWallet` | string \| null | Claimer's user ID (set server-side on claim) |
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
| `userId` | string \| null | Linked Replit user ID (`null` = unverified seed profile) |
| `linkedAt` | ISO 8601 \| null | When the account was linked |
| `createdAt` | ISO 8601 | Profile creation timestamp |

### Transaction

| Field | Type | Description |
|-------|------|-------------|
| `id` | integer | Unique transaction ID |
| `type` | string | `deposit`, `escrow_lock`, `escrow_release`, `payout`, `refund`, `bounty_claim` |
| `amount` | number | USDC amount |
| `token` | string | Always `USDC` |
| `fromWallet` | string \| null | Sender user ID |
| `toWallet` | string \| null | Recipient user ID |
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
| `401` | Unauthorized — missing or expired session token. Include `Authorization: Bearer <token>` header. |
| `403` | Forbidden — authenticated but not the owner of this resource |
| `404` | Resource not found |
| `409` | Conflict — invalid state transition (e.g. claiming an already-claimed bounty) |
| `429` | Rate limit exceeded — slow down and retry after a short wait |
| `500` | Server error |
