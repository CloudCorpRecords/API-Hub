import { useLocation } from 'wouter';
import { useListBounties, useListResidents, useGetTreasury } from '@workspace/api-client-react';
import { useAuth } from '@workspace/replit-auth-web';
import { Crosshair, Users, Wallet, MessageSquare, ArrowRight, Zap, Shield, Globe, LogIn, LogOut } from 'lucide-react';

export default function Landing() {
  const [, setLocation] = useLocation();
  const { data: bounties } = useListBounties();
  const { data: residents } = useListResidents();
  const { data: treasury } = useGetTreasury();
  const { user, isAuthenticated, isLoading, login, logout } = useAuth();

  const openBounties = bounties?.filter(b => b.status === 'open').length ?? 0;
  const onlineResidents = residents?.filter(r => r.status === 'online').length ?? 0;
  const treasuryBalance = treasury?.totalBalance ?? 0;

  const displayName = user
    ? [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email || 'Resident'
    : null;

  const features = [
    {
      icon: Crosshair,
      color: 'text-cyan-400',
      bg: 'bg-cyan-400/10 border-cyan-400/30',
      title: 'Bounty Board',
      description: 'Post tasks that need doing around the community — maintenance, dev work, events, design. Attach a USDC reward and let skilled residents pick them up.',
    },
    {
      icon: Users,
      color: 'text-violet-400',
      bg: 'bg-violet-400/10 border-violet-400/30',
      title: 'Resident Directory',
      description: "See who lives here, what they can do, and whether they're available. Find the right person for any job instantly by searching skills.",
    },
    {
      icon: Wallet,
      color: 'text-pink-400',
      bg: 'bg-pink-400/10 border-pink-400/30',
      title: 'Community Treasury',
      description: "Track every dollar in the community fund. See what's locked in escrow for active bounties, what's been paid out, and the full transaction history.",
    },
    {
      icon: MessageSquare,
      color: 'text-green-400',
      bg: 'bg-green-400/10 border-green-400/30',
      title: 'Tower AI',
      description: 'An AI assistant that knows the whole house — open bounties, resident skills, treasury status. Ask anything, get answers instantly.',
    },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Top bar */}
      <header className="border-b border-border/50 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded border border-cyan-500/50 flex items-center justify-center">
            <Zap className="w-4 h-4 text-cyan-400" />
          </div>
          <span className="font-bold text-lg tracking-wide text-white">Frontier Road</span>
          <span className="text-xs text-muted-foreground border border-border px-2 py-0.5 rounded-full">Community OS</span>
        </div>

        <div className="flex items-center gap-3">
          {!isLoading && (
            isAuthenticated ? (
              <div className="flex items-center gap-3">
                {user?.profileImageUrl && (
                  <img
                    src={user.profileImageUrl}
                    alt={displayName ?? 'User'}
                    className="w-7 h-7 rounded-full border border-cyan-500/40 object-cover"
                  />
                )}
                <span className="text-sm text-muted-foreground hidden sm:inline">
                  {displayName}
                </span>
                <button
                  onClick={logout}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-white transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Log out</span>
                </button>
              </div>
            ) : (
              <button
                onClick={login}
                className="flex items-center gap-1.5 text-sm text-cyan-400 hover:text-cyan-300 transition-colors font-medium"
              >
                <LogIn className="w-4 h-4" />
                Log in
              </button>
            )
          )}
          <button
            onClick={() => setLocation('/dashboard')}
            className="text-sm text-muted-foreground hover:text-white transition-colors flex items-center gap-1"
          >
            Go to dashboard <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </header>

      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center px-6 py-20 text-center relative overflow-hidden">
        {/* Background glow */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-cyan-500/5 blur-3xl" />
          <div className="absolute top-1/3 left-1/3 w-[300px] h-[300px] rounded-full bg-violet-500/5 blur-3xl" />
        </div>

        <div className="relative max-w-3xl">
          <div className="inline-flex items-center gap-2 border border-cyan-500/30 bg-cyan-500/5 text-cyan-400 text-xs px-4 py-1.5 rounded-full mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
            {onlineResidents > 0 ? `${onlineResidents} residents online right now` : 'Community platform for hacker houses'}
          </div>

          {isAuthenticated && displayName && (
            <p className="text-sm text-cyan-400/80 mb-3 font-medium">
              Welcome back, {displayName.split(' ')[0]}
            </p>
          )}

          <h1 className="text-5xl sm:text-6xl font-bold text-white leading-tight mb-6">
            The operating system<br />
            <span className="text-cyan-400">for your community</span>
          </h1>

          <p className="text-xl text-muted-foreground leading-relaxed mb-10 max-w-xl mx-auto">
            Frontier Road helps co-living spaces and hacker houses coordinate tasks, pay residents for their work, and make decisions together — all in one place.
          </p>

          {/* Live stats */}
          {(openBounties > 0 || treasuryBalance > 0) && (
            <div className="flex items-center justify-center gap-8 mb-10">
              {openBounties > 0 && (
                <div className="text-center">
                  <div className="text-3xl font-bold text-white">{openBounties}</div>
                  <div className="text-xs text-muted-foreground mt-1">open bounties</div>
                </div>
              )}
              {treasuryBalance > 0 && (
                <div className="text-center">
                  <div className="text-3xl font-bold text-white">${treasuryBalance.toLocaleString()}</div>
                  <div className="text-xs text-muted-foreground mt-1">community treasury</div>
                </div>
              )}
              {residents && residents.length > 0 && (
                <div className="text-center">
                  <div className="text-3xl font-bold text-white">{residents.length}</div>
                  <div className="text-xs text-muted-foreground mt-1">residents</div>
                </div>
              )}
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            {isAuthenticated ? (
              <button
                onClick={() => setLocation('/dashboard')}
                className="flex items-center gap-2 bg-cyan-500 hover:bg-cyan-400 text-black font-bold px-8 py-3.5 rounded-lg transition-all duration-200 text-base"
              >
                Go to dashboard
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={login}
                className="flex items-center gap-2 bg-cyan-500 hover:bg-cyan-400 text-black font-bold px-8 py-3.5 rounded-lg transition-all duration-200 text-base"
              >
                <LogIn className="w-4 h-4" />
                Log in to enter
              </button>
            )}
            <button
              onClick={() => setLocation('/bounties')}
              className="flex items-center gap-2 border border-border hover:border-cyan-500/50 text-muted-foreground hover:text-white px-8 py-3.5 rounded-lg transition-all duration-200 text-base"
            >
              Browse open bounties
            </button>
          </div>
        </div>
      </section>

      {/* Feature cards */}
      <section className="px-6 pb-20">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-center text-sm text-muted-foreground uppercase tracking-widest mb-10">What's inside</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {features.map((f) => (
              <div
                key={f.title}
                className={`border rounded-xl p-6 ${f.bg} flex flex-col gap-3 cursor-pointer hover:scale-[1.02] transition-transform duration-200`}
                onClick={() => {
                  const routes: Record<string, string> = {
                    'Bounty Board': '/bounties',
                    'Resident Directory': '/residents',
                    'Community Treasury': '/treasury',
                    'Tower AI': '/chat',
                  };
                  setLocation(routes[f.title] || '/dashboard');
                }}
              >
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center border ${f.bg}`}>
                  <f.icon className={`w-5 h-5 ${f.color}`} />
                </div>
                <h3 className="font-semibold text-white text-base">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 px-6 py-6 flex items-center justify-between text-xs text-muted-foreground">
        <div className="flex items-center gap-4">
          <Shield className="w-3.5 h-3.5" />
          <span>Payments secured by Solana / USDC escrow</span>
        </div>
        <div className="flex items-center gap-4">
          <Globe className="w-3.5 h-3.5" />
          <span>Open API — mobile-ready</span>
        </div>
      </footer>
    </div>
  );
}
