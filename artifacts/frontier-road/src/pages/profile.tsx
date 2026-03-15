import { useState, useEffect } from 'react';
import { useAuth } from '@workspace/replit-auth-web';
import { useMe, useUpdateProfile } from '@/hooks/use-profile';
import { CyberCard } from '@/components/CyberCard';
import { CyberButton } from '@/components/CyberButton';
import { CyberInput } from '@/components/CyberInput';
import { useToast } from '@/hooks/use-toast';
import { Award, Activity, MapPin, Shield, Save, X } from 'lucide-react';

export default function Profile() {
  const { isAuthenticated, isLoading: authLoading, login } = useAuth();
  const { data: me, isLoading: meLoading } = useMe();
  const updateProfile = useUpdateProfile();
  const { toast } = useToast();

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    name: '',
    skills: '',
    bio: '',
    floor: '',
    walletAddress: '',
  });

  useEffect(() => {
    if (me?.resident) {
      setForm({
        name: me.resident.name || '',
        skills: (me.resident.skills || []).join(', '),
        bio: me.resident.bio || '',
        floor: me.resident.floor?.toString() || '',
        walletAddress: me.resident.walletAddress || '',
      });
    }
  }, [me?.resident]);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      login();
    }
  }, [authLoading, isAuthenticated, login]);

  if (authLoading || meLoading || !isAuthenticated) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-primary animate-pulse font-display tracking-widest">
          {!authLoading && !isAuthenticated ? 'REDIRECTING_TO_LOGIN...' : 'LOADING_PROFILE...'}
        </div>
      </div>
    );
  }

  if (!me) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground font-sans">Unable to load profile data.</p>
      </div>
    );
  }

  const { user, resident } = me;
  const displayName = [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email || 'Resident';

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateProfile.mutateAsync({
        name: form.name || undefined,
        skills: form.skills.split(',').map(s => s.trim()).filter(Boolean),
        bio: form.bio || undefined,
        floor: form.floor ? parseInt(form.floor) : undefined,
        walletAddress: form.walletAddress || undefined,
      });
      setEditing(false);
      toast({ title: "PROFILE_UPDATED", description: "Your identity has been synchronized." });
    } catch {
      toast({ title: "ERROR", description: "Failed to update profile.", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="border-b border-border/50 pb-6">
        <h1 className="text-3xl font-display font-bold text-primary mb-2 glitch-text tracking-widest" data-text="MY_PROFILE">MY_PROFILE</h1>
        <p className="text-muted-foreground font-sans text-sm tracking-widest uppercase">Identity matrix — personal data</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <CyberCard className="lg:col-span-1">
          <div className="flex flex-col items-center text-center">
            <div className="w-24 h-24 bg-background border-2 border-primary/30 overflow-hidden mb-4 relative">
              {user.profileImageUrl ? (
                <img src={user.profileImageUrl} alt={displayName} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-primary/10">
                  <span className="text-3xl font-bold text-primary">{displayName[0]?.toUpperCase()}</span>
                </div>
              )}
              <div className="absolute bottom-0 right-0 p-1">
                <Shield className="w-4 h-4 text-accent" />
              </div>
            </div>

            <h2 className="text-xl font-display font-bold text-foreground uppercase tracking-wider">{displayName}</h2>
            {user.email && (
              <p className="text-xs text-muted-foreground font-sans mt-1">{user.email}</p>
            )}
            <div className="flex items-center gap-1 text-xs text-accent font-sans mt-2">
              <Shield className="w-3 h-3" />
              VERIFIED ACCOUNT
            </div>
          </div>

          {resident && (
            <div className="mt-6 pt-4 border-t border-border space-y-3">
              <div className="flex items-center justify-between text-sm font-sans">
                <span className="text-muted-foreground flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" /> Floor
                </span>
                <span className="text-foreground">{resident.floor || 'Not set'}</span>
              </div>
              <div className="flex items-center justify-between text-sm font-sans">
                <span className="text-muted-foreground flex items-center gap-1">
                  <Award className="w-3.5 h-3.5" /> Bounties Completed
                </span>
                <span className="text-secondary font-bold">{resident.bountiesCompleted}</span>
              </div>
              <div className="flex items-center justify-between text-sm font-sans">
                <span className="text-muted-foreground flex items-center gap-1">
                  <Activity className="w-3.5 h-3.5" /> Bounties Created
                </span>
                <span className="text-foreground">{resident.bountiesCreated}</span>
              </div>
              <div className="flex items-center justify-between text-sm font-sans">
                <span className="text-muted-foreground">Total Earned</span>
                <span className="text-primary font-bold">{resident.totalEarned} USDC</span>
              </div>
            </div>
          )}
        </CyberCard>

        <CyberCard className="lg:col-span-2">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-display text-foreground tracking-widest uppercase">
              {editing ? 'EDIT_PROFILE' : 'RESIDENT_DATA'}
            </h2>
            {!editing ? (
              <CyberButton variant="secondary" onClick={() => setEditing(true)} className="text-xs">
                EDIT
              </CyberButton>
            ) : (
              <button onClick={() => setEditing(false)} className="text-muted-foreground hover:text-primary">
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          {editing ? (
            <form onSubmit={handleSave} className="space-y-4">
              <CyberInput
                label="Display Name"
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
              />
              <CyberInput
                label="Floor / Sector"
                type="number"
                value={form.floor}
                onChange={e => setForm({ ...form, floor: e.target.value })}
              />
              <CyberInput
                label="Skills (comma separated)"
                value={form.skills}
                onChange={e => setForm({ ...form, skills: e.target.value })}
                placeholder="React, Rust, Soldering..."
              />
              <div>
                <label className="text-xs font-display tracking-widest text-primary uppercase">Bio</label>
                <textarea
                  className="w-full mt-1 bg-background/50 border border-border p-3 text-sm font-sans text-foreground focus:border-primary outline-none min-h-[100px]"
                  value={form.bio}
                  onChange={e => setForm({ ...form, bio: e.target.value })}
                  placeholder="Tell the community about yourself..."
                />
              </div>
              <CyberInput
                label="Wallet Address"
                value={form.walletAddress}
                onChange={e => setForm({ ...form, walletAddress: e.target.value })}
                placeholder="Your wallet address for bounty payouts"
              />
              <div className="flex justify-end pt-2">
                <CyberButton type="submit" isLoading={updateProfile.isPending}>
                  <Save className="w-4 h-4 mr-1" /> SAVE_CHANGES
                </CyberButton>
              </div>
            </form>
          ) : (
            <div className="space-y-6">
              <div>
                <label className="text-xs font-display tracking-widest text-muted-foreground uppercase">Name</label>
                <p className="text-foreground font-sans mt-1">{resident?.name || displayName}</p>
              </div>
              <div>
                <label className="text-xs font-display tracking-widest text-muted-foreground uppercase">Bio</label>
                <p className="text-foreground font-sans mt-1 text-sm">
                  {resident?.bio || <span className="text-muted-foreground italic">No bio provided yet. Click Edit to add one.</span>}
                </p>
              </div>
              <div>
                <label className="text-xs font-display tracking-widest text-muted-foreground uppercase">Skills</label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {resident?.skills && resident.skills.length > 0 ? (
                    resident.skills.map((skill, idx) => (
                      <span key={idx} className="text-xs font-sans px-2 py-1 bg-border/50 text-foreground border border-border">
                        {skill}
                      </span>
                    ))
                  ) : (
                    <span className="text-sm text-muted-foreground italic font-sans">No skills listed. Click Edit to add some.</span>
                  )}
                </div>
              </div>
              <div>
                <label className="text-xs font-display tracking-widest text-muted-foreground uppercase">Wallet Address</label>
                <p className="text-foreground font-sans mt-1 text-sm font-mono">
                  {resident?.walletAddress || <span className="text-muted-foreground italic">Not set</span>}
                </p>
              </div>
            </div>
          )}
        </CyberCard>
      </div>
    </div>
  );
}
