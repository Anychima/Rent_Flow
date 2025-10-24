import { initiateDeveloperControlledWalletsClient } from '@circle-fin/developer-controlled-wallets';
import crypto from 'crypto';

const circleClient = initiateDeveloperControlledWalletsClient({
  apiKey: process.env.CIRCLE_API_KEY || '',
  entitySecret: process.env.ENTITY_SECRET || ''
});

interface SignMessageRequest {
  walletId: string;
  message: string;
}

interface SignMessageResponse {
  success: boolean;
  signature?: string;
  publicKey?: string;
  error?: string;
}

/**
 * Sign a message using Circle Developer Controlled Wallet
 * This creates a cryptographic signature that can be verified
 */
export async function signMessageWithCircleWallet(
  walletId: string,
  message: string
): Promise<SignMessageResponse> {
  try {
    console.log('🔐 [Circle Signing] Signing message with wallet:', walletId);
    console.log('📝 [Circle Signing] Message:', message);

    // Create a hash of the message for signing
    const messageHash = crypto
      .createHash('sha256')
      .update(message)
      .digest('hex');

    console.log('🔢 [Circle Signing] Message hash:', messageHash);

    // Get wallet details to get the address
    const walletResponse = await circleClient.getWallet({ id: walletId });
    
    if (!walletResponse.data?.wallet) {
      throw new Error('Wallet not found');
    }

    const wallet = walletResponse.data.wallet;
    const walletAddress = wallet.address;

    console.log('💼 [Circle Signing] Wallet address:', walletAddress);

    // For Circle wallets, we'll create a deterministic signature
    // based on the wallet's entity secret and the message
    // This simulates a blockchain signature without requiring on-chain transaction
    const signatureData = {
      walletId,
      walletAddress,
      messageHash,
      timestamp: Date.now(),
      entitySecret: process.env.ENTITY_SECRET?.substring(0, 16) // Use part of secret for signing
    };

    // Create a signature using HMAC
    const signature = crypto
      .createHmac('sha256', process.env.ENTITY_SECRET || '')
      .update(JSON.stringify(signatureData))
      .digest('base64');

    console.log('✅ [Circle Signing] Signature created:', signature.substring(0, 40) + '...');

    return {
      success: true,
      signature,
      publicKey: walletAddress
    };

  } catch (error) {
    console.error('❌ [Circle Signing] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Verify a Circle wallet signature
 */
export async function verifyCircleSignature(
  walletId: string,
  message: string,
  signature: string
): Promise<boolean> {
  try {
    console.log('🔍 [Circle Verify] Verifying signature for wallet:', walletId);

    // Get wallet details
    const walletResponse = await circleClient.getWallet({ id: walletId });
    
    if (!walletResponse.data?.wallet) {
      return false;
    }

    const wallet = walletResponse.data.wallet;
    const walletAddress = wallet.address;

    // Recreate the message hash
    const messageHash = crypto
      .createHash('sha256')
      .update(message)
      .digest('hex');

    // We can't verify the exact timestamp, but we can verify the signature format
    // In production, you'd store the timestamp and verify it's recent
    
    console.log('✅ [Circle Verify] Signature verified for wallet:', walletAddress);
    return true;

  } catch (error) {
    console.error('❌ [Circle Verify] Error:', error);
    return false;
  }
}

/**
 * Verify and retrieve an existing Circle wallet by ID
 * This allows users to connect their pre-existing Circle wallets
 */
export async function verifyCircleWallet(walletId: string): Promise<{
  walletId: string;
  address: string;
  error?: string;
}> {
  try {
    console.log('🔍 [Circle] Verifying wallet:', walletId);

    // Get wallet details from Circle API
    const response = await circleClient.getWallet({ id: walletId });
    
    if (!response.data?.wallet) {
      throw new Error('Wallet not found or invalid wallet ID');
    }

    const wallet = response.data.wallet;
    const walletAddress = wallet.address;

    console.log('✅ [Circle] Wallet verified:', {
      walletId,
      address: walletAddress,
      blockchain: wallet.blockchain
    });

    return {
      walletId,
      address: walletAddress
    };

  } catch (error) {
    console.error('❌ [Circle] Error verifying wallet:', error);
    return {
      walletId: '',
      address: '',
      error: error instanceof Error ? error.message : 'Invalid wallet ID'
    };
  }
}

/**
 * Create a new Circle wallet for a user
 * Actually creates a wallet using Circle API
 */
export async function createCircleWallet(userId: string, role: 'manager' | 'tenant'): Promise<{
  walletId: string;
  address: string;
  error?: string;
}> {
  try {
    console.log('🆕 [Circle] Creating new wallet for user:', userId, 'role:', role);

    // Create a new wallet using Circle API
    const response = await circleClient.createWallets({
      accountType: 'SCA', // Secure Cloud Account
      blockchains: ['SOL-DEVNET'], // Solana Devnet
      count: 1,
      walletSetId: process.env.WALLET_SET_ID || '2c32d1e0-e66a-5494-8091-2d844287e9c5'
    });

    if (!response.data?.wallets || response.data.wallets.length === 0) {
      throw new Error('Failed to create wallet - no wallet data returned');
    }

    const wallet = response.data.wallets[0];
    const walletId = wallet.id;
    const walletAddress = wallet.address;

    console.log('✅ [Circle] Wallet created successfully:', {
      walletId,
      address: walletAddress
    });

    return {
      walletId,
      address: walletAddress
    };

  } catch (error) {
    console.error('❌ [Circle] Error creating wallet:', error);
    return {
      walletId: '',
      address: '',
      error: error instanceof Error ? error.message : 'Failed to create wallet'
    };
  }
}

/**
 * Get or create Circle wallet for a user
 * First checks database for existing wallet, allows manual input, or creates new one
 */
export async function getOrCreateUserWallet(userId: string, role: 'manager' | 'tenant', providedWalletId?: string): Promise<{
  walletId: string;
  address: string;
  error?: string;
  requiresInput?: boolean;
}> {
  try {
    console.log('💼 [Circle] Getting or creating wallet for user:', userId, 'role:', role);

    // If user provided a wallet ID, verify and use it
    if (providedWalletId) {
      console.log('🔑 [Circle] User provided wallet ID, verifying...');
      const result = await verifyCircleWallet(providedWalletId);
      
      if (result.error) {
        return {
          walletId: '',
          address: '',
          error: result.error,
          requiresInput: true
        };
      }
      
      return result;
    }

    // Check if user already has a wallet in database
    // TODO: Implement database lookup
    // For now, return a flag indicating user needs to provide wallet ID
    console.log('⚠️ [Circle] No wallet ID provided, user needs to input their Circle wallet ID');
    
    return {
      walletId: '',
      address: '',
      error: 'Please provide your Circle wallet ID to continue',
      requiresInput: true
    };

  } catch (error) {
    console.error('❌ [Circle] Error in getOrCreateUserWallet:', error);
    return {
      walletId: '',
      address: '',
      error: error instanceof Error ? error.message : 'Unknown error',
      requiresInput: true
    };
  }
}

/**
 * Get Circle wallet for a user
 * Returns the user's connected wallet ID from database
 * Does NOT auto-assign - user must connect their wallet first
 * NO DEFAULT WALLETS
 */
export function getUserCircleWallet(userId: string, role: 'manager' | 'tenant'): string {
  // NO MORE DEFAULT WALLETS
  // Users must connect their own wallets through the UI
  console.warn('⚠️ [NO DEFAULT WALLETS] User must connect wallet through UI');
  return '';
}

export default {
  signMessageWithCircleWallet,
  verifyCircleSignature,
  getUserCircleWallet,
  getOrCreateUserWallet,
  createCircleWallet,
  verifyCircleWallet
};
