import { CyberCard } from '@/components/CyberCard';
import { CyberButton } from '@/components/CyberButton';
import { useBounties } from '@/hooks/use-bounties';
import { useTreasuryOverview } from '@/hooks/use-treasury';
import { useResidents } from '@/hooks/use-residents';
import { Activity, Crosshair, Users, Wallet } from 'lucide-react';
import { Link } from 'wouter';
import { motion } from 'framer-motion';

export default function Dashboard() {
  const { data: bounties, isLoading: bountiesLoading } = useBounties('open');
  const { data: treasury, isLoading: treasuryLoading } = useTreasuryOverview();
  const { data: residents, isLoading: residentsLoading } = useResidents();

  const activeBounties = bounties?.length || 0;
  const onlineResidents = residents?.filter(r => r.status === 'online').length || 0;

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 border-b border-border/50 pb-6">
        <div>
          <h1 className="text-3xl font-display font-bold text-primary mb-2 glitch-text" data-text="SYSTEM_OVERVIEW">SYSTEM_OVERVIEW</h1>
          <p className="text-muted-foreground font-sans text-sm tracking-widest uppercase">Monitoring Frontier Road parameters</p>
        </div>
        <Link href="/bounties">
          <CyberButton>POST_BOUNTY</CyberButton>
        </Link>
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
          <div className="mt-2 text-xs text-primary/70 font-sans">+2 in last 24h</div>
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
              <div className="border-b border-border/50 pb-2">
                <span className="text-muted-foreground">[08:42:11]</span> <span className="text-accent">RESIDENT_JOIN</span> <br/>
                0x7F...3A9 connected from Floor 3
              </div>
              <div className="border-b border-border/50 pb-2">
                <span className="text-muted-foreground">[07:15:00]</span> <span className="text-secondary">ESCROW_LOCKED</span> <br/>
                250 USDC secured for Bounty #0042
              </div>
              <div className="border-b border-border/50 pb-2">
                <span className="text-muted-foreground">[06:33:22]</span> <span className="text-primary">BOUNTY_CLAIMED</span> <br/>
                Resident 'Neo' claimed "Fix Router Config"
              </div>
              <div className="pb-2">
                <span className="text-muted-foreground">[01:05:00]</span> <span className="text-foreground">SYS_UPDATE</span> <br/>
                TowerOS routine maintenance completed.
              </div>
            </div>
          </CyberCard>
        </div>
      </div>
    </div>
  );
}
