/**
 * Arc Testnet Payment Service
 * Handles USDC payments on Arc Testnet using Circle Developer Controlled Wallets
 * Based on working sendArcNative script
 */

import { initiateDeveloperControlledWalletsClient } from '@circle-fin/developer-controlled-wallets';
import arcWalletService from './arcWalletService';

interface TransferResult {
  success: boolean;
  transactionId?: string;
  transactionHash?: string;
  state?: string;
  error?: string;
  errorDetails?: string;
}

interface FeeEstimate {
  low?: string;
  medium?: string;
  high?: string;
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Clean and validate input
function clean(s: string | undefined): string {
  return (s || '').trim().replace(/\u200B|\u200C|\u200D|\uFEFF/g, '');
}

function isUUIDStrict(s: string): boolean {
  const x = clean(s);
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(x);
}

function isEvmAddress(s: string): boolean {
  return /^0x[0-9a-fA-F]{40}$/.test(s);
}

class ArcPaymentService {
  private client: any;
  private isConfigured: boolean;

  constructor() {
    const apiKey = process.env.CIRCLE_API_KEY || '';
    const entitySecret = process.env.ENTITY_SECRET_RAW || process.env.ENTITY_SECRET || '';

    // Validate entity secret (must be 64 hex characters)
    if (entitySecret && !/^[0-9a-f]{64}$/i.test(entitySecret)) {
      console.error('❌ [ArcPayment] ENTITY_SECRET_RAW must be exactly 64 hexadecimal characters');
      this.isConfigured = false;
      return;
    }

    this.isConfigured = !!(apiKey && entitySecret);

    if (!this.isConfigured) {
      console.warn('⚠️  [ArcPayment] Service not configured. Set CIRCLE_API_KEY and ENTITY_SECRET_RAW.');
    } else {
      try {
        this.client = initiateDeveloperControlledWalletsClient({
          apiKey,
          entitySecret,
        });
        console.log('✅ [ArcPayment] Circle client initialized for Arc Testnet payments');
      } catch (error) {
        console.error('❌ [ArcPayment] Failed to initialize Circle client:', error);
        this.isConfigured = false;
      }
    }
  }

  /**
   * Check if service is ready
   */
  isReady(): boolean {
    return this.isConfigured;
  }

  /**
   * Estimate transfer fee on Arc Testnet
   */
  async estimateFee(
    fromWalletId: string,
    toAddress: string,
    amount: number
  ): Promise<{ success: boolean; fees?: FeeEstimate; error?: string }> {
    if (!this.isConfigured) {
      return { success: false, error: 'Arc Payment Service not configured' };
    }

    try {
      // Validate inputs
      if (!isUUIDStrict(fromWalletId)) {
        return { success: false, error: 'Invalid wallet ID format' };
      }
      if (!isEvmAddress(toAddress)) {
        return { success: false, error: 'Invalid destination address (must be EVM 0x format)' };
      }
      if (!Number.isFinite(amount) || amount <= 0) {
        return { success: false, error: 'Amount must be positive' };
      }

      console.log(`💰 [ArcPayment] Estimating fee for ${amount} USDC transfer...`);
      
      const est = await this.client.estimateTransferFee({
        walletId: fromWalletId,
        blockchain: 'ARC-TESTNET',
        destinationAddress: toAddress,
        amount: [amount.toString()],
      });

      const fees: FeeEstimate = {
        low: est?.data?.low?.networkFee,
        medium: est?.data?.medium?.networkFee,
        high: est?.data?.high?.networkFee,
      };

      console.log(`📊 [ArcPayment] Fee estimate: Low=${fees.low}, Medium=${fees.medium}, High=${fees.high}`);

      return { success: true, fees };
    } catch (error: any) {
      console.error('❌ [ArcPayment] Error estimating fee:', error?.response?.data || error.message);
      return {
        success: false,
        error: error?.response?.data?.message || error.message || 'Failed to estimate fee'
      };
    }
  }

