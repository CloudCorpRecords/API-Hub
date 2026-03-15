import { createContext, useContext, useState, useEffect, ReactNode, createElement } from 'react';
import { useAuth } from '@workspace/replit-auth-web';

interface WalletState {
  isConnected: boolean;
  walletAddress: string | null;
  connect: () => void;
  disconnect: () => void;
}

const WalletContext = createContext<WalletState | null>(null);

export function WalletProvider({ children }: { children: ReactNode }) {
  const [manualAddress, setManualAddress] = useState<string | null>(null);
  const { user, isAuthenticated } = useAuth();

  const authWallet = isAuthenticated && user
    ? `user_${user.id}`
    : null;

  const walletAddress = authWallet ?? manualAddress;
  const isConnected = !!walletAddress;

  useEffect(() => {
    if (authWallet) {
      setManualAddress(null);
      localStorage.removeItem('frontier_wallet');
    } else {
      const saved = localStorage.getItem('frontier_wallet');
      if (saved) setManualAddress(saved);
    }
  }, [authWallet]);

  const connect = () => {
    if (authWallet) return;
    const fakeAddress = 'Demo' + Math.random().toString(36).substring(2, 10) + 'xyz';
    setManualAddress(fakeAddress);
    localStorage.setItem('frontier_wallet', fakeAddress);
  };

  const disconnect = () => {
    setManualAddress(null);
    localStorage.removeItem('frontier_wallet');
  };

  return createElement(
    WalletContext.Provider,
    { value: { isConnected, walletAddress, connect, disconnect } },
    children
  );
}

export function useWallet(): WalletState {
  const ctx = useContext(WalletContext);
  if (!ctx) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return ctx;
}
