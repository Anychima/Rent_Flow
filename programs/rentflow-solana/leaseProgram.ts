/**
 * RentFlow Solana Lease Program Client
 * 
 * This TypeScript client interacts with Solana blockchain for lease storage.
 * Uses Memo program for MVP, with migration path to custom Anchor program.
 */

import { 
  Connection, 
  PublicKey, 
  Transaction, 
  TransactionInstruction,
  Keypair,
  SystemProgram,
  LAMPORTS_PER_SOL,
  sendAndConfirmTransaction
} from '@solana/web3.js';
import crypto from 'crypto';

// Solana Memo Program ID (native program for storing arbitrary data)
const MEMO_PROGRAM_ID = new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr');

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
  status: 'pending' | 'active' | 'terminated' | 'completed';
}

export interface LeaseSignature {
  leaseId: string;
  signerWallet: string;
  signerType: 'manager' | 'tenant';
  signature: string;
  timestamp: string;
}

export interface OnChainLease {
  leaseHash: string;
  transactionSignature: string;
  blockTime: number;
  verified: boolean;
}

/**
 * Create a hash of lease data for on-chain storage
 */
export function createLeaseHash(leaseData: LeaseData): string {
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

  return crypto.createHash('sha256').update(hashInput).digest('hex');
}

/**
 * Store lease hash on Solana using Memo program
 */
