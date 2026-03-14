import { createContext, useContext, useState, useEffect, ReactNode, createElement } from 'react';

interface WalletState {
  isConnected: boolean;
  walletAddress: string | null;
  connect: () => void;
  disconnect: () => void;
}

const WalletContext = createContext<WalletState | null>(null);

export function WalletProvider({ children }: { children: ReactNode }) {
  const [isConnected, setIsConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('frontier_wallet');
    if (saved) {
      setIsConnected(true);
      setWalletAddress(saved);
    }
  }, []);

  const connect = () => {
    const fakeAddress = 'Demo' + Math.random().toString(36).substring(2, 10) + 'xyz';
    setIsConnected(true);
    setWalletAddress(fakeAddress);
    localStorage.setItem('frontier_wallet', fakeAddress);
  };

  const disconnect = () => {
    setIsConnected(false);
    setWalletAddress(null);
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
