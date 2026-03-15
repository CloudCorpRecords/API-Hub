# Hackathon Submission Guide — Frontier Road

A track-by-track breakdown of which challenges Frontier Road can enter, ranked by fit.

---

## TL;DR — Submit to These

| Track | Fit | Prize | Work needed |
|-------|-----|-------|-------------|
| **Frontier Tower Agent** | Perfect — built for this | $500 cash + 1yr membership | None, submit as-is |
| **Agentic Funding & Coordination (Solana)** | Strong — missing real Solana txns | $1,200 winner / $800 runner-up | Add basic Solana integration |
| **BONUS: Made by Human (human.tech)** | Possible if you register | $1,200 new / $800 existing | Register + optional integration |
| **BONUS: ElevenLabs Voice** | Possible if you add voice | Pro/Scale ElevenLabs tier | Add TTS to Tower AI |

---

## Track 1 — Frontier Tower Agent ⭐ BEST FIT

**Sponsor:** Frontier Tower  
**Prize:** $500 cash (winner) + 1 year Frontier Tower membership (runner-up)  
**Submission needed:** summary, github, demo, documentation

### Why this is a perfect match

The challenge description literally describes what Frontier Road is. Frontier Tower is a 16-floor innovation hub in SF where the building wants an agent that "residents actually talk to — ask questions, surface needs, propose ideas, request resources." They specifically call out these unsolved problems:

| Their problem | What Frontier Road already does |
|---|---|
| Cross-floor resource matching | Resident Hub with skill search + `?floor=N` filter |
| Bounty routing + autonomous allocation | Full bounty marketplace with USDC escrow |
| Governance interface / floor treasuries | Treasury dashboard, per-floor issue tracking |
| No live picture of the building | Dashboard with floor status cards, resident online counts |
| Onboarding — new members lost | Tower AI answers any question about the building |
| Event coordination | Tower AI can surface needs and route them |

Tower AI was literally named after this building. The system was built for this exact scenario.

### What to say in your submission

- This is a **new project** built for this hackathon
- Frontier Road is a community OS for co-living/hacker spaces — Frontier Tower is the prototype user
- Tower AI is the conversational agent — it has live access to the community database and can answer questions, find skill matches, create maintenance bounties, and check treasury status
- The bounty marketplace provides the funding mechanism the building wanted — residents post tasks, Tower AI can autonomously file infrastructure bounties
- The floor system maps directly to Frontier Tower's floor governance structure

### What to demo

1. Ask Tower: *"Who on floor 3 knows networking?"*
2. Ask Tower: *"Report a broken projector in the floor 4 conference room"* — watch it create a live maintenance bounty
3. Show the dashboard floor status cards
4. Show the treasury overview
5. Show the Resident Hub with skill search

---

## Track 2 — Agentic Funding & Coordination (Solana)

**Sponsor:** Solana Foundation  
**Prize:** $1,200 winner / $800 runner-up (+ Demo Day invitation)  
**Submission needed:** summary, github, demo, documentation

### Fit assessment

The concept is an exact match. The challenge wants "agents that take action: vote on proposals, move funds, evaluate work, pay for services, and coordinate with other agents." Frontier Road has all of this at the application layer — the gap is that USDC accounting lives in a PostgreSQL database, not actual Solana.

### What's missing

The bounty marketplace uses mock USDC with no real Solana transactions. The `walletAddress` field on residents exists as a string but no actual signing happens. To compete seriously in this track you'd need at least one of:

- Connect Solana Agent Kit to Tower AI (it already has tool calling — this would let it execute real Solana transactions)
- Use actual Solana wallet signing for bounty creation and payout
- Integrate x402 for agent-to-agent payments (bonus mentioned in the challenge)

### Suggested minimal addition

