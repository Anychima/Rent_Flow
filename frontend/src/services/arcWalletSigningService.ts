/**
 * Arc Testnet Wallet Signing Service
 * 
 * INDUSTRY STANDARD APPROACH:
 * - Works with ANY EVM wallet (MetaMask, Rainbow, Coinbase Wallet, WalletConnect)
 * - Uses blockchain ADDRESS (0x...) not internal wallet IDs
 * - Circle wallet ID only used internally for Circle SDK signing
 * - External wallets sign via browser extension (user controls private keys)
 * 
 * This is the CORRECT blockchain-native approach
 */

interface SigningResult {
  success: boolean;
  signature?: string;
  signerAddress?: string;
  error?: string;
  method?: 'circle' | 'metamask' | 'external';
}

interface WalletInfo {
  address: string;
  walletType: 'circle' | 'external';
  circleWalletId?: string; // Only for Circle wallets
}

/**
 * Check if MetaMask or another EVM wallet is available
 */
export function isEVMWalletAvailable(): boolean {
  return typeof window !== 'undefined' && typeof window.ethereum !== 'undefined';
}

/**
 * Connect to EVM wallet (MetaMask, Rainbow, etc.)
 */
export async function connectEVMWallet(): Promise<{
  success: boolean;
  address?: string;
  error?: string;
}> {
  try {
    if (!isEVMWalletAvailable()) {
      return {
        success: false,
        error: 'No EVM wallet detected. Please install MetaMask or another Web3 wallet.'
      };
    }

    console.log('🦊 [EVM Wallet] Requesting connection...');
    
    // Request account access
    const accounts = await window.ethereum.request({ 
      method: 'eth_requestAccounts' 
    });

    if (!accounts || accounts.length === 0) {
      return {
        success: false,
        error: 'No accounts found in wallet'
      };
    }

    const address = accounts[0];
    console.log('✅ [EVM Wallet] Connected:', address);

    return {
      success: true,
      address
    };
  } catch (error) {
    console.error('❌ [EVM Wallet] Connection failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Connection failed'
    };
  }
}

/**
 * UNIVERSAL SIGNING FUNCTION
 * 
 * Works with BOTH Circle wallets AND external wallets
 * Uses blockchain address (0x...) - industry standard
 * 
 * @param message - The message to sign
 * @param walletInfo - Wallet information including address and type
 * @returns Signature result with signer address
 */
export async function signMessage(
  message: string,
  walletInfo: WalletInfo
): Promise<SigningResult> {
  
  console.log('🔐 [Arc Signing] Initiating signature...');
  console.log('   Address:', walletInfo.address);
  console.log('   Type:', walletInfo.walletType);
  
  // Route to appropriate signing method based on wallet type
  if (walletInfo.walletType === 'circle') {
    return signWithCircleWallet(message, walletInfo);
  } else {
    return signWithExternalWallet(message, walletInfo.address);
  }
}

/**
 * Sign with Circle wallet (server-side signing via Circle SDK)
 * 
 * Circle manages the private keys, we call their API
 * This is ONLY for Circle-managed wallets
 */
async function signWithCircleWallet(
  message: string,
  walletInfo: WalletInfo
): Promise<SigningResult> {
  try {
    if (!walletInfo.circleWalletId) {
      return {
        success: false,
        error: 'Circle wallet ID is required for Circle wallet signing'
      };
    }

    console.log('🔵 [Circle Signing] Using Circle SDK...');
    console.log('   Wallet ID:', walletInfo.circleWalletId);
    console.log('   Address:', walletInfo.address);

    // Call Circle API to sign message
    const response = await fetch('https://rent-flow.onrender.com/api/arc/sign-message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        walletId: walletInfo.circleWalletId,
        message
      })
    });

    const result = await response.json();

    if (!result.success) {
      return {
        success: false,
        error: result.error || 'Circle signing failed'
      };
    }

    console.log('✅ [Circle Signing] Signature obtained');

    return {
      success: true,
      signature: result.signature,
      signerAddress: walletInfo.address, // Use blockchain address, not wallet ID
      method: 'circle'
    };
  } catch (error) {
    console.error('❌ [Circle Signing] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Circle signing failed'
    };
  }
}

/**
 * Sign with external EVM wallet (MetaMask, Rainbow, etc.)
 * 
 * INDUSTRY STANDARD: User signs with their own wallet
 * - User controls private keys
 * - Signature happens in browser
 * - Works with any EVM wallet
 */
async function signWithExternalWallet(
  message: string,
  address: string
): Promise<SigningResult> {
  try {
    if (!isEVMWalletAvailable()) {
      return {
        success: false,
        error: 'No EVM wallet detected. Please install MetaMask or connect your wallet.'
      };
    }

    console.log('🦊 [MetaMask Signing] Requesting signature...');
    console.log('   Address:', address);
    console.log('   Message:', message);

    // Use personal_sign (EIP-191) - industry standard for signing messages
    const signature = await window.ethereum.request({
      method: 'personal_sign',
      params: [
        message,        // Message to sign
        address         // Signer address
      ]
    });

    console.log('✅ [MetaMask Signing] Signature obtained');
    console.log('   Signature:', signature.substring(0, 20) + '...');

    return {
      success: true,
      signature,
      signerAddress: address,
      method: 'metamask'
    };
  } catch (error: any) {
    console.error('❌ [MetaMask Signing] Error:', error);
    
    // User rejected signature
    if (error.code === 4001) {
      return {
        success: false,
        error: 'User rejected signature request'
      };
    }

    return {
      success: false,
      error: error.message || 'External wallet signing failed'
    };
  }
}

/**
 * Verify signature on-chain (for smart contract verification)
 * 
 * This is what the smart contract would do:
 * 1. Recover signer address from signature
 * 2. Compare with expected signer address
 */
export async function verifySignature(
  message: string,
  signature: string,
  expectedSigner: string
): Promise<boolean> {
  try {
    // For now, we'll do client-side verification
    // In production, smart contract does this on-chain
    
    const { ethers } = await import('ethers');
    
    // Recover address from signature
    const recoveredAddress = ethers.verifyMessage(message, signature);
    
    console.log('🔍 [Signature Verification]');
    console.log('   Expected:', expectedSigner);
    console.log('   Recovered:', recoveredAddress);
    
    // Compare addresses (case-insensitive)
    return recoveredAddress.toLowerCase() === expectedSigner.toLowerCase();
  } catch (error) {
    console.error('❌ [Verification] Failed:', error);
    return false;
  }
}

// Extend Window interface for EVM wallet (MetaMask, etc.)
declare global {
  interface Window {
    ethereum?: any;
  }
}

export default {
  isEVMWalletAvailable,
  connectEVMWallet,
  signMessage,
  verifySignature
};
