import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'https://rent-flow.onrender.com';

interface WalletInfo {
  address: string;
  walletId: string | null;
  type: 'circle' | 'external';
  connectedAt: string;
  userId?: string; // ADDED: Track which user this wallet belongs to
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
  const { userProfile } = useAuth(); // Get current user
  const [walletAddress, setWalletAddress] = useState<string>('');
  const [walletId, setWalletId] = useState<string>('');
  const [walletType, setWalletType] = useState<'circle' | 'external'>('external');
  const [isConnected, setIsConnected] = useState<boolean>(false);

  // Load wallet from DATABASE when user changes (user-specific)
  useEffect(() => {
    const loadWalletFromDatabase = async () => {
      if (!userProfile?.id) {
        console.log('[WalletContext] No user profile, clearing wallet');
        // Clear wallet when no user
        setWalletAddress('');
        setWalletId('');
        setWalletType('external');
        setIsConnected(false);
        return;
      }

      try {
        console.log(`[WalletContext] Loading wallet from database for user: ${userProfile.id}`);
        
        // Fetch primary wallet from database
        const response = await axios.get(`${API_URL}/api/users/${userProfile.id}/primary-wallet`);
        
        if (response.data.success && response.data.data) {
          const walletData = response.data.data;
          console.log('[WalletContext] Wallet loaded from database:', {
            address: walletData.wallet_address,
            type: walletData.wallet_type,
            user: userProfile.id
          });
          
          setWalletAddress(walletData.wallet_address);
          setWalletId(walletData.circle_wallet_id || '');
          setWalletType(walletData.wallet_type || 'external');
          setIsConnected(true);
          
          // Save to localStorage for quick access (but database is source of truth)
          const walletInfo: WalletInfo = {
            address: walletData.wallet_address,
            walletId: walletData.circle_wallet_id || null,
            type: walletData.wallet_type || 'external',
            connectedAt: new Date().toISOString(),
            userId: userProfile.id // CRITICAL: Store user ID to prevent cross-user contamination
          };
          localStorage.setItem('rentflow_wallet', JSON.stringify(walletInfo));
        } else {
          console.log('[WalletContext] No primary wallet found in database');
          // No wallet in database - check localStorage
          const savedWallet = localStorage.getItem('rentflow_wallet');
          if (savedWallet) {
            try {
              const walletData: WalletInfo = JSON.parse(savedWallet);
              // CRITICAL: Only use localStorage if it belongs to current user
              if (walletData.userId === userProfile.id && walletData.address) {
                console.log('[WalletContext] Using localStorage wallet (same user)');
                setWalletAddress(walletData.address);
                setWalletId(walletData.walletId || '');
                setWalletType(walletData.type);
                setIsConnected(true);
              } else {
                console.warn('[WalletContext] localStorage wallet belongs to different user, clearing');
                localStorage.removeItem('rentflow_wallet');
              }
            } catch (err) {
              console.error('[WalletContext] Failed to parse localStorage wallet');
              localStorage.removeItem('rentflow_wallet');
            }
          }
        }
      } catch (error) {
        console.error('[WalletContext] Error loading wallet from database:', error);
        // Fall back to cleared state on error
        setWalletAddress('');
        setWalletId('');
        setWalletType('external');
        setIsConnected(false);
      }
    };

    loadWalletFromDatabase();
  }, [userProfile?.id]); // Reload when user changes

  const connectWallet = (address: string, wId: string, type: 'circle' | 'external') => {
    if (!userProfile?.id) {
      console.error('[WalletContext] Cannot connect wallet: No user logged in');
      return;
    }

    const walletInfo: WalletInfo = {
      address,
      walletId: wId || null,
      type,
      connectedAt: new Date().toISOString(),
      userId: userProfile.id // CRITICAL: Associate wallet with current user
    };

    setWalletAddress(address);
    setWalletId(wId);
    setWalletType(type);
    setIsConnected(true);

    // Save to localStorage (with user ID)
    localStorage.setItem('rentflow_wallet', JSON.stringify(walletInfo));
    
    console.log('[WalletContext] Wallet connected for user:', userProfile.id, 'Address:', address);
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
