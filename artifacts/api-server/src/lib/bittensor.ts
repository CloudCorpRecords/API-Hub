import { Keyring } from "@polkadot/keyring";
import { cryptoWaitReady } from "@polkadot/util-crypto";

export const BITTENSOR_NETWORK = process.env.BITTENSOR_NETWORK ?? "finney";

const TAOSTATS_API = "https://api.taostats.io/api";

let _keyring: Keyring | null = null;

async function getKeyring(): Promise<Keyring> {
  if (!_keyring) {
    await cryptoWaitReady();
    _keyring = new Keyring({ type: "sr25519", ss58Format: 42 });
  }
  return _keyring;
}

export function getTowerSS58(): string {
  return process.env.TOWER_BITTENSOR_SS58 ?? "";
}

export async function getTowerPair() {
  const mnemonic = process.env.TOWER_BITTENSOR_MNEMONIC;
  if (!mnemonic) return null;
  const keyring = await getKeyring();
  return keyring.addFromUri(mnemonic);
}

export function explorerAddressUrl(ss58: string): string {
  return `https://taostats.io/coldkey/${ss58}`;
}

export function explorerTxUrl(blockHash: string): string {
  return `https://taostats.io/extrinsic/${blockHash}`;
}

export async function getTaoBalance(ss58Address: string): Promise<{
  balance: number;
  freeBalance: number;
  stakedBalance: number;
  address: string;
  network: string;
}> {
  try {
    const url = `${TAOSTATS_API}/account/?address=${ss58Address}&format=json`;
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(8000),
    });

    if (res.ok) {
      const data = await res.json();
      const account = Array.isArray(data) ? data[0] : data;
      const freeBalance = Number(account?.balance_free ?? account?.free ?? 0) / 1e9;
      const stakedBalance = Number(account?.balance_staked ?? account?.staked ?? 0) / 1e9;
      return {
        balance: freeBalance + stakedBalance,
        freeBalance,
        stakedBalance,
        address: ss58Address,
        network: BITTENSOR_NETWORK,
      };
    }
  } catch (_e) {
  }

  return {
    balance: 0,
    freeBalance: 0,
    stakedBalance: 0,
    address: ss58Address,
    network: BITTENSOR_NETWORK,
  };
}

export function getBittensorAiConfig(): { baseUrl: string; apiKey: string } | null {
  const baseUrl = process.env.BITTENSOR_AI_BASE_URL;
  const apiKey = process.env.BITTENSOR_AI_KEY;
  if (!baseUrl || !apiKey) return null;
  return { baseUrl: baseUrl.replace(/\/$/, ""), apiKey };
}

export async function queryBittensorSubnet(prompt: string): Promise<string> {
  const config = getBittensorAiConfig();

  if (!config) {
    return [
      "Bittensor subnet AI is not configured.",
      "To enable it, set these two environment variables:",
      "  BITTENSOR_AI_BASE_URL — OpenAI-compatible base URL of a Bittensor gateway",
      "  BITTENSOR_AI_KEY     — API key for that gateway",
      "",
      "Working gateways (all free-tier or trial available):",
      "  • nineteen.ai  →  https://api.nineteen.ai/v1",
      "  • targon       →  https://targon.sybil.com/api/v1",
      "  • chutes.ai    →  https://llm.chutes.ai/v1",
    ].join("\n");
  }

  try {
    const res = await fetch(`${config.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instruct",
        stream: false,
        messages: [
          {
            role: "system",
            content:
              "You are a helpful AI assistant running on the Bittensor decentralized network. Provide concise, accurate responses.",
          },
          { role: "user", content: prompt },
        ],
        max_tokens: 512,
      }),
      signal: AbortSignal.timeout(20000),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => res.statusText);
      return `Bittensor subnet returned an error (${res.status}): ${errText}`;
    }

    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content;
    return content ?? "Bittensor subnet returned an empty response.";
  } catch (e: any) {
    return `Failed to reach Bittensor subnet at ${config.baseUrl}: ${e?.message ?? "network error"}`;
  }
}
