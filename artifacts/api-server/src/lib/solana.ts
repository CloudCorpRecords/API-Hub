import {
  Connection,
  Keypair,
  PublicKey,
  LAMPORTS_PER_SOL,
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";

export const SOLANA_NETWORK = process.env.SOLANA_NETWORK ?? "devnet";
export const SOLANA_RPC =
  SOLANA_NETWORK === "mainnet-beta"
    ? "https://api.mainnet-beta.solana.com"
    : "https://api.devnet.solana.com";

export const EXPLORER_BASE =
  SOLANA_NETWORK === "mainnet-beta"
    ? "https://explorer.solana.com"
    : "https://explorer.solana.com/?cluster=devnet";

export const connection = new Connection(SOLANA_RPC, "confirmed");

export function getTowerKeypair(): Keypair | null {
  const pk = process.env.TOWER_SOLANA_PRIVATE_KEY;
  if (!pk) return null;
  try {
    const secretKey = Buffer.from(pk, "base64");
    return Keypair.fromSecretKey(secretKey);
  } catch {
    return null;
  }
}

export function getTowerPublicKey(): string | null {
  const pubkey = process.env.TOWER_SOLANA_PUBKEY;
  if (pubkey) return pubkey;
  const kp = getTowerKeypair();
  return kp ? kp.publicKey.toBase58() : null;
}

export async function getSolBalance(address: string): Promise<number> {
  const pubkey = new PublicKey(address);
  const lamports = await connection.getBalance(pubkey);
  return lamports / LAMPORTS_PER_SOL;
}

export async function transferSol(
  fromKeypair: Keypair,
  toAddress: string,
  amountSol: number,
): Promise<string> {
  const toPubkey = new PublicKey(toAddress);
  const lamports = Math.floor(amountSol * LAMPORTS_PER_SOL);

  const transaction = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: fromKeypair.publicKey,
      toPubkey,
      lamports,
    }),
  );

  const signature = await sendAndConfirmTransaction(connection, transaction, [
    fromKeypair,
  ]);
  return signature;
}

export function explorerTxUrl(signature: string): string {
  const cluster = SOLANA_NETWORK === "mainnet-beta" ? "" : "?cluster=devnet";
  return `https://explorer.solana.com/tx/${signature}${cluster}`;
}

export function explorerAddressUrl(address: string): string {
  const cluster = SOLANA_NETWORK === "mainnet-beta" ? "" : "?cluster=devnet";
  return `https://explorer.solana.com/address/${address}${cluster}`;
}
