import React, { createContext, useContext, useState, useEffect } from 'react';

interface WalletInfo {
  address: string;
  walletId: string | null;
  type: 'circle' | 'external';
  connectedAt: string;
}

interface WalletContextType {
  walletAddress: string;
  walletId: string;
  walletType: 'circle' | 'external';
  isConnected: boolean;
  connectWallet: (address: string, walletId: string, type: 'circle' | 'external') => void;
  disconnectWallet: () => void;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [walletAddress, setWalletAddress] = useState<string>('');
  const [walletId, setWalletId] = useState<string>('');
  const [walletType, setWalletType] = useState<'circle' | 'external'>('external');
  const [isConnected, setIsConnected] = useState<boolean>(false);

  // Load wallet from localStorage on mount
  useEffect(() => {
    const savedWallet = localStorage.getItem('rentflow_wallet');
    if (savedWallet) {
      try {
        const walletData: WalletInfo = JSON.parse(savedWallet);
        if (walletData.address) {
          setWalletAddress(walletData.address);
          setWalletId(walletData.walletId || '');
          setWalletType(walletData.type);
          setIsConnected(true);
        }
      } catch (err) {
        console.error('[WalletContext] Failed to parse saved wallet');
        localStorage.removeItem('rentflow_wallet');
      }
    }
  }, []);

  const connectWallet = (address: string, wId: string, type: 'circle' | 'external') => {
    const walletInfo: WalletInfo = {
      address,
      walletId: wId || null,
      type,
      connectedAt: new Date().toISOString()
    };

    setWalletAddress(address);
    setWalletId(wId);
    setWalletType(type);
    setIsConnected(true);

    // Save to localStorage
    localStorage.setItem('rentflow_wallet', JSON.stringify(walletInfo));
  };

  const disconnectWallet = () => {
    setWalletAddress('');
    setWalletId('');
    setWalletType('external');
    setIsConnected(false);
    localStorage.removeItem('rentflow_wallet');
  };

  return (
    <WalletContext.Provider
      value={{
        walletAddress,
        walletId,
        walletType,
        isConnected,
        connectWallet,
        disconnectWallet
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
}
