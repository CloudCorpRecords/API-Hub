import { useState, useMemo, useRef, useEffect } from 'react';
import { useBounties, useCreateBountyMutation, useClaimBountyMutation, useCompleteBountyMutation } from '@/hooks/use-bounties';
import { useWallet } from '@/hooks/use-wallet';
import { CyberCard } from '@/components/CyberCard';
import { CyberButton } from '@/components/CyberButton';
import { CyberInput } from '@/components/CyberInput';
import { format } from 'date-fns';
import { Filter, Search, CheckCircle2, ShieldAlert, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useSearch } from 'wouter';

type TabType = 'open' | 'claimed' | 'completed';

function ProofModal({ bountyId, onClose, onSubmit, isLoading }: {
  bountyId: number;
  onClose: () => void;
  onSubmit: (proof: string, note: string) => void;
  isLoading: boolean;
}) {
  const [proofUrl, setProofUrl] = useState('');
  const [note, setNote] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-md border border-primary/40 bg-card p-6 space-y-5 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-border pb-3">
          <h3 className="text-lg font-display tracking-widest text-primary uppercase">Submit Proof</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
        </div>
        <div className="space-y-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-display tracking-widest text-primary uppercase">Proof URL *</label>
            <input
              ref={inputRef}
              value={proofUrl}
              onChange={e => setProofUrl(e.target.value)}
              placeholder="GitHub PR, image URL, demo link..."
              className="w-full bg-background/50 border border-border px-4 py-2.5 text-foreground font-sans text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/50 transition-all"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-display tracking-widest text-muted-foreground uppercase">Note (optional)</label>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Additional context..."
              className="w-full bg-background/50 border border-border px-4 py-2.5 text-foreground font-sans text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/50 transition-all min-h-[80px]"
            />
          </div>
        </div>
        <div className="flex justify-end gap-3 pt-2 border-t border-border">
          <CyberButton variant="ghost" onClick={onClose} className="text-xs">CANCEL</CyberButton>
          <CyberButton
            disabled={!proofUrl.trim()}
            isLoading={isLoading}
            onClick={() => onSubmit(proofUrl, note)}
            className="text-xs"
          >
            VERIFY_&_RELEASE
          </CyberButton>
        </div>
      </div>
    </div>
  );
}

