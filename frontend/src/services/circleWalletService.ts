/**
 * Circle Wallet Service for Lease Signing
 * Uses Circle Developer Controlled Wallets instead of Phantom
 */

const API_URL = process.env.REACT_APP_BACKEND_URL || 'https://rent-flow.onrender.com';

interface CircleWallet {
  walletId: string;
  address: string;   // Real blockchain address
  userId: string;
  role: 'manager' | 'tenant';
}

interface SignatureResponse {
  success: boolean;
  signature?: string;
  publicKey?: string;
  error?: string;
}

/**
 * Get Circle wallet for a user
 */
export async function getCircleWallet(
  userId: string, 
  role: 'manager' | 'tenant',
  walletId?: string
): Promise<CircleWallet | null> {
  try {
    const url = walletId 
      ? `${API_URL}/api/circle/wallet/${userId}?role=${role}&walletId=${walletId}`
      : `${API_URL}/api/circle/wallet/${userId}?role=${role}`;
    
    const response = await fetch(url);
    const result = await response.json();

    if (!result.success) {
      console.error('Failed to get Circle wallet:', result.error);
      
      // If requires input, throw special error
      if (result.requiresInput) {
        throw new Error('REQUIRES_WALLET_ID');
      }
      
      return null;
    }

    return result.data;
  } catch (error) {
    if (error instanceof Error && error.message === 'REQUIRES_WALLET_ID') {
      throw error; // Re-throw to be caught by caller
    }
    console.error('Error getting Circle wallet:', error);
    return null;
  }
}

/**
 * Sign a message with Circle wallet
 */
export async function signMessageWithCircle(walletId: string, message: string): Promise<SignatureResponse> {
  try {
    console.log('🔐 Signing message with Circle wallet:', walletId);
    console.log('📝 Message:', message);

    const response = await fetch(`${API_URL}/api/circle/sign-message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        walletId,
        message
      })
    });

    const result = await response.json();

    if (!result.success) {
      console.error('Failed to sign message:', result.error);
      return {
        success: false,
        error: result.error || 'Failed to sign message'
      };
    }

    console.log('✅ Message signed successfully');
    console.log('   Signature:', result.signature?.substring(0, 40) + '...');
    console.log('   Public Key:', result.publicKey);

    return result;
  } catch (error) {
    console.error('Error signing message with Circle:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

export default {
  getCircleWallet,
  signMessageWithCircle
};
