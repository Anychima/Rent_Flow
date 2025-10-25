/**
 * Solana Anchor Program Client
 * 
 * Integrates with RentFlow custom Anchor program for:
 * - On-chain lease creation with PDAs
 * - Multi-signature verification
 * - Atomic lease activation
 * - Lease status management
 */

import { Connection, PublicKey, Keypair, Transaction, SystemProgram } from '@solana/web3.js';
import { Program, AnchorProvider, Wallet, BN } from '@project-serum/anchor';
import crypto from 'crypto';

// Program ID will be set after deployment
const PROGRAM_ID = new PublicKey(process.env.SOLANA_PROGRAM_ID || 'RentF1ow11111111111111111111111111111111111');

export interface LeaseData {
  leaseId: string;
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

export interface LeaseSignature {
  leaseId: string;
  signerWallet: string;
  signerType: 'manager' | 'tenant';
  signature: string;
  timestamp: string;
}

class SolanaAnchorClient {
  private connection: Connection;
  private program: Program | null = null;
  private isConfigured: boolean = false;

  constructor() {
    const rpcUrl = process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com';
    this.connection = new Connection(rpcUrl, 'confirmed');

    try {
      // Try to initialize program if we have the IDL
      this.initializeProgram();
    } catch (error) {
      console.warn('⚠️  Anchor program not initialized. Will use Phase 1 fallback.');
      console.warn('   Deploy custom program first: npm run deploy:solana');
    }
  }

  private async initializeProgram() {
    try {
      // Load IDL from file (generated after anchor build)
      const idlPath = '../../target/idl/rentflow_core.json';
      const idl = require(idlPath);

      // Create provider (requires wallet for signing)
      // In production, this would use the backend's operational wallet
      const wallet = new Wallet(Keypair.generate()); // Placeholder
      const provider = new AnchorProvider(this.connection, wallet, {
        commitment: 'confirmed',
      });

      // Initialize program
      this.program = new Program(idl, PROGRAM_ID, provider);
      this.isConfigured = true;

      console.log('✅ Anchor program client initialized');
      console.log('   Program ID:', PROGRAM_ID.toBase58());
    } catch (error) {
      console.log('ℹ️  Anchor program not available, using Phase 1 implementation');
    }
  }

  /**
   * Derive PDA for lease account
   */
  private async getLeasePDA(leaseId: string): Promise<[PublicKey, number]> {
    return PublicKey.findProgramAddressSync(
      [Buffer.from('lease'), Buffer.from(leaseId)],
      PROGRAM_ID
    );
  }

  /**
   * Create lease hash for on-chain storage
   */
  private createLeaseHash(leaseData: LeaseData): Buffer {
    const hashInput = JSON.stringify({
      leaseId: leaseData.leaseId,
      propertyId: leaseData.propertyId,
      managerWallet: leaseData.managerWallet,
      tenantWallet: leaseData.tenantWallet,
      monthlyRent: leaseData.monthlyRent,
      securityDeposit: leaseData.securityDeposit,
      startDate: leaseData.startDate,
      endDate: leaseData.endDate,
    });

    return Buffer.from(crypto.createHash('sha256').update(hashInput).digest('hex'), 'hex');
  }

