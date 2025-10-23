/**
 * Circle API Payment Service
 * Handles USDC transfers via Circle's Developer Controlled Wallets SDK
 * Documentation: https://developers.circle.com/w3s/docs
 */

import { initiateDeveloperControlledWalletsClient } from '@circle-fin/developer-controlled-wallets';
import { v4 as uuidv4 } from 'uuid';

class CirclePaymentService {
  private client: any;
  private isConfigured: boolean;
  private blockchainNetwork: string;
  private usdcTokenId: string;

  constructor() {
    console.log('🔍 Circle API Environment Variables:');
    console.log('   CIRCLE_API_KEY:', process.env.CIRCLE_API_KEY ? `${process.env.CIRCLE_API_KEY.substring(0, 20)}...` : 'NOT SET');
    console.log('   ENTITY_SECRET:', process.env.ENTITY_SECRET ? 'SET' : 'NOT SET');
    console.log('   BLOCKCHAIN_NETWORK:', process.env.BLOCKCHAIN_NETWORK);
    console.log('   USDC_TOKEN_ID:', process.env.USDC_TOKEN_ID || 'NOT SET');
    
    const apiKey = process.env.CIRCLE_API_KEY || '';
    const entitySecret = process.env.ENTITY_SECRET || '';
    this.blockchainNetwork = process.env.BLOCKCHAIN_NETWORK || 'solana';
    this.isConfigured = !!(apiKey && entitySecret);
    
    // USDC token ID from environment (specific to your wallet set)
    this.usdcTokenId = process.env.USDC_TOKEN_ID || '';
    
    if (!this.usdcTokenId) {
      console.warn('⚠️  USDC_TOKEN_ID not set in environment. Transactions may fail.');
    }

    if (!this.isConfigured) {
      console.warn('⚠️  Circle API key or Entity Secret not found in environment variables.');
      console.warn('⚠️  Real blockchain transactions will NOT work without valid credentials.');
    } else {
      try {
        this.client = initiateDeveloperControlledWalletsClient({
          apiKey,
          entitySecret,
        });
        console.log('✅ Circle API configured successfully');
        console.log('🔗 Blockchain Network:', this.blockchainNetwork);
        console.log('🔑 API Key:', apiKey.substring(0, 20) + '...');
        console.log('🪙 USDC Token ID:', this.usdcTokenId);
      } catch (error) {
        console.error('❌ Failed to initialize Circle client:', error);
        this.isConfigured = false;
      }
    }
  }

  /**
   * Check if Circle API is properly configured
   */
  isReady(): boolean {
    return this.isConfigured;
  }

  /**
   * Get the current blockchain network
   */
  getBlockchainNetwork(): string {
    return this.blockchainNetwork;
  }

