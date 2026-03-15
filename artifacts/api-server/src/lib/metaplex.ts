import { createRequire } from "module";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import {
  keypairIdentity,
  generateSigner,
  publicKey as umiPublicKey,
} from "@metaplex-foundation/umi";
import { fromWeb3JsKeypair } from "@metaplex-foundation/umi-web3js-adapters";
import { mplCore, create } from "@metaplex-foundation/mpl-core";
import { mplAgentIdentity } from "@metaplex-foundation/mpl-agent-registry";
import { getTowerKeypair, SOLANA_RPC, SOLANA_NETWORK } from "./solana.js";

const _require = createRequire(import.meta.url);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const identityModule = _require("@metaplex-foundation/mpl-agent-registry/dist/src/generated/identity") as any;
const { registerIdentityV1, safeFetchAgentIdentityV1, findAgentIdentityV1Pda } = identityModule;

export const AGENT_CARD_URI = "https://towerroad.replit.app/api/agent-card";
export const AGENT_REGISTRY_PROGRAM =
  "1DREGFgysWYxLnRnKQnwrxnJQeSMk2HmGaC6whw2B2p";

export function createTowerUmi() {
  const keypair = getTowerKeypair();
  if (!keypair) throw new Error("Tower Solana keypair not configured");
  const umi = createUmi(SOLANA_RPC)
    .use(mplCore())
    .use(mplAgentIdentity())
    .use(keypairIdentity(fromWeb3JsKeypair(keypair)));
  return umi;
}

export async function registerTowerAgent(): Promise<{
  assetPublicKey: string;
  createTx: string;
  registerTx: string;
}> {
  const umi = createTowerUmi();
  const assetSigner = generateSigner(umi);

  // Create MPL Core asset and wait for finalized confirmation so the
  // registerIdentityV1 simulation can read the asset account on-chain.
  const createResult = await create(umi, {
    asset: assetSigner,
    name: "Tower — Frontier Road AI Agent",
    uri: AGENT_CARD_URI,
  }).sendAndConfirm(umi, { confirm: { commitment: "finalized" } });

  // Small buffer to ensure state is propagated across devnet validators.
  await new Promise((r) => setTimeout(r, 3000));

  const registerResult = await registerIdentityV1(umi, {
    asset: assetSigner.publicKey,
    agentRegistrationUri: AGENT_CARD_URI,
  }).sendAndConfirm(umi, {
    send: { skipPreflight: true },
    confirm: { commitment: "confirmed" },
  });

  return {
    assetPublicKey: assetSigner.publicKey.toString(),
    createTx: Buffer.from(createResult.signature).toString("base64"),
    registerTx: Buffer.from(registerResult.signature).toString("base64"),
  };
}

export async function getTowerAgentStatus(): Promise<{
  registered: boolean;
  assetPublicKey: string | null;
  registrationUri: string | null;
  explorerUrl: string | null;
  network: string;
}> {
  const assetKey = process.env.TOWER_METAPLEX_ASSET;
  const network = SOLANA_NETWORK;
  const cluster = network === "mainnet-beta" ? "" : "?cluster=devnet";

  if (!assetKey) {
    return {
      registered: false,
      assetPublicKey: null,
      registrationUri: null,
      explorerUrl: null,
      network,
    };
  }

  const explorerUrl = `https://explorer.solana.com/address/${assetKey}${cluster}`;

  try {
    const umi = createTowerUmi();
    const assetPubkey = umiPublicKey(assetKey);
    const pda = findAgentIdentityV1Pda(umi, { asset: assetPubkey });
    const identity = await safeFetchAgentIdentityV1(umi, pda);

    return {
      registered: identity !== null,
      assetPublicKey: assetKey,
      registrationUri: identity ? AGENT_CARD_URI : null,
      explorerUrl,
      network,
    };
  } catch {
    return {
      registered: false,
      assetPublicKey: assetKey,
      registrationUri: null,
      explorerUrl,
      network,
    };
  }
}