  /**
   * Initialize lease on-chain using custom Anchor program
   */
  async initializeLease(
    leaseData: LeaseData,
    managerKeypair: Keypair
  ): Promise<{
    success: boolean;
    transactionSignature?: string;
    leasePDA?: string;
    error?: string;
  }> {
    if (!this.isConfigured || !this.program) {
      return {
        success: false,
        error: 'Anchor program not initialized. Using Phase 1 fallback.',
      };
    }

    try {
      console.log('📝 [Anchor] Initializing lease on-chain...');
      console.log('   Lease ID:', leaseData.leaseId);

      // Derive PDA for lease
      const [leasePDA] = await this.getLeasePDA(leaseData.leaseId);
      console.log('   Lease PDA:', leasePDA.toBase58());

      // Create lease hash
      const leaseHash = this.createLeaseHash(leaseData);

      // Convert amounts to anchor BN
      const monthlyRent = new BN(leaseData.monthlyRent * 1_000_000); // Convert to USDC with 6 decimals
      const securityDeposit = new BN(leaseData.securityDeposit * 1_000_000);

      // Convert dates to unix timestamps
      const startDate = new BN(Math.floor(new Date(leaseData.startDate).getTime() / 1000));
      const endDate = new BN(Math.floor(new Date(leaseData.endDate).getTime() / 1000));

      // Call program instruction
      const tx = await this.program.methods
        .initializeLease(
          leaseData.leaseId,
          Array.from(leaseHash),
          new PublicKey(leaseData.tenantWallet),
          monthlyRent,
          securityDeposit,
          startDate,
          endDate
        )
        .accounts({
          lease: leasePDA,
          manager: managerKeypair.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([managerKeypair])
        .rpc();

      console.log('✅ [Anchor] Lease initialized on-chain!');
      console.log('   Transaction:', tx);
      console.log('   Explorer:', `https://explorer.solana.com/tx/${tx}?cluster=devnet`);

      return {
        success: true,
        transactionSignature: tx,
        leasePDA: leasePDA.toBase58(),
      };
    } catch (error) {
      console.error('❌ [Anchor] Error initializing lease:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Sign lease on-chain
   */
  async signLease(
    leaseId: string,
    signatureData: LeaseSignature,
    signerKeypair: Keypair
  ): Promise<{
    success: boolean;
    transactionSignature?: string;
    leaseActivated?: boolean;
    error?: string;
  }> {
    if (!this.isConfigured || !this.program) {
      return {
        success: false,
        error: 'Anchor program not initialized. Using Phase 1 fallback.',
      };
    }

    try {
      console.log('✍️  [Anchor] Signing lease on-chain...');
      console.log('   Lease ID:', leaseId);
      console.log('   Signer:', signatureData.signerType);

      // Derive PDA
      const [leasePDA] = await this.getLeasePDA(leaseId);

      // Create signature hash
      const signatureHash = Buffer.from(
        crypto.createHash('sha256').update(signatureData.signature).digest('hex'),
        'hex'
      );

      // Call program instruction
      const tx = await this.program.methods
        .signLease(Array.from(signatureHash))
        .accounts({
          lease: leasePDA,
          signer: signerKeypair.publicKey,
        })
        .signers([signerKeypair])
        .rpc();

      // Fetch lease account to check if activated
      const leaseAccount = await this.program.account.lease.fetch(leasePDA);
      const isActivated = leaseAccount.managerSigned && leaseAccount.tenantSigned;

      console.log('✅ [Anchor] Lease signed on-chain!');
      console.log('   Transaction:', tx);
      console.log('   Activated:', isActivated);

      return {
        success: true,
        transactionSignature: tx,
        leaseActivated: isActivated,
      };
    } catch (error) {
      console.error('❌ [Anchor] Error signing lease:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Verify lease on-chain
   */
  async verifyLease(leaseId: string): Promise<{
    success: boolean;
    verified: boolean;
    leaseData?: any;
    error?: string;
  }> {
    if (!this.isConfigured || !this.program) {
      return {
        success: false,
        verified: false,
        error: 'Anchor program not initialized',
      };
    }

    try {
      console.log('🔍 [Anchor] Verifying lease on-chain...');
      
      // Derive PDA
      const [leasePDA] = await this.getLeasePDA(leaseId);

      // Fetch lease account
      const leaseAccount = await this.program.account.lease.fetch(leasePDA);

      const isVerified = leaseAccount.managerSigned 
        && leaseAccount.tenantSigned 
        && leaseAccount.status.active !== undefined;

      console.log('✅ [Anchor] Lease verification complete');
      console.log('   Verified:', isVerified);
      console.log('   Manager signed:', leaseAccount.managerSigned);
      console.log('   Tenant signed:', leaseAccount.tenantSigned);
      console.log('   Status:', leaseAccount.status);

      return {
        success: true,
        verified: isVerified,
        leaseData: leaseAccount,
      };
    } catch (error) {
      console.error('❌ [Anchor] Error verifying lease:', error);
      return {
        success: false,
        verified: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Check if program is ready
   */
  isReady(): boolean {
    return this.isConfigured;
  }
}

export default new SolanaAnchorClient();
