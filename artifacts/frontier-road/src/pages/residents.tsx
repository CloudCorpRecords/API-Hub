import { useState, useMemo } from 'react';
import { useResidents, useCreateResidentMutation } from '@/hooks/use-residents';
import { CyberCard } from '@/components/CyberCard';
import { CyberButton } from '@/components/CyberButton';
import { CyberInput } from '@/components/CyberInput';
import { Search, MapPin, Award, Activity, Shield } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useSearch } from 'wouter';

export default function Residents() {
  const searchString = useSearch();
  const params = new URLSearchParams(searchString);
  const floorFilter = params.get('floor');

  const [search, setSearch] = useState('');
  const { data: residents, isLoading } = useResidents();
  const [isRegistering, setIsRegistering] = useState(false);
  const { toast } = useToast();
  const createMutation = useCreateResidentMutation();
  
  const [form, setForm] = useState({ name: '', skills: '', floor: '', bio: '' });

  const filtered = useMemo(() => {
    let result = residents || [];
    if (floorFilter) {
      result = result.filter(r => r.floor === parseInt(floorFilter));
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(r =>
        r.name.toLowerCase().includes(q) ||
        r.skills.some(s => s.toLowerCase().includes(q))
      );
    }
    return result;
  }, [residents, search, floorFilter]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createMutation.mutateAsync({
        data: {
          name: form.name,
          skills: form.skills.split(',').map(s => s.trim()).filter(Boolean),
          floor: parseInt(form.floor) || 1,
          bio: form.bio,
          walletAddress: 'DemoWallet' + Math.floor(Math.random()*1000)
        }
      });
      setIsRegistering(false);
      toast({ title: "REGISTERED", description: "Identity added to grid." });
    } catch {
      toast({ title: "ERROR", variant: "destructive" });
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground tracking-widest uppercase">Resident_Hub</h1>
          <p className="text-muted-foreground font-sans text-sm">
            Identity matrix and skill matching
            {floorFilter && <span className="ml-2 text-primary">[Floor {floorFilter}]</span>}
          </p>
        </div>
        <div className="flex items-center gap-4 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary" />
            <input 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-card/50 border border-primary/30 pl-9 pr-4 py-2 text-sm font-sans focus:outline-none focus:border-primary transition-colors text-primary placeholder:text-primary/30"
              placeholder="Search ident/skills..."
            />
          </div>
          <CyberButton variant="secondary" onClick={() => setIsRegistering(true)}>REGISTER</CyberButton>
        </div>
      </div>

      {isRegistering && (
        <CyberCard className="mb-8 border-secondary/50">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-display text-secondary tracking-widest">NEW_IDENTITY_ENTRY</h2>
            <button onClick={() => setIsRegistering(false)} className="text-muted-foreground text-sm">[X]</button>
          </div>
          <form onSubmit={handleRegister} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <CyberInput label="Handle / Name" value={form.name} onChange={e=>setForm({...form, name: e.target.value})} required />
            <CyberInput label="Sector / Floor" type="number" value={form.floor} onChange={e=>setForm({...form, floor: e.target.value})} />
            <div className="md:col-span-2">
              <CyberInput label="Skills (comma separated)" value={form.skills} onChange={e=>setForm({...form, skills: e.target.value})} placeholder="React, Rust, Soldering..." required />
            </div>
            <div className="md:col-span-2">
              <label className="text-xs font-display tracking-widest text-primary uppercase">Bio</label>
              <textarea 
                className="w-full mt-1 bg-background/50 border border-border p-2 text-sm font-sans text-foreground focus:border-primary outline-none"
                value={form.bio} onChange={e=>setForm({...form, bio: e.target.value})}
              />
            </div>
            <div className="md:col-span-2 flex justify-end mt-2">
              <CyberButton type="submit" variant="secondary" isLoading={createMutation.isPending}>EXECUTE_INSERT</CyberButton>
            </div>
          </form>
        </CyberCard>
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {[1,2,3,4,5,6].map(i => <div key={i} className="h-64 bg-card border border-border animate-pulse" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filtered?.map((resident) => (
            <CyberCard key={resident.id} className="flex flex-col h-full hover:-translate-y-1 transition-transform duration-300">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-16 h-16 bg-background border border-border relative overflow-hidden shrink-0">
                  {resident.avatar ? (
                    <img src={resident.avatar} alt={resident.name} className="w-full h-full object-cover grayscale contrast-125 mix-blend-luminosity opacity-80" />
                  ) : (
                    <img src={`${import.meta.env.BASE_URL}images/avatar-placeholder.png`} alt="placeholder" className="w-full h-full object-cover opacity-50" />
                  )}
                  {/* Status indicator */}
                  <div className={`absolute bottom-0 right-0 w-3 h-3 border-t border-l border-card ${
                    resident.status === 'online' ? 'bg-accent shadow-[0_0_10px_#00ff00]' : 
                    resident.status === 'busy' ? 'bg-destructive' : 'bg-muted-foreground'
                  }`} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-bold font-display text-foreground uppercase tracking-wider">{resident.name}</h3>
                    {resident.userId && (
                      <span className="flex items-center gap-0.5 text-[9px] font-display tracking-widest text-accent bg-accent/10 border border-accent/30 px-1.5 py-0.5 uppercase">
                        <Shield className="w-2.5 h-2.5" /> VERIFIED
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground font-sans mt-1">
                    <MapPin className="w-3 h-3" /> Sector {resident.floor || 'Unknown'}
                  </div>
                </div>
              </div>
              
              <div className="flex-1">
                <p className="text-sm font-sans text-muted-foreground/80 line-clamp-2 mb-4">
                  {resident.bio || "No biographical data provided."}
                </p>
                <div className="flex flex-wrap gap-2">
                  {resident.skills.map((skill, idx) => (
                    <span key={idx} className="text-[10px] font-sans px-2 py-1 bg-border/50 text-foreground border border-border">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
              
              <div className="mt-6 pt-4 border-t border-border flex justify-between items-center text-xs font-sans text-muted-foreground">
                <div className="flex items-center gap-1" title="Bounties Completed">
                  <Award className="w-4 h-4 text-secondary" /> {resident.bountiesCompleted}
                </div>
                <div className="flex items-center gap-1" title="Total Earned">
                  <Activity className="w-4 h-4 text-primary" /> {resident.totalEarned} USDC
                </div>
              </div>
            </CyberCard>
          ))}
        </div>
      )}
    </div>
  );
}
