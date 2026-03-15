import { useMemo } from 'react';
import { useTreasuryOverview, useTransactions } from '@/hooks/use-treasury';
import { CyberCard } from '@/components/CyberCard';
import { format, subDays, startOfDay } from 'date-fns';
import { ArrowRightLeft, ArrowDownToLine, ArrowUpFromLine, Lock, Unlock } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, Tooltip } from 'recharts';

export default function Treasury() {
  const { data: overview, isLoading: overviewLoading } = useTreasuryOverview();
  const { data: transactions, isLoading: txLoading } = useTransactions();

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
        </div>
      </div>
    </div>
  );
}