  /**
   * Get wallet balances
   */
  async getWalletBalances(walletId: string): Promise<{
    success: boolean;
    balances?: any[];
    error?: string;
  }> {
    if (!this.isConfigured) {
      return {
        success: false,
        error: 'Circle API not configured'
      };
    }

    try {
      console.log('💰 Fetching wallet balances:', walletId);
      const response = await this.client.getWalletBalances({ walletId });
      console.log('✅ Balances:', response.data);
      return {
        success: true,
        balances: response.data?.tokenBalances || []
      };
    } catch (error) {
      console.error('❌ Error fetching balances:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Initiate a USDC transfer on Solana Devnet using Circle SDK
   * This matches your working sendTransaction.js approach
   */
  async initiateTransfer(
    fromWalletId: string,
    toAddress: string,
    amountUsdc: number,
    metadata: {
      paymentId: string;
      leaseId: string;
      purpose: string;
      gasless?: boolean;
      destinationChain?: string;
    }
  ): Promise<{ success: boolean; transactionHash?: string; transactionId?: string; error?: string }> {
    // Validate inputs
    if (!fromWalletId || !toAddress) {
      return {
        success: false,
        error: 'Wallet ID and address are required'
      };
    }

    if (amountUsdc <= 0) {
      return {
        success: false,
        error: 'Amount must be greater than 0'
      };
    }

    if (amountUsdc > 1000000) {
      return {
        success: false,
        error: 'Amount exceeds maximum transfer limit'
      };
    }

    // Check if Circle API is configured
    if (!this.isConfigured) {
      console.error('❌ Circle API key not configured!');
      return {
        success: false,
        error: 'Circle API key not configured. Please add CIRCLE_API_KEY and ENTITY_SECRET to .env file.'
      };
    }

    try {
      console.log('🚀 Initiating REAL Circle SDK transaction...');
      console.log('   From Wallet:', fromWalletId);
      console.log('   To Address:', toAddress);
      console.log('   Amount:', amountUsdc, 'USDC');
      console.log('   Purpose:', metadata.purpose);
      console.log('   Token ID:', this.usdcTokenId);

      // Create transaction using Circle SDK (matching your sendTransaction.js)
      const response = await this.client.createTransaction({
        walletId: fromWalletId,
        destinationAddress: toAddress,
        amounts: [amountUsdc.toFixed(2)],
        tokenId: this.usdcTokenId,
        fee: {
          type: 'level',
          config: { feeLevel: 'HIGH' }
        },
        // Optional: add idempotencyKey for deduplication
        // idempotencyKey: metadata.paymentId
      });

      console.log('✅ Transaction submitted:', response.data);

      // Circle API returns: { id: '...', state: 'INITIATED', ... }
      const txId = response?.data?.id;
      const txState = response?.data?.state;

      if (!txId) {
        console.error('❌ No transaction ID in response:', response.data);
        return {
          success: false,
          error: 'No transaction ID returned from Circle API'
        };
      }

      console.log('✅ Transaction ID:', txId);
      console.log('🔄 Initial State:', txState);

      // Poll for transaction status (matching your sendTransaction.js)
      console.log('🔄 Polling for transaction status...');
      let attempt = 0;
      let finalState = txState;
      let txHash = response?.data?.txHash;

      while (attempt++ < 10) {
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        try {
          const statusResponse = await this.client.getTransaction({ id: txId });
          // Response structure: { data: { id, state, txHash, ... } }
          finalState = statusResponse?.data?.state;
          txHash = statusResponse?.data?.txHash || txHash;
          
          console.log(`🔍 Status attempt ${attempt}:`, finalState, txHash ? `(hash: ${txHash.substring(0, 20)}...)` : '(no hash yet)');
          
          if (['CONFIRMED', 'FAILED', 'REJECTED', 'COMPLETE'].includes(finalState)) {
            break;
          }
        } catch (pollError) {
          console.error('⚠️  Error polling transaction status:', pollError);
          break;
        }
      }

      if (finalState === 'CONFIRMED') {
        console.log('✅ Transaction CONFIRMED');
        console.log('🔗 Transaction Hash:', txHash);
        return {
          success: true,
          transactionHash: txHash || txId,
          transactionId: txId
        };
      } else if (finalState === 'FAILED' || finalState === 'REJECTED') {
        return {
          success: false,
          error: `Transaction ${finalState}`,
          transactionId: txId
        };
      } else {
        // Still pending after polling
        return {
          success: true,
          transactionHash: txHash || txId,
          transactionId: txId
        };
      }
    } catch (error) {
      console.error('❌ Circle SDK transaction error:', error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get the status of a transaction
   */
  async getTransferStatus(transactionId: string): Promise<{
    status: string;
    transactionHash?: string;
    error?: string;
  }> {
    if (!this.isConfigured) {
      return {
        status: 'error',
        error: 'Circle API not configured'
      };
    }

    try {
      console.log('🔍 Checking transaction status:', transactionId);
      const response = await this.client.getTransaction({ id: transactionId });
      // Response structure: { data: { id, state, txHash, ... } }
      const state = response?.data?.state;
      const txHash = response?.data?.txHash;
      
      return {
        status: state || 'unknown',
        transactionHash: txHash
      };
    } catch (error) {
      console.error('❌ Error checking transaction status:', error);
      return {
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get wallet balance (simplified)
   */
  async getWalletBalance(walletId: string): Promise<{
    success: boolean;
    balance?: number;
    error?: string;
  }> {
    const result = await this.getWalletBalances(walletId);
    
    if (!result.success) {
      return result;
    }

    // Find USDC balance
    const usdcBalance = result.balances?.find(
      (b: any) => b.token?.id === this.usdcTokenId
    );

    return {
      success: true,
      balance: parseFloat(usdcBalance?.amount || '0')
    };
  }
}

export default new CirclePaymentService();