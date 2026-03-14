import { ReactNode, useState } from 'react';
import { Link, useLocation } from 'wouter';
import { 
  TerminalSquare, 
  Crosshair, 
  Users, 
  Wallet, 
  MessageSquare, 
  Menu, 
  X,
  Cpu
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useWallet } from '@/hooks/use-wallet';
import { CyberButton } from './CyberButton';

const navItems = [
  { href: '/', label: 'SYS_DASHBOARD', icon: TerminalSquare },
  { href: '/bounties', label: 'BOUNTY_BOARD', icon: Crosshair },
  { href: '/residents', label: 'RESIDENT_HUB', icon: Users },
  { href: '/treasury', label: 'TREASURY_LINK', icon: Wallet },
  { href: '/chat', label: 'AI_CONCIERGE', icon: MessageSquare },
];

export function Layout({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { isConnected, walletAddress, connect, disconnect } = useWallet();

  return (
    <div className="min-h-screen bg-background flex text-foreground selection:bg-primary/30 selection:text-primary">
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex flex-col w-64 border-r border-border bg-card/50 backdrop-blur-md relative z-20">
        <div className="p-6 border-b border-border flex items-center gap-3">
          <Cpu className="w-8 h-8 text-primary animate-pulse" />
          <div>
            <h1 className="font-display font-bold text-xl tracking-widest text-primary glitch-text" data-text="FRONTIER_ROAD">
              FRONTIER_ROAD
            </h1>
            <p className="text-[10px] text-muted-foreground tracking-[0.3em]">COMMUNITY_OS v1.0</p>
          </div>
        </div>

        <nav className="flex-1 py-6 px-4 flex flex-col gap-2">
          {navItems.map((item) => {
            const isActive = location === item.href || (item.href !== '/' && location.startsWith(item.href));
            return (
              <Link 
                key={item.href} 
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 text-sm font-display tracking-widest uppercase transition-all duration-200 border-l-2",
                  isActive 
                    ? "border-primary bg-primary/10 text-primary cyber-glow-hover" 
                    : "border-transparent text-muted-foreground hover:bg-border/30 hover:text-foreground hover:border-muted-foreground"
                )}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-border">
          <div className="text-xs font-sans text-muted-foreground flex items-center gap-2 mb-2">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            SYS_ONLINE
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden relative">
        {/* Top Header */}
        <header className="h-16 border-b border-border bg-background/80 backdrop-blur-sm flex items-center justify-between px-4 sm:px-6 relative z-10">
          <div className="flex items-center md:hidden">
            <button 
              onClick={() => setMobileMenuOpen(true)}
              className="p-2 text-primary hover:bg-primary/10 transition-colors"
            >
              <Menu className="w-6 h-6" />
            </button>
            <span className="ml-3 font-display font-bold tracking-widest text-primary">FRONTIER_ROAD</span>
          </div>

          {/* Breadcrumb / Path indicator */}
          <div className="hidden md:flex items-center text-xs font-sans text-muted-foreground tracking-widest">
            <span className="text-primary mr-2">root@frontier:~</span> 
            {location === '/' ? '/dashboard' : location}
            <span className="animate-pulse ml-1 text-primary">_</span>
          </div>

          <div className="flex items-center gap-4">
            {isConnected ? (
              <div className="flex items-center gap-4">
                <span className="text-xs font-sans text-muted-foreground hidden sm:inline-block">
                  {walletAddress?.slice(0,6)}...{walletAddress?.slice(-4)}
                </span>
                <CyberButton variant="ghost" onClick={disconnect} className="text-xs py-1 px-3">
                  DISCONNECT
                </CyberButton>
              </div>
            ) : (
              <CyberButton onClick={connect} className="text-xs py-1.5 px-4">
                CONNECT_WALLET
              </CyberButton>
            )}
          </div>
        </header>

        {/* Page Content Scrollable Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 relative">
          {/* Subtle background tech pattern */}
          <div className="fixed inset-0 pointer-events-none z-0 opacity-[0.01] mix-blend-screen bg-[url('/images/cyber-bg.png')] bg-cover bg-center" />
          
          <div className="max-w-7xl mx-auto relative z-10">
            {children}
          </div>
        </div>
      </main>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div className="fixed inset-0 bg-background/90 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)} />
          <aside className="w-64 bg-card border-r border-border h-full relative z-10 flex flex-col">
            <div className="p-4 border-b border-border flex justify-between items-center">
              <span className="font-display font-bold tracking-widest text-primary">FRONTIER_MENU</span>
              <button onClick={() => setMobileMenuOpen(false)} className="text-muted-foreground hover:text-primary">
                <X className="w-6 h-6" />
              </button>
            </div>
            <nav className="flex-1 py-4 flex flex-col gap-1 px-2">
              {navItems.map((item) => {
                const isActive = location === item.href || (item.href !== '/' && location.startsWith(item.href));
                return (
                  <Link 
                    key={item.href} 
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-4 py-4 text-sm font-display tracking-widest uppercase transition-all",
                      isActive ? "bg-primary/20 text-primary border-l-2 border-primary" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <item.icon className="w-5 h-5" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </aside>
        </div>
      )}
    </div>
  );
}
