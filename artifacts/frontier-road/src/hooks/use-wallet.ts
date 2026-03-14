import { useState, useEffect } from 'react';

// A mock wallet hook for the demo until actual Solana adapter is integrated
export function useWallet() {
  const [isConnected, setIsConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);

  // Load from local storage to persist fake session
  useEffect(() => {
    const saved = localStorage.getItem('frontier_wallet');
    if (saved) {
      setIsConnected(true);
      setWalletAddress(saved);
    }
  }, []);

  const connect = () => {
    // Generate a fake solana-like address
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

  return { isConnected, walletAddress, connect, disconnect };
}
