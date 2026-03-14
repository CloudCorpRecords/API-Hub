import { db } from "@workspace/db";
import { residentsTable, bountiesTable, transactionsTable } from "@workspace/db/schema";

async function seed() {
  console.log("Seeding Frontier Road database...");

  const residents = await db
    .insert(residentsTable)
    .values([
      {
        name: "Alex Chen",
        walletAddress: "7nYBm3VhKf1JQv8Wd5f2bPTLvqR8cN3xY9uK4mJp6Hq",
        skills: ["Solidity", "Rust", "Smart Contracts"],
        floor: 3,
        status: "online",
        bio: "Full-stack blockchain dev. Building the agent economy.",
        avatar: null,
      },
      {
        name: "Maya Rodriguez",
        walletAddress: "4kR9xB2nL7pFm3jH8dQ5wA6yT1cV0eU9iO4sG8fN2mX",
        skills: ["React", "TypeScript", "UI/UX Design"],
        floor: 2,
        status: "online",
        bio: "Frontend architect. Obsessed with pixel-perfect interfaces.",
        avatar: null,
      },
      {
        name: "Jordan Kim",
        walletAddress: "9mL5vR8wE1tY3hN6jK7dF4gS2aQ0pX8cB5iU3oW9zM",
        skills: ["DevOps", "Networking", "Linux"],
        floor: 1,
        status: "busy",
        bio: "Infrastructure wizard. If it's broken, I can fix it.",
        avatar: null,
      },
      {
        name: "Sam Okafor",
        walletAddress: "2pQ8nK5jM1rX3bH7wE9tY6cV4dF0gA8sL3iU7oZ5mN",
        skills: ["Python", "Machine Learning", "Data Science"],
        floor: 4,
        status: "online",
        bio: "AI researcher. Training models to understand the world.",
        avatar: null,
      },
      {
        name: "Riley Park",
        walletAddress: "6tY1cV4dF8gA2sL0iU3oW5mN7jK9bH2pQ8nR5xE3wM",
        skills: ["Solana", "DeFi", "Tokenomics"],
        floor: 3,
        status: "offline",
        bio: "DeFi degen turned serious builder. Shipping on Solana.",
        avatar: null,
      },
      {
        name: "Taylor Swift",
        walletAddress: "3hN6jK7dF4gS2aQ0pX8cB5iU3oW9zM1rL5vR8wE1tY",
        skills: ["Graphic Design", "Video Editing", "Branding"],
        floor: 2,
        status: "online",
        bio: "Creative director. Making Web3 look good.",
        avatar: null,
      },
    ])
    .returning();

  console.log(`Seeded ${residents.length} residents`);

  await db.insert(transactionsTable).values({
    type: "deposit",
    amount: "10000",
    token: "USDC",
    toWallet: "TreasuryWallet1234",
    description: "Initial treasury funding",
  });

  const bounties = await db
    .insert(bountiesTable)
    .values([
      {
        title: "Fix WiFi on Floor 3",
        description:
          "The WiFi access point on floor 3 keeps dropping connections. Need someone to diagnose and fix — could be hardware or config. Tools are in the utility closet.",
        rewardAmount: "50",
        rewardToken: "USDC",
        category: "Maintenance",
        creatorWallet: residents[0].walletAddress!,
        status: "open",
      },
      {
        title: "Build Community Dashboard",
        description:
          "Design and implement a real-time dashboard showing building occupancy, active events, and resource availability. React + WebSocket preferred.",
        rewardAmount: "200",
        rewardToken: "USDC",
        category: "Development",
        creatorWallet: residents[1].walletAddress!,
        status: "open",
      },
      {
        title: "Organize Hackathon Night",
        description:
          "Plan and run a Friday night hackathon event for all residents. Need: food ordering, project themes, judging criteria, and prizes from the treasury.",
        rewardAmount: "100",
        rewardToken: "USDC",
        category: "Community",
        creatorWallet: residents[3].walletAddress!,
        status: "open",
      },
      {
        title: "Set Up 3D Printer",
        description:
          "We got a new Bambu Lab X1 Carbon. Need someone to set it up in the maker space on floor 1, calibrate it, and write a usage guide for residents.",
        rewardAmount: "75",
        rewardToken: "USDC",
        category: "Setup",
        creatorWallet: residents[2].walletAddress!,
        status: "claimed",
        claimerWallet: residents[4].walletAddress,
      },
      {
        title: "Design Logo for Frontier Road",
        description:
          "Create a clean, modern logo for our community brand. Should work at small sizes and in both dark/light contexts. Deliverable: SVG + PNG assets.",
        rewardAmount: "150",
        rewardToken: "USDC",
        category: "Design",
        creatorWallet: residents[0].walletAddress!,
        status: "completed",
        claimerWallet: residents[5].walletAddress,
        proofOfWork: "Logo designed and delivered: frontier-road-logo-v2.svg",
      },
    ])
    .returning();

  console.log(`Seeded ${bounties.length} bounties`);

  for (const bounty of bounties) {
    await db.insert(transactionsTable).values({
      type: "escrow_lock",
      amount: bounty.rewardAmount,
      token: bounty.rewardToken,
      fromWallet: bounty.creatorWallet,
      bountyId: bounty.id,
      description: `Escrow locked for bounty: ${bounty.title}`,
    });
  }

  await db.insert(transactionsTable).values({
    type: "payout",
    amount: "150",
    token: "USDC",
    fromWallet: residents[0].walletAddress,
    toWallet: residents[5].walletAddress,
    bountyId: bounties[4].id,
    description: `Payout for completed bounty: Design Logo for Frontier Road`,
  });

  console.log("Seeded transactions");
  console.log("Database seeding complete!");
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed error:", err);
  process.exit(1);
});
