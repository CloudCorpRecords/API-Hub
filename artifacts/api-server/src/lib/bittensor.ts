import { Keyring } from "@polkadot/keyring";
import { cryptoWaitReady } from "@polkadot/util-crypto";

export const BITTENSOR_NETWORK = process.env.BITTENSOR_NETWORK ?? "finney";

const TAOSTATS_API = "https://api.taostats.io/api";

const BITTENSOR_RPC_URLS: Record<string, string> = {
  finney: "https://entrypoint-finney.opentensor.ai:443",
  test: "https://test.finney.opentensor.ai:443",
};

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

  try {
    const rpcUrl = BITTENSOR_RPC_URLS[BITTENSOR_NETWORK] ?? BITTENSOR_RPC_URLS.finney;
    const body = JSON.stringify({
      id: 1,
      jsonrpc: "2.0",
      method: "state_getStorage",
      params: [],
    });
    const res = await fetch(rpcUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      signal: AbortSignal.timeout(8000),
    });
    if (res.ok) {
      return {
        balance: 0,
        freeBalance: 0,
        stakedBalance: 0,
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

export async function queryBittensorSubnet(prompt: string): Promise<string> {
  const apiKey = process.env.CORCEL_API_KEY;
  if (!apiKey) {
    return "Bittensor subnet AI is not configured (no CORCEL_API_KEY). The query cannot be routed to the decentralized network at this time.";
  }

  try {
    const res = await fetch("https://api.corcel.io/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3",
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
    return `Failed to reach Bittensor subnet: ${e?.message ?? "network error"}`;
  }
}
