import { useState, useMemo } from 'react';
import { CyberCard } from '@/components/CyberCard';
import { CyberButton } from '@/components/CyberButton';
import { useBounties } from '@/hooks/use-bounties';
import { useTreasuryOverview, useTransactions } from '@/hooks/use-treasury';
import { useResidents } from '@/hooks/use-residents';
import { Activity, Crosshair, Users, Wallet, AlertTriangle, Building2, CheckCircle2, AlertCircle } from 'lucide-react';
import { Link } from 'wouter';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { ReportIssueModal } from '@/components/ReportIssueModal';

const EVENT_COLORS: Record<string, string> = {
  escrow_lock: 'text-secondary',
  payout: 'text-accent',
  deposit: 'text-green-400',
  refund: 'text-orange-400',
  escrow_release: 'text-primary',
  bounty_claim: 'text-primary',
};

const EVENT_LABELS: Record<string, string> = {
  escrow_lock: 'ESCROW_LOCKED',
  payout: 'PAYOUT_SENT',
  deposit: 'DEPOSIT',
  refund: 'REFUND',
  escrow_release: 'ESCROW_RELEASED',
  bounty_claim: 'BOUNTY_CLAIMED',
};

export default function Dashboard() {
  const { data: bounties, isLoading: bountiesLoading } = useBounties('open');
  const { data: allBounties } = useBounties();
  const { data: treasury, isLoading: treasuryLoading } = useTreasuryOverview();
  const { data: residents, isLoading: residentsLoading } = useResidents();
  const { data: transactions } = useTransactions(8);
  const [showReportModal, setShowReportModal] = useState(false);

  const activeBounties = bounties?.length || 0;
  const onlineResidents = residents?.filter(r => r.status === 'online').length || 0;

  const floorStatus = useMemo(() => {
    const floors: Record<number, { residents: number; online: number; issues: number; urgent: boolean }> = {};
    residents?.forEach(r => {
      const f = r.floor ?? 1;
      if (!floors[f]) floors[f] = { residents: 0, online: 0, issues: 0, urgent: false };
      floors[f].residents++;
      if (r.status === 'online') floors[f].online++;
    });

    const maintenanceBounties = (allBounties || []).filter(
      b => b.category === 'MAINTENANCE' && (b.status === 'open' || b.status === 'claimed')
    );
    maintenanceBounties.forEach(b => {
      const match = (b.title + ' ' + b.description).match(/floor\s+(\d+)/i);
      const f = match ? parseInt(match[1]) : 1;
      if (!floors[f]) floors[f] = { residents: 0, online: 0, issues: 0, urgent: false };
      floors[f].issues++;
      if (b.title.toLowerCase().includes('[urgent]')) floors[f].urgent = true;
    });

    const sorted = Object.entries(floors)
      .sort(([a], [b]) => Number(a) - Number(b))
      .map(([floor, data]) => ({ floor: Number(floor), ...data }));

    if (sorted.length === 0) {
      return [
        { floor: 1, residents: 0, online: 0, issues: 0, urgent: false },
        { floor: 2, residents: 0, online: 0, issues: 0, urgent: false },
        { floor: 3, residents: 0, online: 0, issues: 0, urgent: false },
      ];
    }
    return sorted;
  }, [residents, allBounties]);

  return (
    <div className="space-y-8 pb-12">
      {showReportModal && <ReportIssueModal onClose={() => setShowReportModal(false)} />}

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 border-b border-border/50 pb-6">
        <div>
          <h1 className="text-3xl font-display font-bold text-primary mb-2 glitch-text" data-text="SYSTEM_OVERVIEW">SYSTEM_OVERVIEW</h1>
          <p className="text-muted-foreground font-sans text-sm tracking-widest uppercase">Monitoring Frontier Road parameters</p>
        </div>
        <div className="flex items-center gap-3">
          <CyberButton variant="secondary" onClick={() => setShowReportModal(true)} className="text-xs">
            <AlertTriangle className="w-4 h-4 mr-1" /> REPORT_ISSUE
          </CyberButton>
          <Link href="/bounties">
            <CyberButton>POST_BOUNTY</CyberButton>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <CyberCard glow delay={0.1}>
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-display tracking-[0.2em] text-muted-foreground">ACTIVE_BOUNTIES</span>
            <Crosshair className="w-5 h-5 text-primary opacity-50" />
          </div>
          <div className="text-4xl font-sans font-bold text-foreground">
            {bountiesLoading ? '--' : activeBounties}
          </div>
          <div className="mt-2 text-xs text-primary/70 font-sans">Open tasks</div>
        </CyberCard>

        <CyberCard glow delay={0.2}>
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-display tracking-[0.2em] text-muted-foreground">TREASURY_POOL</span>
            <Wallet className="w-5 h-5 text-secondary opacity-50" />
          </div>
          <div className="text-4xl font-sans font-bold text-foreground flex items-baseline gap-1">
            {treasuryLoading ? '--' : treasury?.totalBalance?.toLocaleString()} <span className="text-sm text-secondary">USDC</span>
          </div>
          <div className="mt-2 text-xs text-secondary/70 font-sans">{treasury?.pendingEscrow || 0} locked in escrow</div>
        </CyberCard>

        <CyberCard glow delay={0.3}>
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-display tracking-[0.2em] text-muted-foreground">RESIDENTS_ONLINE</span>
            <Users className="w-5 h-5 text-accent opacity-50" />
          </div>
          <div className="text-4xl font-sans font-bold text-foreground">
            {residentsLoading ? '--' : onlineResidents} <span className="text-lg text-muted-foreground">/ {residents?.length || 0}</span>
          </div>
          <div className="mt-2 text-xs text-accent/70 font-sans flex items-center gap-1">
            <span className="w-1.5 h-1.5 bg-accent rounded-full animate-pulse" /> Network active
          </div>
        </CyberCard>

        <CyberCard glow delay={0.4} className="border-primary/20 bg-primary/5">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-display tracking-[0.2em] text-primary">TOWER_AI_STATUS</span>
            <Activity className="w-5 h-5 text-primary animate-pulse" />
          </div>
          <div className="text-2xl font-sans font-bold text-primary uppercase">
            OPTIMAL
          </div>
          <div className="mt-4">
            <Link href="/chat">
              <span className="text-xs uppercase tracking-widest text-foreground hover:text-primary transition-colors cursor-pointer border-b border-primary/30 pb-0.5">
                Initialize interface &rarr;
              </span>
            </Link>
          </div>
        </CyberCard>
      </div>

      {/* Building Status */}
      <div className="space-y-4">
        <h2 className="text-xl font-display font-bold text-foreground border-l-4 border-primary pl-3 uppercase tracking-widest">
          Building Status
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {floorStatus.map(fs => {
            const statusColor = fs.urgent ? 'border-red-500/50 bg-red-500/5' : fs.issues > 0 ? 'border-yellow-500/50 bg-yellow-500/5' : 'border-accent/30 bg-accent/5';
            const dotColor = fs.urgent ? 'bg-red-500' : fs.issues > 0 ? 'bg-yellow-500' : 'bg-accent';
            return (
              <CyberCard key={fs.floor} className={`${statusColor} p-4`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-muted-foreground" />
                    <span className="font-display tracking-widest text-sm text-foreground uppercase">Floor {fs.floor}</span>
                  </div>
                  <span className={`w-2.5 h-2.5 rounded-full ${dotColor} ${fs.urgent ? 'animate-pulse' : ''}`} />
                </div>
                <div className="flex items-center justify-between text-xs font-sans text-muted-foreground mb-2">
                  <span>{fs.online} online / {fs.residents} residents</span>
                </div>
                {fs.issues > 0 ? (
                  <div className="flex items-center gap-1.5 text-xs font-sans">
                    <AlertCircle className="w-3.5 h-3.5 text-yellow-500" />
                    <span className="text-yellow-500">{fs.issues} open issue{fs.issues > 1 ? 's' : ''}</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 text-xs font-sans">
                    <CheckCircle2 className="w-3.5 h-3.5 text-accent" />
                    <span className="text-accent">All clear</span>
                  </div>
                )}
                <div className="mt-3 pt-2 border-t border-border/30 flex gap-3">
                  <Link href={`/residents?floor=${fs.floor}`}>
                    <span className="text-[10px] uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors cursor-pointer">
                      Residents &rarr;
                    </span>
                  </Link>
                  <Link href={`/bounties?floor=${fs.floor}&category=MAINTENANCE`}>
                    <span className={`text-[10px] uppercase tracking-widest transition-colors cursor-pointer ${fs.issues > 0 ? 'text-yellow-500 hover:text-yellow-400' : 'text-muted-foreground hover:text-primary'}`}>
                      Issues{fs.issues > 0 ? ` (${fs.issues})` : ''} &rarr;
                    </span>
                  </Link>
                </div>
              </CyberCard>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <h2 className="text-xl font-display font-bold text-foreground border-l-4 border-secondary pl-3 uppercase tracking-widest">
            Recent Bounties
          </h2>
          {bountiesLoading ? (
            <div className="space-y-4">
              {[1,2,3].map(i => (
                <div key={i} className="h-24 bg-card border border-border animate-pulse" />
              ))}
            </div>
          ) : bounties && bounties.length > 0 ? (
            <div className="space-y-4">
              {bounties.slice(0, 3).map((bounty, i) => (
                <motion.div
                  key={bounty.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 + (i * 0.1) }}
                  className="bg-card border border-border p-4 hover:border-primary/50 transition-colors group flex flex-col sm:flex-row gap-4 justify-between sm:items-center"
                >
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] uppercase font-display bg-primary/20 text-primary px-2 py-0.5 tracking-widest">
                        {bounty.category}
                      </span>
                      <span className="text-[10px] text-muted-foreground font-sans">
                        ID:{bounty.id.toString().padStart(4, '0')}
                      </span>
                    </div>
                    <h3 className="font-bold font-sans text-foreground group-hover:text-primary transition-colors">{bounty.title}</h3>
                  </div>
                  <div className="flex items-center gap-4 text-sm font-sans">
                    <div className="text-right">
                      <div className="text-secondary font-bold">{bounty.rewardAmount} {bounty.rewardToken}</div>
                      <div className="text-xs text-muted-foreground">Reward</div>
                    </div>
                    <Link href={`/bounties`}>
                      <button className="border border-border hover:border-primary px-3 py-1 text-xs uppercase tracking-widest text-muted-foreground hover:text-primary transition-all">
                        View
                      </button>
                    </Link>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="p-8 border border-dashed border-border text-center text-muted-foreground font-sans text-sm">
              No open bounties detected in the sector.
            </div>
          )}
        </div>

        <div className="space-y-6">
          <h2 className="text-xl font-display font-bold text-foreground border-l-4 border-accent pl-3 uppercase tracking-widest">
            System Log
          </h2>
          <CyberCard className="p-0 overflow-hidden h-[300px]">
            <div className="p-4 space-y-4 text-xs font-sans h-full overflow-y-auto cyber-scrollbar">
              {transactions && transactions.length > 0 ? (
                transactions.map(tx => (
                  <div key={tx.id} className="border-b border-border/50 pb-2">
                    <span className="text-muted-foreground">[{format(new Date(tx.createdAt), 'HH:mm:ss')}]</span>{' '}
                    <span className={EVENT_COLORS[tx.type] || 'text-foreground'}>
                      {EVENT_LABELS[tx.type] || tx.type.toUpperCase().replace('_', '_')}
                    </span>
                    <br />
                    {tx.description || `${tx.amount} ${tx.token}`}
                  </div>
                ))
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground/50">
                  No events recorded yet.
                </div>
              )}
            </div>
          </CyberCard>
        </div>
      </div>
    </div>
  );
}