Wire in the [Solana Agent Kit](https://github.com/sendaifun/solana-agent-kit) as one of Tower AI's tools so Tower can check wallet balances or execute simple transfers. Even read-only Solana data would make the submission more credible.

### What's already strong

- Bounty escrow, payout, and refund flow is complete and working
- Tower AI autonomously creates bounties (an agent taking real action)
- Multi-party coordination: creator, claimer, Tower AI all interact through the bounty lifecycle
- Treasury tracking with a full transaction ledger
- Clean REST API ready for further agent integration

---

## Track 3 — BONUS: Made by Human (human.tech)

**Sponsor:** Holonym Foundation  
**Prize:** $1,200 new project / $800 existing project  
**Submission needed:** summary, demo, documentation  
**Requirement:** Register at frontier.human.tech first

### Fit assessment

This is a floating bonus track open to everyone. Frontier Road fits the humanistic values angle — it's a community coordination tool built for real humans living together, not a trading bot. The coordination, public goods funding, and community governance themes align.

### What's required to be eligible

1. Register and verify your humanity at **frontier.human.tech** (mandatory)
2. Integrate or align with human.tech tools: WaaP, Human Passport, or Human Network

The easiest integration that would also make Frontier Road better: **Human Passport for sybil resistance on bounty claims**. Right now one person could theoretically create multiple accounts and claim bounties repeatedly. Human Passport would prevent that. This is a legitimate product improvement, not just a checkbox.

### How to argue the fit

Frontier Road is public goods infrastructure for communities — it funds maintenance, matches skills, and governs resources. The bounty marketplace is literally a micro-grants system for hacker space needs. That's well within the "public good funding" and "decentralized coordination" scope the challenge rewards.

---

## Track 4 — BONUS: ElevenLabs Voice Challenge

**Sponsor:** ElevenLabs  
**Prize:** 3–6 months ElevenLabs Pro/Scale tier per team member  
**Required:** ElevenLabs API meaningfully integrated

### Fit assessment

Tower AI already streams text. Adding ElevenLabs TTS would make the concierge experience significantly better — residents could speak to Tower and hear responses, which is the natural interface for a building agent running on a lobby screen or intercom.

### What to build

1. Add an ElevenLabs TTS call at the end of each Tower AI response stream
2. Choose a voice that fits the Tower character (calm, authoritative, slightly synthetic)
3. Play the audio in the browser after the text stream completes

This is a few hours of work and would make Tower feel like a real building concierge rather than a chat window.

---

## Tracks to Skip

These either have hard technology requirements that aren't met or are completely unrelated to what Frontier Road does.

| Track | Why to skip |
|-------|------------|
| Physical AI & Robotics (NomadicML) | Requires real robots/hardware — no physical component |
| Data at Scale (Deep Lake) | Requires Deep Lake for robotics datasets — not relevant |
| Metaplex Onchain Agent | Requires Metaplex agent registry — not integrated |
| Meteora Challenge | Requires Meteora LP/DeFi SDK — not relevant |
| Arkhai Agentic Commerce | Requires Alkahest escrow tooling — not integrated |
| Lit Protocol Challenge | Requires Lit PKP signing and TEE compute — not integrated |
| AI Safety & Evaluation (Protocol Labs) | About red-teaming and eval harnesses — not relevant |
| Kalibr Resilience Challenge | Requires Kalibr instrumentation — not integrated |
| Sovereign Infrastructure (Bittensor) | Requires Bittensor subnet — not built |

---

## Submission Checklist

Things you need for every track:

- [ ] Public GitHub repository (with README.md — already done)
- [ ] Live demo URL — `https://towerroad.replit.app`
- [ ] Summary paragraph (see below)
- [ ] Documentation — API_REFERENCE.md + README.md already cover this

### Suggested project summary (copy/paste)

> Frontier Road is a community OS built for co-living and hacker spaces. Residents post tasks with USDC rewards, claim and complete bounties, match skills across floors, and talk to Tower — an AI concierge with live access to the community database. Tower can answer questions, find skilled residents, report maintenance issues as bounties, and check the treasury, all through a streaming conversational interface. The system is fully API-first with route protection, rate limiting, and server-enforced identity, and is ready for mobile integration.
