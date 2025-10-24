/**
 * Dual Wallet Service
 * Supports both Phantom wallet (browser extension) and Circle Developer Controlled Wallets (API)
 */

import circleWalletService from './circleWalletService';

export type WalletType = 'phantom' | 'circle';

interface WalletConnection {
  type: WalletType;
  connected: boolean;
  address?: string;
  walletId?: string; // For Circle wallets
  publicKey?: string; // For Phantom wallets
  success?: boolean; // For error handling
  error?: string; // Error message if connection failed
}

interface SignatureResult {
  success: boolean;
  signature?: string;
  publicKey?: string;
  walletType: WalletType;
  error?: string;
}

/**
 * Check if Phantom wallet is available
 */
export function isPhantomAvailable(): boolean {
  return typeof window !== 'undefined' && window.solana?.isPhantom === true;
}

/**
 * Connect to Phantom wallet
 */
export async function connectPhantomWallet(userId?: string, role?: 'manager' | 'tenant'): Promise<WalletConnection> {
  try {
    if (!isPhantomAvailable()) {
      // Prompt user to install Phantom
      window.open('https://phantom.app/', '_blank');
      return {
        type: 'phantom',
        connected: false,
        success: false,
        error: 'Phantom wallet not installed. Opening installation page...'
      };
    }

    console.log('🟣 [Phantom] Requesting wallet connection...');
    const response = await window.solana.connect();
    const address = response.publicKey.toString();

    console.log('✅ [Phantom] Wallet connected:', address);

    // Save to backend if userId provided
    if (userId) {
      try {
        await fetch('http://localhost:3001/api/wallet/phantom/connect', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, address, role })
        });
        console.log('✅ [Phantom] Wallet saved to database');
      } catch (saveError) {
        console.warn('⚠️ [Phantom] Failed to save wallet to database:', saveError);
      }
    }

    return {
      type: 'phantom',
      connected: true,
      success: true,
      address,
      publicKey: address
    };
  } catch (error) {
    console.error('❌ [Phantom] Connection failed:', error);
    return {
      type: 'phantom',
      connected: false,
      success: false,
      error: error instanceof Error ? error.message : 'Connection failed'
    };
  }
}

/**
 * Connect to Circle wallet
 */
export async function connectCircleWallet(userId: string, role: 'manager' | 'tenant'): Promise<WalletConnection> {
  try {
    const wallet = await circleWalletService.getCircleWallet(userId, role);
    
    if (!wallet || !wallet.address) {
      return {
        type: 'circle',
        connected: false,
        success: false,
        error: 'Failed to get Circle wallet'
      };
    }

    console.log('✅ [Circle] Wallet connected:', {
      walletId: wallet.walletId,
      address: wallet.address  // Real blockchain address
    });

    return {
      type: 'circle',
      connected: true,
      success: true,
      walletId: wallet.walletId,
      address: wallet.address,  // Use real address, not wallet ID
      publicKey: wallet.address
    };
  } catch (error) {
    console.error('❌ [Circle] Connection failed:', error);
    return {
      type: 'circle',
      connected: false,
      success: false,
      error: error instanceof Error ? error.message : 'Connection failed'
    };
  }
}

/**
 * Sign message with Phantom wallet
 */
export async function signWithPhantom(message: string): Promise<SignatureResult> {
  try {
    if (!window.solana || !window.solana.isConnected) {
      return {
        success: false,
        walletType: 'phantom',
        error: 'Phantom wallet not connected'
      };
    }

    console.log('🔐 [Phantom] Signing message...');
    
    const encodedMessage = new TextEncoder().encode(message);
    
    // Use request API for better compatibility
    const signedMessage = await window.solana.request({
      method: 'signMessage',
      params: {
        message: encodedMessage,
        display: 'utf8'
      }
    });

    const signatureBase64 = btoa(String.fromCharCode(...signedMessage.signature));
    const publicKey = window.solana.publicKey?.toString();

    console.log('✅ [Phantom] Signature obtained');

    return {
      success: true,
      signature: signatureBase64,
      publicKey,
      walletType: 'phantom'
    };
  } catch (error) {
    console.error('❌ [Phantom] Signing failed:', error);
    return {
      success: false,
      walletType: 'phantom',
      error: error instanceof Error ? error.message : 'Signing failed'
    };
  }
}

/**
 * Sign message with Circle wallet
 */
export async function signWithCircle(walletId: string, message: string): Promise<SignatureResult> {
  try {
    console.log('🔐 [Circle] Signing message...');
    
    const result = await circleWalletService.signMessageWithCircle(walletId, message);

    if (!result.success) {
      return {
        success: false,
        walletType: 'circle',
        error: result.error
      };
    }

    console.log('✅ [Circle] Signature obtained');

    return {
      success: true,
      signature: result.signature,
      publicKey: result.publicKey,
      walletType: 'circle'
    };
  } catch (error) {
    console.error('❌ [Circle] Signing failed:', error);
    return {
      success: false,
      walletType: 'circle',
      error: error instanceof Error ? error.message : 'Signing failed'
    };
  }
}

/**
 * Sign message with either wallet type
 */
export async function signMessage(
  walletType: WalletType,
  message: string,
  walletId?: string
): Promise<SignatureResult> {
  if (walletType === 'phantom') {
    return signWithPhantom(message);
  } else {
    if (!walletId) {
      return {
        success: false,
        walletType: 'circle',
        error: 'Wallet ID required for Circle signing'
      };
    }
    return signWithCircle(walletId, message);
  }
}

// Extend Window interface for Phantom wallet
declare global {
  interface Window {
    solana?: any;
  }
}

export default {
  isPhantomAvailable,
  connectPhantomWallet,
  connectCircleWallet,
  signWithPhantom,
  signWithCircle,
  signMessage
};