export default function Bounties() {
  const searchString = useSearch();
  const params = new URLSearchParams(searchString);
  const floorFilter = params.get('floor');
  const categoryFilter = params.get('category');

  const [activeTab, setActiveTab] = useState<TabType>('open');
  const { data: bounties, isLoading } = useBounties(activeTab);
  const { isConnected, walletAddress } = useWallet();
  const { toast } = useToast();

  const [searchQuery, setSearchQuery] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [createForm, setCreateForm] = useState({ title: '', description: '', amount: '', category: '' });
  const [proofModalBountyId, setProofModalBountyId] = useState<number | null>(null);

  const createMutation = useCreateBountyMutation();
  const claimMutation = useClaimBountyMutation();
  const completeMutation = useCompleteBountyMutation();

  const filteredBounties = useMemo(() => {
    if (!bounties) return [];
    let result = bounties;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(b =>
        b.title.toLowerCase().includes(q) ||
        b.description.toLowerCase().includes(q) ||
        b.category.toLowerCase().includes(q)
      );
    }

    if (categoryFilter) {
      result = result.filter(b => b.category.toUpperCase() === categoryFilter.toUpperCase());
    }

    if (floorFilter) {
      result = result.filter(b =>
        b.title.toLowerCase().includes(`floor ${floorFilter}`) ||
        b.description.toLowerCase().includes(`floor ${floorFilter}`)
      );
    }

    return result;
  }, [bounties, searchQuery, categoryFilter, floorFilter]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConnected || !walletAddress) {
      toast({ title: "ACCESS DENIED", description: "Log in or connect wallet to post bounties.", variant: "destructive" });
      return;
    }

    try {
      await createMutation.mutateAsync({
        data: {
          title: createForm.title,
          description: createForm.description,
          rewardAmount: Number(createForm.amount),
          category: createForm.category || 'GENERAL',
          creatorWallet: walletAddress,
          rewardToken: 'USDC'
        }
      });
      setIsCreating(false);
      setCreateForm({ title: '', description: '', amount: '', category: '' });
      toast({ title: "SUCCESS", description: "Bounty posted to network." });
    } catch (err) {
      toast({ title: "ERROR", description: "Failed to create bounty.", variant: "destructive" });
    }
  };

  const handleClaim = async (id: number) => {
    if (!isConnected || !walletAddress) {
      toast({ title: "ACCESS DENIED", description: "Log in or connect wallet first.", variant: "destructive" });
      return;
    }
    try {
      await claimMutation.mutateAsync({ id, data: { claimerWallet: walletAddress } });
      toast({ title: "CLAIMED", description: "Bounty assigned to you." });
    } catch (err) {
      toast({ title: "ERROR", description: "Failed to claim.", variant: "destructive" });
    }
  };

  const handleComplete = async (proofUrl: string, note: string) => {
    if (!proofModalBountyId) return;
    const proof = note ? `${proofUrl} — ${note}` : proofUrl;

    try {
      await completeMutation.mutateAsync({ id: proofModalBountyId, data: { proofOfWork: proof } });
      toast({ title: "VERIFIED", description: "Proof submitted. Escrow released." });
      setProofModalBountyId(null);
    } catch (err) {
      toast({ title: "ERROR", description: "Verification failed.", variant: "destructive" });
    }
  };

  if (isCreating) {
    return (
      <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4">
        <div className="flex items-center justify-between border-b border-primary/30 pb-4">
          <h1 className="text-2xl font-display font-bold text-primary uppercase tracking-widest">Post New Bounty</h1>
          <button onClick={() => setIsCreating(false)} className="text-muted-foreground hover:text-foreground font-sans text-sm uppercase">Cancel [X]</button>
        </div>
        <CyberCard>
          <form onSubmit={handleCreate} className="space-y-6">
            <CyberInput
              label="Bounty Title"
              required
              value={createForm.title}
              onChange={e => setCreateForm({...createForm, title: e.target.value})}
              placeholder="e.g. Optimize React rendering..."
            />
            <div className="flex flex-col gap-1.5 w-full">
              <label className="text-xs font-display tracking-widest text-primary uppercase">Description</label>
              <textarea
                required
                value={createForm.description}
                onChange={e => setCreateForm({...createForm, description: e.target.value})}
                className="w-full bg-background/50 border border-border px-4 py-2.5 text-foreground font-sans text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/50 transition-all rounded-none min-h-[120px]"
                placeholder="Detailed requirements..."
              />
            </div>
            <div className="grid grid-cols-2 gap-6">
              <CyberInput
                label="Reward Amount (USDC)"
                type="number"
                required
                value={createForm.amount}
                onChange={e => setCreateForm({...createForm, amount: e.target.value})}
                placeholder="100"
              />
              <CyberInput
                label="Category / Tag"
                required
                value={createForm.category}
                onChange={e => setCreateForm({...createForm, category: e.target.value})}
                placeholder="ENGINEERING"
              />
            </div>

            <div className="bg-primary/5 border border-primary/20 p-4 mt-6 flex items-start gap-4">
              <ShieldAlert className="w-5 h-5 text-primary shrink-0 mt-0.5" />
              <div className="text-xs font-sans text-muted-foreground">
                <strong className="text-primary block mb-1">ESCROW LOCK WARNING</strong>
                Submitting this bounty will lock the specified USDC amount from your wallet into the community smart contract escrow until completion is verified.
              </div>
            </div>

            <div className="pt-4 border-t border-border flex justify-end">
              <CyberButton type="submit" isLoading={createMutation.isPending}>
                INITIALIZE_ESCROW & POST
              </CyberButton>
            </div>
          </form>
        </CyberCard>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {proofModalBountyId !== null && (
        <ProofModal
          bountyId={proofModalBountyId}
          onClose={() => setProofModalBountyId(null)}
          onSubmit={handleComplete}
          isLoading={completeMutation.isPending}
        />
      )}

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground tracking-widest uppercase">Bounty_Board</h1>
          <p className="text-muted-foreground font-sans text-sm">
            Open tasks and network requests
            {(floorFilter || categoryFilter) && (
              <span className="ml-2 text-primary">
                [{floorFilter ? `Floor ${floorFilter}` : ''}{floorFilter && categoryFilter ? ' / ' : ''}{categoryFilter || ''}]
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-4 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-card border border-border pl-9 pr-4 py-2 text-sm font-sans focus:outline-none focus:border-primary transition-colors"
              placeholder="Search bounties..."
            />
          </div>
          <CyberButton onClick={() => setIsCreating(true)}>NEW_TASK</CyberButton>
        </div>
      </div>

      <div className="flex gap-1 border-b border-border">
        {(['open', 'claimed', 'completed'] as TabType[]).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-6 py-3 font-display uppercase tracking-widest text-sm transition-all relative ${
              activeTab === tab
                ? 'text-primary'
                : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
            }`}
          >
            {tab}
            {activeTab === tab && (
              <span className="absolute bottom-0 left-0 w-full h-[2px] bg-primary cyber-glow" />
            )}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="grid gap-4">
          {[1,2,3].map(i => <div key={i} className="h-32 bg-card border border-border animate-pulse" />)}
        </div>
      ) : filteredBounties.length === 0 ? (
        <div className="py-20 text-center border border-dashed border-border bg-card/50">
          <Filter className="w-8 h-8 text-muted-foreground mx-auto mb-4 opacity-50" />
          <h3 className="font-display uppercase tracking-widest text-lg text-foreground">No records found</h3>
          <p className="font-sans text-sm text-muted-foreground mt-2">
            {searchQuery ? 'No bounties match your search query.' : 'The network is quiet for this category.'}
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredBounties.map((bounty) => (
            <CyberCard key={bounty.id} className="p-5 flex flex-col md:flex-row gap-6 hover:border-primary/40 group transition-all">
              <div className="flex-1 space-y-3">
                <div className="flex items-center gap-3">
                  <span className="px-2 py-0.5 bg-border text-foreground font-display text-[10px] tracking-widest uppercase">
                    ID:{bounty.id.toString().padStart(4, '0')}
                  </span>
                  <span className="text-primary font-display text-xs tracking-widest uppercase border border-primary/30 px-2 py-0.5">
                    {bounty.category}
                  </span>
                  <span className="text-muted-foreground font-sans text-xs">
                    {format(new Date(bounty.createdAt), 'MMM dd, HH:mm')}
                  </span>
                </div>
                <h3 className="text-xl font-bold font-sans text-foreground">{bounty.title}</h3>
                <p className="text-sm font-sans text-muted-foreground line-clamp-2">{bounty.description}</p>
                <div className="text-xs font-sans text-muted-foreground/50">
                  Creator: {bounty.creatorWallet.slice(0,6)}...{bounty.creatorWallet.slice(-4)}
                </div>
              </div>

              <div className="flex md:flex-col items-center md:items-end justify-between md:justify-center gap-4 md:w-48 shrink-0 md:border-l md:border-border md:pl-6">
                <div className="text-left md:text-right">
                  <div className="text-2xl font-bold text-secondary font-sans">{bounty.rewardAmount}</div>
                  <div className="text-xs font-display tracking-widest uppercase text-secondary/70">{bounty.rewardToken} REWARD</div>
                </div>

                {activeTab === 'open' && (
                  <CyberButton
                    variant="primary"
                    className="w-full text-xs py-1.5"
                    onClick={() => handleClaim(bounty.id)}
                    isLoading={claimMutation.isPending}
                  >
                    CLAIM_TASK
                  </CyberButton>
                )}

                {activeTab === 'claimed' && bounty.claimerWallet === walletAddress && (
                  <CyberButton
                    variant="accent"
                    className="w-full text-xs py-1.5"
                    onClick={() => setProofModalBountyId(bounty.id)}
                    isLoading={completeMutation.isPending}
                  >
                    SUBMIT_PROOF
                  </CyberButton>
                )}

                {activeTab === 'claimed' && bounty.claimerWallet !== walletAddress && (
                  <div className="text-xs font-sans text-muted-foreground text-center border border-dashed border-border w-full py-1.5">
                    IN_PROGRESS
                  </div>
                )}

                {activeTab === 'completed' && (
                  <div className="flex items-center gap-2 text-accent font-display tracking-widest text-sm uppercase">
                    <CheckCircle2 className="w-4 h-4" /> VERIFIED
                  </div>
                )}
              </div>
            </CyberCard>
          ))}
        </div>
      )}
    </div>
  );
}
