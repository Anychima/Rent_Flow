/**
 * Solana Lease Service
 * Handles on-chain lease storage and signature verification on Solana
 * 
 * Architecture:
 * - Stores lease hash on-chain using Solana Memo program
 * - Records signatures from both parties
 * - Provides verification endpoints
 * - Uses Solana Web3.js for blockchain interaction
 */

import { Connection, PublicKey, Keypair, LAMPORTS_PER_SOL } from '@solana/web3.js';
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
  private programKeypair: Keypair | null = null;

  constructor() {
    this.network = process.env.BLOCKCHAIN_NETWORK || 'solana-devnet';
    const rpcUrl = process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com';
    
    try {
      this.connection = new Connection(rpcUrl, 'confirmed');
      this.isConfigured = true;
      
      // Initialize program keypair if private key provided
      if (process.env.SOLANA_PROGRAM_KEYPAIR) {
        try {
          const secretKey = JSON.parse(process.env.SOLANA_PROGRAM_KEYPAIR);
          this.programKeypair = Keypair.fromSecretKey(Uint8Array.from(secretKey));
          console.log('✅ Solana program keypair loaded');
        } catch (err) {
          console.warn('⚠️  Failed to load program keypair, using read-only mode');
        }
      }
      
      console.log('✅ Solana Lease Service initialized');
      console.log('🔗 Network:', this.network);
      console.log('🌐 RPC URL:', rpcUrl);
      console.log('📝 Mode:', this.programKeypair ? 'Read/Write' : 'Read-Only');
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
   * Check if service is ready
   */
  isReady(): boolean {
    return this.isConfigured;
  }

  /**
   * Get network info
   */
  getNetworkInfo(): { network: string; rpcUrl: string; canWrite: boolean } {
    return {
      network: this.network,
      rpcUrl: process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com',
      canWrite: !!this.programKeypair,
    };
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
      console.log('📝 [Solana] Creating lease on-chain...');
      console.log('   Lease ID:', leaseData.id);
      console.log('   Manager Wallet:', leaseData.managerWallet);
      console.log('   Tenant Wallet:', leaseData.tenantWallet);

      // Create lease hash
      const leaseHash = this.createLeaseHash(leaseData);
      console.log('🔒 Lease Hash:', leaseHash);

      // TODO: Use Solana Memo program or custom program to store hash
      // For MVP, we'll return the hash for database storage
      // Full on-chain storage will be implemented when we deploy custom Anchor program
      
      console.log('📦 Lease data prepared for blockchain storage');
      console.log('⚠️  Note: Waiting for custom Solana program deployment');
      console.log('💡 Tip: For now, lease hash is stored in database with pending on-chain status');

      return {
        success: true,
        leaseHash,
        transactionHash: `PENDING_SOLANA_PROGRAM_${leaseHash.substring(0, 16)}`,
      };

    } catch (error) {
      console.error('❌ [Solana] Error creating lease on-chain:', error);
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
      console.log('✍️  [Solana] Recording signature on-chain...');
      console.log('   Lease ID:', signatureData.leaseId);
      console.log('   Signer Wallet:', signatureData.signerWallet);

      // Create signature hash
      const signatureHash = crypto
        .createHash('sha256')
        .update(JSON.stringify(signatureData))
        .digest('hex');

      console.log('🔒 Signature Hash:', signatureHash);

      // TODO: Store signature on-chain using custom program
      console.log('📦 Signature data prepared for blockchain storage');
      console.log('⚠️  Note: Waiting for custom Solana program deployment');

      return {
        success: true,
        transactionHash: `PENDING_SOLANA_PROGRAM_${signatureHash.substring(0, 16)}`,
      };

    } catch (error) {
      console.error('❌ [Solana] Error signing lease on-chain:', error);
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
      console.log('🔍 [Solana] Verifying lease on-chain...');
      console.log('   Lease Hash:', leaseHash);

      // TODO: Query custom program account for lease verification
      // For now, return pending status
      console.log('⚠️  Full verification pending custom Solana program deployment');

      return {
        success: true,
        verified: false, // Will be true once program is deployed
      };

    } catch (error) {
      console.error('❌ [Solana] Error verifying lease:', error);
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
      console.error('❌ [Solana] Error getting wallet balance:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

export default new SolanaLeaseService();