export async function storLeaseOnChain(
  connection: Connection,
  payer: Keypair,
  leaseData: LeaseData
): Promise<{ success: boolean; transactionSignature?: string; leaseHash?: string; error?: string }> {
  try {
    console.log('📝 [Solana] Storing lease on-chain...');
    console.log('   Lease ID:', leaseData.leaseId);
    console.log('   Manager:', leaseData.managerWallet);
    console.log('   Tenant:', leaseData.tenantWallet);

    // Create lease hash
    const leaseHash = createLeaseHash(leaseData);
    console.log('🔒 Lease Hash:', leaseHash);

    // Create memo data
    const memoData = JSON.stringify({
      type: 'RENTFLOW_LEASE_CREATION',
      version: '1.0',
      leaseId: leaseData.leaseId,
      leaseHash,
      propertyId: leaseData.propertyId,
      managerWallet: leaseData.managerWallet,
      tenantWallet: leaseData.tenantWallet,
      monthlyRent: leaseData.monthlyRent,
      securityDeposit: leaseData.securityDeposit,
      startDate: leaseData.startDate,
      endDate: leaseData.endDate,
      timestamp: new Date().toISOString(),
    });

    // Create memo instruction
    const memoInstruction = new TransactionInstruction({
      keys: [],
      programId: MEMO_PROGRAM_ID,
      data: Buffer.from(memoData, 'utf8'),
    });

    // Create transaction
    const transaction = new Transaction().add(memoInstruction);

    // Get recent blockhash
    const { blockhash } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = payer.publicKey;

    // Sign and send transaction
    console.log('📡 [Solana] Sending transaction...');
    const signature = await sendAndConfirmTransaction(
      connection,
      transaction,
      [payer],
      {
        commitment: 'confirmed',
        maxRetries: 3,
      }
    );

    console.log('✅ [Solana] Lease stored on-chain!');
    console.log('   Transaction:', signature);
    console.log('   Explorer:', `https://explorer.solana.com/tx/${signature}?cluster=devnet`);

    return {
      success: true,
      transactionSignature: signature,
      leaseHash,
    };
  } catch (error) {
    console.error('❌ [Solana] Error storing lease:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Record lease signature on-chain
 */
export async function recordSignatureOnChain(
  connection: Connection,
  payer: Keypair,
  signatureData: LeaseSignature
): Promise<{ success: boolean; transactionSignature?: string; error?: string }> {
  try {
    console.log('✍️  [Solana] Recording signature on-chain...');
    console.log('   Lease ID:', signatureData.leaseId);
    console.log('   Signer:', signatureData.signerWallet);
    console.log('   Type:', signatureData.signerType);

    // Create signature hash
    const signatureHash = crypto
      .createHash('sha256')
      .update(JSON.stringify(signatureData))
      .digest('hex');

    // Create memo data
    const memoData = JSON.stringify({
      type: 'RENTFLOW_LEASE_SIGNATURE',
      version: '1.0',
      leaseId: signatureData.leaseId,
      signerWallet: signatureData.signerWallet,
      signerType: signatureData.signerType,
      signatureHash,
      timestamp: signatureData.timestamp,
    });

    // Create memo instruction
    const memoInstruction = new TransactionInstruction({
      keys: [],
      programId: MEMO_PROGRAM_ID,
      data: Buffer.from(memoData, 'utf8'),
    });

    // Create transaction
    const transaction = new Transaction().add(memoInstruction);

    // Get recent blockhash
    const { blockhash } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = payer.publicKey;

    // Sign and send transaction
    console.log('📡 [Solana] Sending signature transaction...');
    const signature = await sendAndConfirmTransaction(
      connection,
      transaction,
      [payer],
      {
        commitment: 'confirmed',
        maxRetries: 3,
      }
    );

    console.log('✅ [Solana] Signature recorded on-chain!');
    console.log('   Transaction:', signature);
    console.log('   Explorer:', `https://explorer.solana.com/tx/${signature}?cluster=devnet`);

    return {
      success: true,
      transactionSignature: signature,
    };
  } catch (error) {
    console.error('❌ [Solana] Error recording signature:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Verify lease exists on-chain by checking transaction
 */
export async function verifyLeaseOnChain(
  connection: Connection,
  transactionSignature: string
): Promise<{ success: boolean; verified: boolean; leaseData?: any; error?: string }> {
  try {
    console.log('🔍 [Solana] Verifying lease on-chain...');
    console.log('   Transaction:', transactionSignature);

    // Get transaction details
    const transaction = await connection.getTransaction(transactionSignature, {
      commitment: 'confirmed',
      maxSupportedTransactionVersion: 0,
    });

    if (!transaction) {
      return {
        success: false,
        verified: false,
        error: 'Transaction not found',
      };
    }

    // Extract memo data from transaction
    const memoInstruction = transaction.transaction.message.instructions.find(
      (ix: any) => ix.programId.equals(MEMO_PROGRAM_ID)
    );

    if (!memoInstruction) {
      return {
        success: false,
        verified: false,
        error: 'No memo instruction found',
      };
    }

    // Parse memo data
    const memoData = Buffer.from(memoInstruction.data).toString('utf8');
    const parsedData = JSON.parse(memoData);

    console.log('✅ [Solana] Lease verified on-chain!');
    console.log('   Type:', parsedData.type);
    console.log('   Lease ID:', parsedData.leaseId);
    console.log('   Hash:', parsedData.leaseHash);

    return {
      success: true,
      verified: true,
      leaseData: parsedData,
    };
  } catch (error) {
    console.error('❌ [Solana] Error verifying lease:', error);
    return {
      success: false,
      verified: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get lease history from blockchain
 */
export async function getLeaseHistory(
  connection: Connection,
  leaseId: string,
  walletAddress: string
): Promise<{ success: boolean; transactions?: any[]; error?: string }> {
  try {
    console.log('📜 [Solana] Fetching lease history...');
    console.log('   Lease ID:', leaseId);
    console.log('   Wallet:', walletAddress);

    // Get signatures for address
    const publicKey = new PublicKey(walletAddress);
    const signatures = await connection.getSignaturesForAddress(publicKey, {
      limit: 100,
    });

    // Filter for RentFlow transactions
    const leaseTransactions = [];
    
    for (const sig of signatures) {
      try {
        const tx = await connection.getTransaction(sig.signature, {
          commitment: 'confirmed',
          maxSupportedTransactionVersion: 0,
        });

        if (tx) {
          const memoIx = tx.transaction.message.instructions.find(
            (ix: any) => ix.programId.equals(MEMO_PROGRAM_ID)
          );

          if (memoIx) {
            const memoData = Buffer.from(memoIx.data).toString('utf8');
            const parsed = JSON.parse(memoData);
            
            if (parsed.leaseId === leaseId && parsed.type?.startsWith('RENTFLOW_')) {
              leaseTransactions.push({
                signature: sig.signature,
                blockTime: sig.blockTime,
                data: parsed,
              });
            }
          }
        }
      } catch (err) {
        // Skip invalid transactions
        continue;
      }
    }

    console.log(`✅ [Solana] Found ${leaseTransactions.length} lease transactions`);

    return {
      success: true,
      transactions: leaseTransactions,
    };
  } catch (error) {
    console.error('❌ [Solana] Error fetching history:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export default {
  createLeaseHash,
  storLeaseOnChain,
  recordSignatureOnChain,
  verifyLeaseOnChain,
  getLeaseHistory,
};