  /**
   * Send USDC payment on Arc Testnet
   * @param fromWalletId - Circle wallet ID (UUID) of sender
   * @param toAddress - Destination EVM address (0x...)
   * @param amount - Amount in USDC
   * @param feeLevel - Fee priority: LOW, MEDIUM, HIGH (default: MEDIUM)
   */
  async sendPayment(
    fromWalletId: string,
    toAddress: string,
    amount: number,
    feeLevel: 'LOW' | 'MEDIUM' | 'HIGH' = 'MEDIUM'
  ): Promise<TransferResult> {
    if (!this.isConfigured) {
      return {
        success: false,
        error: 'Arc Payment Service not configured. Please contact support.'
      };
    }

    try {
      // Clean inputs
      fromWalletId = clean(fromWalletId);
      toAddress = clean(toAddress);

      // Validate inputs
      if (!isUUIDStrict(fromWalletId)) {
        return { success: false, error: `Invalid wallet ID format: ${fromWalletId}` };
      }
      if (!isEvmAddress(toAddress)) {
        return { success: false, error: `Invalid destination address (must be EVM 0x format): ${toAddress}` };
      }
      if (!Number.isFinite(amount) || amount <= 0) {
        return { success: false, error: 'Amount must be positive' };
      }

      console.log(`💸 [ArcPayment] Initiating transfer:`);
      console.log(`   From Wallet ID: ${fromWalletId}`);
      console.log(`   To Address: ${toAddress}`);
      console.log(`   Amount: ${amount} USDC`);
      console.log(`   Fee Level: ${feeLevel}`);

      // Submit transaction
      console.log('📤 [ArcPayment] Submitting transaction to Arc Testnet...');
      const submit = await this.client.createTransaction({
        walletId: fromWalletId,
        blockchain: 'ARC-TESTNET',
        destinationAddress: toAddress,
        amounts: [amount.toString()],
        fee: { type: 'level', config: { feeLevel } },
      });

      const tx = submit?.data?.transaction || submit?.data;
      const txId = tx?.id || submit?.data?.id;
      const initState = tx?.state || submit?.data?.state;

      console.log('✅ [ArcPayment] Transaction submitted');
      console.log(`   Transaction ID: ${txId}`);
      console.log(`   Initial State: ${initState}`);

      if (!txId) {
        return {
          success: false,
          error: 'Transaction submitted but no ID returned'
        };
      }

      // Poll for transaction confirmation (max 10 attempts, 3 seconds each = 30 seconds)
      let finalState = initState;
      let txHash: string | undefined;
      let errorReason: string | undefined;
      let errorDetails: string | undefined;

      for (let i = 1; i <= 10; i++) {
        await sleep(3000);
        
        console.log(`🔍 [ArcPayment] Polling transaction status (attempt ${i}/10)...`);
        const cur = await this.client.getTransaction({ id: txId });
        const t = cur?.data?.transaction || cur?.data;
        
        finalState = t?.state || '(no state)';
        txHash = t?.txHash || t?.transactionHash || txHash;
        errorReason = t?.error?.reason || t?.errorReason;
        errorDetails = t?.error?.details || t?.errorDetails;

        console.log(`   State: ${finalState}${txHash ? `, Hash: ${txHash.substring(0, 20)}...` : ''}`);

        // Check for terminal states
        if (['CONFIRMED', 'COMPLETE', 'FAILED', 'REJECTED'].includes(finalState)) {
          console.log(`🏁 [ArcPayment] Transaction reached terminal state: ${finalState}`);
          break;
        }
      }

      // Return result
      if (finalState === 'CONFIRMED' || finalState === 'COMPLETE') {
        console.log('✅ [ArcPayment] Payment confirmed successfully!');
        console.log(`   Transaction Hash: ${txHash}`);
        console.log(`   Explorer: https://testnet.arcscan.app/tx/${txHash}`);
        
        return {
          success: true,
          transactionId: txId,
          transactionHash: txHash,
          state: finalState
        };
      } else if (finalState === 'FAILED' || finalState === 'REJECTED') {
        console.error('❌ [ArcPayment] Transaction failed');
        console.error(`   State: ${finalState}`);
        console.error(`   Reason: ${errorReason || 'Unknown'}`);
        console.error(`   Details: ${errorDetails || 'None'}`);
        
        return {
          success: false,
          transactionId: txId,
          state: finalState,
          error: errorReason || `Transaction ${finalState.toLowerCase()}`,
          errorDetails
        };
      } else {
        // Still pending after 30 seconds - but transaction was submitted
        console.warn('⏱️  [ArcPayment] Transaction still pending after 30 seconds');
        console.warn('   Transaction was submitted successfully and may complete shortly');
        console.warn('   Transaction ID:', txId);
        if (txHash) {
          console.warn('   Transaction Hash:', txHash);
          console.warn('   Explorer: https://testnet.arcscan.app/tx/' + txHash);
        }
        
        // Return success with pending state - the transaction was submitted
        // It may take longer than 30s to confirm on-chain
        return {
          success: true,  // Changed from false - transaction WAS submitted
          transactionId: txId,
          transactionHash: txHash,
          state: finalState,
          error: undefined,  // No error - just still processing
          errorDetails: `Transaction submitted successfully but still ${finalState}. Check status on explorer.`
        };
      }

    } catch (error: any) {
      const http = error?.response;
      if (http) {
        console.error('❌ [ArcPayment] HTTP Error:', http.status);
        console.error(JSON.stringify(http.data, null, 2));
        return {
          success: false,
          error: http.data?.message || `HTTP ${http.status} error`,
          errorDetails: JSON.stringify(http.data)
        };
      } else {
        console.error('❌ [ArcPayment] Error:', error?.message || error);
        return {
          success: false,
          error: error?.message || 'Failed to send payment'
        };
      }
    }
  }

  /**
   * Get transaction status by ID
   */
  async getTransactionStatus(transactionId: string): Promise<{
    success: boolean;
    transaction?: any;
    error?: string;
  }> {
    if (!this.isConfigured) {
      return { success: false, error: 'Arc Payment Service not configured' };
    }

    try {
      console.log(`🔍 [ArcPayment] Fetching transaction ${transactionId}...`);
      const response = await this.client.getTransaction({ id: transactionId });
      
      const transaction = response?.data?.transaction || response?.data;
      
      if (!transaction) {
        return { success: false, error: 'Transaction not found' };
      }

      console.log('✅ [ArcPayment] Transaction retrieved:');
      console.log(`   State: ${transaction.state}`);
      console.log(`   Hash: ${transaction.txHash || transaction.transactionHash || 'N/A'}`);

      return { success: true, transaction };
    } catch (error: any) {
      console.error('❌ [ArcPayment] Error fetching transaction:', error?.response?.data || error.message);
      return {
        success: false,
        error: error?.response?.data?.message || error.message || 'Failed to fetch transaction'
      };
    }
  }
}

// Export singleton instance
export const arcPaymentService = new ArcPaymentService();
export default arcPaymentService;
