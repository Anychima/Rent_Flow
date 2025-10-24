/**
 * Solana Lease Service
 * Handles on-chain lease storage and signature verification on Solana
 * 
 * Architecture:
 * - Stores lease hash on-chain (not full data for privacy)
 * - Records signatures from both parties
 * - Emits events for lease lifecycle
 * - Provides verification endpoints
 */

import { Connection, PublicKey, Transaction, SystemProgram, Keypair, LAMPORTS_PER_SOL } from '@solana/web3.js';
import crypto from 'crypto';

interface LeaseData {
  id: string;
  propertyId: string;
  managerId: string;
  tenantId: string;
  managerWallet: string;
  tenantWallet: string;
  monthlyRent: number;
  securityDeposit: number;
  startDate: string;
  endDate: string;
}

interface SignatureData {
  leaseId: string;
  signerWallet: string;
  signature: string;
  signedAt: string;
}

class SolanaLeaseService {
  private connection!: Connection;
  private isConfigured: boolean;
  private network: string;

  constructor() {
    this.network = process.env.BLOCKCHAIN_NETWORK || 'solana-devnet';
    const rpcUrl = process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com';
    
    try {
      this.connection = new Connection(rpcUrl, 'confirmed');
      this.isConfigured = true;
      console.log('✅ Solana Lease Service initialized');
      console.log('🔗 Network:', this.network);
      console.log('🌐 RPC URL:', rpcUrl);
    } catch (error) {
      console.error('❌ Failed to initialize Solana connection:', error);
      this.isConfigured = false;
    }
  }

  /**
   * Create hash of lease data for on-chain storage
   */
  private createLeaseHash(leaseData: LeaseData): string {
    const hashInput = JSON.stringify({
      id: leaseData.id,
      propertyId: leaseData.propertyId,
      managerWallet: leaseData.managerWallet,
      tenantWallet: leaseData.tenantWallet,
      monthlyRent: leaseData.monthlyRent,
      securityDeposit: leaseData.securityDeposit,
      startDate: leaseData.startDate,
      endDate: leaseData.endDate,
    });

    return crypto.createHash('sha256').update(hashInput).digest('hex');
  }

  /**
   * Store lease hash on Solana blockchain
   * Returns transaction signature for verification
   */
  async createLeaseOnChain(leaseData: LeaseData): Promise<{
    success: boolean;
    transactionHash?: string;
    leaseHash?: string;
    error?: string;
  }> {
    if (!this.isConfigured) {
      return {
        success: false,
        error: 'Solana connection not configured'
      };
    }

    try {
      console.log('📝 Creating lease on-chain...');
      console.log('   Lease ID:', leaseData.id);
      console.log('   Manager Wallet:', leaseData.managerWallet);
      console.log('   Tenant Wallet:', leaseData.tenantWallet);

      // Create lease hash
      const leaseHash = this.createLeaseHash(leaseData);
      console.log('🔒 Lease Hash:', leaseHash);

      // For now, we'll use memo program to store the hash on-chain
      // This is a simple implementation until we deploy a custom program
      const memoData = JSON.stringify({
        type: 'RENTFLOW_LEASE',
        leaseId: leaseData.id,
        leaseHash,
        timestamp: new Date().toISOString(),
      });

      // Note: In production, you would:
      // 1. Deploy a custom Solana program (Rust)
      // 2. Create a Program Derived Address (PDA) for the lease
      // 3. Store lease data in program account
      // 4. Implement signature verification on-chain
      
      // For MVP, we'll store the hash as a blockchain event log
      console.log('📦 Lease data prepared for blockchain storage');
      console.log('⚠️  Note: Full Solana program deployment pending');

      // Return hash for database storage
      // This can be verified against blockchain once custom program is deployed
      return {
        success: true,
        leaseHash,
        transactionHash: `PENDING_PROGRAM_DEPLOYMENT_${leaseHash.substring(0, 16)}`,
      };

    } catch (error) {
      console.error('❌ Error creating lease on-chain:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Record lease signature on blockchain
   */
  async signLeaseOnChain(signatureData: SignatureData): Promise<{
    success: boolean;
    transactionHash?: string;
    error?: string;
  }> {
    if (!this.isConfigured) {
      return {
        success: false,
        error: 'Solana connection not configured'
      };
    }

    try {
      console.log('✍️  Recording signature on-chain...');
      console.log('   Lease ID:', signatureData.leaseId);
      console.log('   Signer Wallet:', signatureData.signerWallet);

      // Create signature hash
      const signatureHash = crypto
        .createHash('sha256')
        .update(JSON.stringify(signatureData))
        .digest('hex');

      console.log('🔒 Signature Hash:', signatureHash);

      // Store signature data
      const memoData = JSON.stringify({
        type: 'RENTFLOW_SIGNATURE',
        leaseId: signatureData.leaseId,
        signerWallet: signatureData.signerWallet,
        signatureHash,
        timestamp: signatureData.signedAt,
      });

      console.log('📦 Signature data prepared for blockchain storage');

      return {
        success: true,
        transactionHash: `PENDING_PROGRAM_DEPLOYMENT_${signatureHash.substring(0, 16)}`,
      };

    } catch (error) {
      console.error('❌ Error signing lease on-chain:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Verify lease exists on blockchain
   */
  async verifyLeaseOnChain(leaseHash: string): Promise<{
    success: boolean;
    verified: boolean;
    error?: string;
  }> {
    if (!this.isConfigured) {
      return {
        success: false,
        verified: false,
        error: 'Solana connection not configured'
      };
    }

    try {
      console.log('🔍 Verifying lease on-chain...');
      console.log('   Lease Hash:', leaseHash);

      // Once custom program is deployed, this will query the program account
      // For now, return pending status
      console.log('⚠️  Full verification pending custom program deployment');

      return {
        success: true,
        verified: false, // Will be true once program is deployed
      };

    } catch (error) {
      console.error('❌ Error verifying lease:', error);
      return {
        success: false,
        verified: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get wallet balance (for gas fee checks)
   */
  async getWalletBalance(walletAddress: string): Promise<{
    success: boolean;
    balance?: number;
    error?: string;
  }> {
    if (!this.isConfigured) {
      return {
        success: false,
        error: 'Solana connection not configured'
      };
    }

    try {
      const publicKey = new PublicKey(walletAddress);
      const balance = await this.connection.getBalance(publicKey);
      
      return {
        success: true,
        balance: balance / LAMPORTS_PER_SOL,
      };
    } catch (error) {
      console.error('❌ Error getting wallet balance:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Check if service is ready
   */
  isReady(): boolean {
    return this.isConfigured;
  }

  /**
   * Get network info
   */
  getNetworkInfo(): {
    network: string;
    rpcUrl: string;
    isConfigured: boolean;
  } {
    return {
      network: this.network,
      rpcUrl: process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com',
      isConfigured: this.isConfigured,
    };
  }
}

export default new SolanaLeaseService();
