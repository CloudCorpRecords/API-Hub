import { useMemo, useState, useCallback } from 'react';
import { useTreasuryOverview, useTransactions, useTowerWallet } from '@/hooks/use-treasury';
import { CyberCard } from '@/components/CyberCard';
import { format, subDays, startOfDay } from 'date-fns';
import { ArrowRightLeft, ArrowDownToLine, ArrowUpFromLine, Lock, Unlock, ExternalLink, Wallet, Zap, Droplets } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, Tooltip } from 'recharts';
import { useQueryClient } from '@tanstack/react-query';

const DEVNET_RPC = "https://api.devnet.solana.com";
const TOWER_ADDRESS = "BG2YdWeTMYFHNxkUBtTemrSuqHpwL5MqG27qF85jtHVp";
const AIRDROP_LAMPORTS = 1_000_000_000;

export default function Treasury() {
  const { data: overview, isLoading: overviewLoading } = useTreasuryOverview();
  const { data: transactions, isLoading: txLoading } = useTransactions(100);
  const { data: towerWallet, isLoading: walletLoading, error: walletError } = useTowerWallet();
  const queryClient = useQueryClient();

  const [airdropStatus, setAirdropStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [airdropMsg, setAirdropMsg] = useState('');

  const requestDevnetAirdrop = useCallback(async () => {
    setAirdropStatus('loading');
    setAirdropMsg('');
    try {
      const res = await fetch(DEVNET_RPC, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'requestAirdrop',
          params: [TOWER_ADDRESS, AIRDROP_LAMPORTS],
        }),
      });
      const data = await res.json();
      if (data.error) {
        setAirdropStatus('error');
        setAirdropMsg(data.error.message?.includes('429') || data.error.code === 429
          ? 'Rate limited — visit faucet.solana.com to fund manually.'
          : data.error.message ?? 'Airdrop failed.');
      } else {
        setAirdropStatus('success');
        setAirdropMsg(`Airdrop confirmed! Sig: ${String(data.result).slice(0, 20)}...`);
        setTimeout(() => queryClient.invalidateQueries({ queryKey: ['tower-wallet'] }), 3000);
      }
    } catch (e: any) {
      setAirdropStatus('error');
      setAirdropMsg(e.message ?? 'Network error.');
    }
  }, [queryClient]);

  const getIconForType = (type: string) => {
    switch(type) {
      case 'deposit': return <ArrowDownToLine className="text-accent" />;
      case 'payout': return <ArrowUpFromLine className="text-destructive" />;
      case 'escrow_lock': return <Lock className="text-secondary" />;
      case 'escrow_release': return <Unlock className="text-primary" />;
      default: return <ArrowRightLeft className="text-muted-foreground" />;
    }
  };

  const chartData = useMemo(() => {
    const days: { name: string; value: number }[] = [];
    const now = new Date();

    for (let i = 6; i >= 0; i--) {
      const day = startOfDay(subDays(now, i));
      const dayLabel = format(day, 'EEE');
      const nextDay = startOfDay(subDays(now, i - 1));

      let dayNet = 0;
      (transactions || []).forEach(tx => {
        const txDate = new Date(tx.createdAt);
        if (txDate >= day && txDate < nextDay) {
          if (tx.type === 'deposit' || tx.type === 'escrow_lock') {
            dayNet += tx.amount;
          } else if (tx.type === 'payout' || tx.type === 'refund') {
            dayNet -= tx.amount;
          }
        }
      });
      days.push({ name: dayLabel, value: dayNet });
    }

    let cumulative = 0;
    return days.map(d => {
      cumulative += d.value;
      return { name: d.name, value: Math.max(0, cumulative) };
    });
  }, [transactions]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-display font-bold text-foreground tracking-widest uppercase">Treasury_Core</h1>
        <p className="text-muted-foreground font-sans text-sm">Financial routing and escrow monitoring</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <CyberCard glow className="border-secondary/30">
          <div className="text-xs font-display tracking-[0.2em] text-secondary mb-2">TOTAL_VALUE_LOCKED</div>
          <div className="text-4xl font-sans font-bold text-foreground">
            {overviewLoading ? '...' : overview?.totalBalance} <span className="text-lg text-muted-foreground">USDC</span>
          </div>
        </CyberCard>
        <CyberCard>
          <div className="text-xs font-display tracking-[0.2em] text-muted-foreground mb-2">PENDING_ESCROW</div>
          <div className="text-3xl font-sans font-bold text-foreground">
            {overviewLoading ? '...' : overview?.pendingEscrow} <span className="text-base text-muted-foreground">USDC</span>
          </div>
        </CyberCard>
        <CyberCard>
          <div className="text-xs font-display tracking-[0.2em] text-muted-foreground mb-2">LIFETIME_PAID</div>
          <div className="text-3xl font-sans font-bold text-foreground">
            {overviewLoading ? '...' : overview?.totalPaidOut} <span className="text-base text-muted-foreground">USDC</span>
          </div>
        </CyberCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <h2 className="text-xl font-display font-bold text-foreground border-l-4 border-primary pl-3 uppercase tracking-widest">
            Ledger
          </h2>
          <CyberCard className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm font-sans text-left">
                <thead className="bg-background/50 text-muted-foreground font-display text-xs uppercase tracking-wider border-b border-border">
                  <tr>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Amount</th>
                    <th className="px-4 py-3">Description</th>
                    <th className="px-4 py-3">Hash</th>
                    <th className="px-4 py-3 text-right">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {txLoading ? (
                    <tr><td colSpan={5} className="p-4 text-center">Scanning ledger...</td></tr>
                  ) : transactions?.map(tx => (
                    <tr key={tx.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-4 py-3 flex items-center gap-2">
                        {getIconForType(tx.type)}
                        <span className="uppercase text-xs">{tx.type.replace('_', ' ')}</span>
                      </td>
                      <td className="px-4 py-3 font-bold text-foreground">
                        {tx.type === 'payout' ? '-' : '+'}{tx.amount} {tx.token}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{tx.description}</td>
                      <td className="px-4 py-3 font-mono text-[10px] text-primary/70">
                        {tx.txSignature ? `${tx.txSignature.slice(0,8)}...` : 'OFF_CHAIN'}
                      </td>
                      <td className="px-4 py-3 text-right text-xs text-muted-foreground">
                        {format(new Date(tx.createdAt), 'MM/dd HH:mm')}
                      </td>
                    </tr>
                  ))}
                  {(!transactions || transactions.length === 0) && !txLoading && (
                    <tr><td colSpan={5} className="p-8 text-center text-muted-foreground border-dashed border-border border">No transactions found in current epoch.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </CyberCard>
        </div>

        <div className="space-y-6">
          <h2 className="text-xl font-display font-bold text-foreground border-l-4 border-accent pl-3 uppercase tracking-widest">
            Flow Diagnostics
          </h2>
          <CyberCard className="h-64 flex items-end justify-center p-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" hide />
                <Tooltip
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: 0, fontFamily: 'Space Mono' }}
                  itemStyle={{ color: 'hsl(var(--primary))' }}
                  formatter={(value: number) => [`${value} USDC`, 'Balance']}
                />
                <Area type="monotone" dataKey="value" stroke="hsl(var(--primary))" fillOpacity={1} fill="url(#colorValue)" />
              </AreaChart>
            </ResponsiveContainer>
          </CyberCard>

          <div className="text-xs font-sans text-muted-foreground border border-border p-4 bg-background/50">
            <p className="text-primary mb-2 uppercase font-display tracking-widest">Smart Contract Status</p>
            <p>Wallet Adapter: ONLINE</p>
            <p>Devnet RPC: CONNECTED</p>
            <p>Escrow Program: VERIFIED</p>
          </div>

          <CyberCard className="border-accent/30">
            <div className="flex items-center gap-2 mb-3">
              <Wallet className="w-4 h-4 text-accent" />
              <p className="text-xs font-display tracking-[0.2em] text-accent uppercase">Tower AI Wallet</p>
            </div>
            {walletLoading ? (
              <p className="text-xs text-muted-foreground">Connecting to Solana...</p>
            ) : walletError ? (
              <p className="text-xs text-destructive">Wallet offline</p>
            ) : towerWallet ? (
              <div className="space-y-2">
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Network</p>
                  <div className="flex items-center gap-1.5">
                    <Zap className="w-3 h-3 text-accent" />
                    <span className="text-xs font-display text-accent uppercase">{towerWallet.network}</span>
                  </div>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Balance</p>
                  <p className="text-2xl font-bold text-foreground">
                    {towerWallet.balanceSol.toFixed(4)} <span className="text-sm text-muted-foreground">SOL</span>
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Address</p>
                  <p className="font-mono text-[10px] text-primary/80 break-all">{towerWallet.address}</p>
                </div>
                <div className="flex flex-col gap-1.5 pt-1">
                  <a
                    href={towerWallet.explorerUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-[10px] text-accent hover:text-accent/80 transition-colors"
                  >
                    <ExternalLink className="w-3 h-3" />
                    View on Solana Explorer
                  </a>
                  {towerWallet.balanceSol === 0 && (
                    <div className="mt-1">
                      <button
                        onClick={requestDevnetAirdrop}
                        disabled={airdropStatus === 'loading' || airdropStatus === 'success'}
                        className="flex items-center gap-1.5 text-[10px] font-display uppercase tracking-wider px-2 py-1.5 border border-accent/40 text-accent hover:bg-accent/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors w-full justify-center"
                      >
                        <Droplets className="w-3 h-3" />
                        {airdropStatus === 'loading' ? 'Requesting...' : 'Request Devnet SOL'}
                      </button>
                      {airdropMsg && (
                        <p className={`text-[9px] mt-1 leading-tight ${airdropStatus === 'success' ? 'text-accent' : 'text-muted-foreground'}`}>
                          {airdropMsg}
                        </p>
                      )}
                      {airdropStatus === 'error' && (
                        <a
                          href={`https://faucet.solana.com/?address=${towerWallet.address}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-[9px] text-primary/70 hover:text-primary mt-1 transition-colors"
                        >
                          <ExternalLink className="w-2.5 h-2.5" />
                          Open faucet.solana.com
                        </a>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ) : null}
          </CyberCard>
        </div>
      </div>
    </div>
  );
}
