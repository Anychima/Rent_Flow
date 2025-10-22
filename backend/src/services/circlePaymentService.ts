/**
 * Circle API Payment Service
 * Handles USDC transfers via Circle's APIs
 * Documentation: https://developers.circle.com/docs
 */

import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';

interface CircleTransferRequest {
  idempotencyKey: string;
  source: {
    type: string;
    id: string;
  };
  destination: {
    type: string;
    address: string;
    chain: string;
  };
  amount: {
    amount: string;
    currency: string;
  };
}

interface CircleTransferResponse {
  data: {
    id: string;
    status: string;
    transactionHash?: string;
    errorCode?: string;
  };
}

class CirclePaymentService {
  private apiKey: string;
  private baseUrl: string;
  private isConfigured: boolean;

  constructor() {
    this.apiKey = process.env.CIRCLE_API_KEY || '';
    this.baseUrl = process.env.CIRCLE_API_URL || 'https://api-sandbox.circle.com';
    this.isConfigured = !!this.apiKey;

    if (!this.isConfigured) {
      console.warn('⚠️  Circle API not configured. Payment transfers will be simulated.');
    }
  }

  /**
   * Check if Circle API is properly configured
   */
  isReady(): boolean {
    return this.isConfigured;
  }

  /**
   * Initiate a USDC transfer from landlord to tenant (or vice versa)
   */
  async initiateTransfer(
    fromWalletId: string,
    toAddress: string,
    amountUsdc: number,
    metadata: {
      paymentId: string;
      leaseId: string;
      purpose: string;
    }
  ): Promise<{ success: boolean; transactionHash?: string; error?: string }> {
    if (!this.isConfigured) {
      // Simulate successful transfer in development
      return {
        success: true,
        transactionHash: `SIMULATED_${uuidv4().substring(0, 8)}_${Date.now()}`,
      };
    }

    try {
      const transferRequest: CircleTransferRequest = {
        idempotencyKey: metadata.paymentId, // Ensure idempotency
        source: {
          type: 'wallet',
          id: fromWalletId,
        },
        destination: {
          type: 'blockchain',
          address: toAddress,
          chain: 'SOL', // Solana blockchain
        },
        amount: {
          amount: amountUsdc.toFixed(2),
          currency: 'USD',
        },
      };

      const response = await axios.post<CircleTransferResponse>(
        `${this.baseUrl}/v1/transfers`,
        transferRequest,
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.data.data.status === 'complete') {
        return {
          success: true,
          transactionHash: response.data.data.transactionHash,
        };
      } else if (response.data.data.status === 'pending') {
        // Transfer is processing, we'll need to check status later
        return {
          success: true,
          transactionHash: response.data.data.id, // Use transfer ID temporarily
        };
      } else {
        return {
          success: false,
          error: response.data.data.errorCode || 'Transfer failed',
        };
      }
    } catch (error) {
      console.error('Circle API transfer error:', error);
      
      if (axios.isAxiosError(error)) {
        return {
          success: false,
          error: error.response?.data?.message || error.message,
        };
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Check the status of a transfer
   */
  async getTransferStatus(transferId: string): Promise<{
    status: string;
    transactionHash?: string;
    error?: string;
  }> {
    if (!this.isConfigured) {
      return {
        status: 'complete',
        transactionHash: `SIMULATED_${transferId}`,
      };
    }

    try {
      const response = await axios.get<CircleTransferResponse>(
        `${this.baseUrl}/v1/transfers/${transferId}`,
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
          },
        }
      );

      return {
        status: response.data.data.status,
        transactionHash: response.data.data.transactionHash,
        error: response.data.data.errorCode,
      };
    } catch (error) {
      console.error('Circle API status check error:', error);
      return {
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Create a wallet for a user (landlord or tenant)
   */
  async createWallet(userId: string, description: string): Promise<{
    success: boolean;
    walletId?: string;
    address?: string;
    error?: string;
  }> {
    if (!this.isConfigured) {
      return {
        success: true,
        walletId: `SIMULATED_WALLET_${userId}`,
        address: `SIMULATED_ADDRESS_${userId}`,
      };
    }

    try {
      const response = await axios.post(
        `${this.baseUrl}/v1/wallets`,
        {
          idempotencyKey: uuidv4(),
          description,
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      return {
        success: true,
        walletId: response.data.data.walletId,
        address: response.data.data.addresses?.[0]?.address,
      };
    } catch (error) {
      console.error('Circle API wallet creation error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get wallet balance
   */
  async getWalletBalance(walletId: string): Promise<{
    success: boolean;
    balance?: number;
    error?: string;
  }> {
    if (!this.isConfigured) {
      return {
        success: true,
        balance: 10000, // Simulated balance
      };
    }

    try {
      const response = await axios.get(
        `${this.baseUrl}/v1/wallets/${walletId}`,
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
          },
        }
      );

      const usdcBalance = response.data.data.balances?.find(
        (b: any) => b.currency === 'USD'
      );

      return {
        success: true,
        balance: parseFloat(usdcBalance?.amount || '0'),
      };
    } catch (error) {
      console.error('Circle API balance check error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

export default new CirclePaymentService();
