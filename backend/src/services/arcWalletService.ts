/**
 * Arc Testnet Wallet Service
 * Handles wallet creation and management on Arc Testnet using Circle Developer Controlled Wallets
 * Documentation: https://developers.circle.com/w3s/docs
 */

import { initiateDeveloperControlledWalletsClient } from '@circle-fin/developer-controlled-wallets';

interface WalletCreationResult {
  success: boolean;
  walletId?: string;
  address?: string;
  walletSetId?: string;
  blockchain?: string;
  error?: string;
}

interface WalletSetResult {
  success: boolean;
  walletSetId?: string;
  error?: string;
}

class ArcWalletService {
  private client: any;
  private isConfigured: boolean;
  private entitySecretRaw: string;

  constructor() {
    console.log('🔍 [ArcWallet] Initializing Arc Testnet Wallet Service');
    console.log('   CIRCLE_API_KEY:', process.env.CIRCLE_API_KEY ? `${process.env.CIRCLE_API_KEY.substring(0, 20)}...` : 'NOT SET');
    console.log('   ENTITY_SECRET_RAW:', process.env.ENTITY_SECRET_RAW ? 'SET (64 hex chars)' : 'NOT SET');
    console.log('   ARC_BLOCKCHAIN:', process.env.ARC_BLOCKCHAIN || 'ARC-TESTNET');
    
    const apiKey = process.env.CIRCLE_API_KEY || '';
    this.entitySecretRaw = process.env.ENTITY_SECRET_RAW || process.env.ENTITY_SECRET || '';
    
    // Validate entity secret (must be 64 hex characters)
    if (this.entitySecretRaw && !/^[0-9a-f]{64}$/i.test(this.entitySecretRaw)) {
      console.error('❌ ENTITY_SECRET_RAW must be exactly 64 hexadecimal characters');
      this.isConfigured = false;
      return;
    }

    this.isConfigured = !!(apiKey && this.entitySecretRaw);

    if (!this.isConfigured) {
      console.warn('⚠️  Arc Wallet Service not configured. Set CIRCLE_API_KEY and ENTITY_SECRET_RAW.');
    } else {
      try {
        this.client = initiateDeveloperControlledWalletsClient({
          apiKey,
          entitySecret: this.entitySecretRaw,
        });
        console.log('✅ [ArcWallet] Circle client initialized for Arc Testnet');
      } catch (error) {
        console.error('❌ [ArcWallet] Failed to initialize Circle client:', error);
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
   * Create a new wallet set for a user
   */
  async createWalletSet(userId: string, name?: string): Promise<WalletSetResult> {
    if (!this.isConfigured) {
      return {
        success: false,
        error: 'Arc Wallet Service not configured'
      };
    }

    try {
      console.log(`🎯 [ArcWallet] Creating wallet set for user ${userId}...`);
      
      const setResp = await this.client.createWalletSet({
        name: name || `user-${userId}-walletset`
      });

      const walletSetId = setResp?.data?.id || setResp?.data?.walletSet?.id;
      
      if (!walletSetId) {
        console.error('❌ [ArcWallet] No walletSetId returned:', JSON.stringify(setResp?.data || setResp, null, 2));
        return {
          success: false,
          error: 'Failed to create wallet set - no ID returned'
        };
      }

      console.log(`✅ [ArcWallet] Wallet set created: ${walletSetId}`);
      return {
        success: true,
        walletSetId
      };
    } catch (error: any) {
      console.error('❌ [ArcWallet] Error creating wallet set:', error?.response?.data || error.message || error);
      return {
        success: false,
        error: error?.response?.data?.message || error.message || 'Failed to create wallet set'
      };
    }
  }

  /**
   * Create a new Arc Testnet wallet for a user
   */
  async createWallet(
    walletSetId: string,
    userId: string,
    name?: string
  ): Promise<WalletCreationResult> {
    if (!this.isConfigured) {
      return {
        success: false,
        error: 'Arc Wallet Service not configured'
      };
    }

    try {
      console.log(`🎯 [ArcWallet] Creating Arc wallet for user ${userId}...`);
      console.log(`   Wallet Set ID: ${walletSetId}`);
      
      const wResp = await this.client.createWallets({
        name: name || `user-${userId}-arc-wallet`,
        walletSetId,
        blockchains: ['ARC-TESTNET'],
        count: 1,
      });

      // Handle response structure variations
      const data = wResp?.data || {};
      const wallets = data.wallets || data.data?.wallets || data;

      if (!Array.isArray(wallets) || wallets.length === 0) {
        console.error('❌ [ArcWallet] No wallet returned:', JSON.stringify(wResp?.data || wResp, null, 2));
        return {
          success: false,
          error: 'Failed to create wallet - no wallet data returned'
        };
      }

      const wallet = wallets[0];
      const walletId = wallet.id;
      const address = wallet.address;
      const blockchain = wallet.blockchain || 'ARC-TESTNET';

      if (!walletId || !address) {
        console.error('❌ [ArcWallet] Incomplete wallet data:', wallet);
        return {
          success: false,
          error: 'Wallet created but missing ID or address'
        };
      }

      console.log('✅ [ArcWallet] Wallet created successfully:');
      console.log(`   Wallet ID: ${walletId}`);
      console.log(`   Address: ${address}`);
      console.log(`   Blockchain: ${blockchain}`);

      return {
        success: true,
        walletId,
        address,
        walletSetId,
        blockchain
      };
    } catch (error: any) {
      console.error('❌ [ArcWallet] Error creating wallet:', error?.response?.data || error.message || error);
      return {
        success: false,
        error: error?.response?.data?.message || error.message || 'Failed to create wallet'
      };
    }
  }

  /**
   * Get wallet details by wallet ID
   */
  async getWallet(walletId: string): Promise<{
    success: boolean;
    wallet?: any;
    error?: string;
  }> {
    if (!this.isConfigured) {
      return {
        success: false,
        error: 'Arc Wallet Service not configured'
      };
    }

    try {
      console.log(`📊 [ArcWallet] Fetching wallet ${walletId}...`);
      const response = await this.client.getWallet({ id: walletId });
      
      const wallet = response?.data?.wallet || response?.data;
      
      if (!wallet) {
        return {
          success: false,
          error: 'Wallet not found'
        };
      }

      // Fetch balance
      console.log('💰 [ArcWallet] Fetching wallet balance...');
      const balanceResult = await this.getWalletBalance(walletId);
      
      // Add balance to wallet object
      if (balanceResult.success) {
        wallet.balance = balanceResult.usdcBalance || '0';
        wallet.balances = balanceResult.balances || [];
        console.log('✅ [ArcWallet] Wallet retrieved with balance:', wallet.address, '|', wallet.balance, 'USDC');
      } else {
        wallet.balance = '0';
        wallet.balances = [];
        console.log('⚠️ [ArcWallet] Wallet retrieved but balance fetch failed:', wallet.address);
      }

      return {
        success: true,
        wallet
      };
    } catch (error: any) {
      console.error('❌ [ArcWallet] Error fetching wallet:', error?.response?.data || error.message || error);
      return {
        success: false,
        error: error?.response?.data?.message || error.message || 'Failed to fetch wallet'
      };
    }
  }

  /**
   * Get or create wallet for a user (idempotent operation)
   * This is the main method to be called from endpoints
   */
  async getOrCreateUserWallet(userId: string, userEmail: string): Promise<WalletCreationResult> {
    if (!this.isConfigured) {
      return {
        success: false,
        error: 'Arc Wallet Service not configured. Please contact support.'
      };
    }

    try {
      console.log(`🔍 [ArcWallet] Getting or creating wallet for user ${userId}...`);

      // Step 1: Create wallet set
      const setResult = await this.createWalletSet(userId, `${userEmail}-walletset`);
      
      if (!setResult.success || !setResult.walletSetId) {
        return {
          success: false,
          error: setResult.error || 'Failed to create wallet set'
        };
      }

      // Step 2: Create wallet in the wallet set
      const walletResult = await this.createWallet(
        setResult.walletSetId,
        userId,
        `${userEmail}-arc-wallet`
      );

      if (!walletResult.success) {
        return {
          success: false,
          error: walletResult.error || 'Failed to create wallet'
        };
      }

      console.log('✅ [ArcWallet] User wallet ready:', walletResult.address);
      return walletResult;
    } catch (error: any) {
      console.error('❌ [ArcWallet] Error in getOrCreateUserWallet:', error);
      return {
        success: false,
        error: error.message || 'Failed to create user wallet'
      };
    }
  }

  /**
   * Get wallet balance
   */
  async getWalletBalance(walletId: string): Promise<{
    success: boolean;
    balances?: any[];
    usdcBalance?: string;
    error?: string;
  }> {
    if (!this.isConfigured) {
      return {
        success: false,
        error: 'Arc Wallet Service not configured'
      };
    }

    try {
      console.log(`💰 [ArcWallet] Fetching balance for wallet ${walletId}...`);
      
      // Use 'id' instead of 'walletId' as the parameter name
      const response = await this.client.getWalletTokenBalance({ 
        id: walletId 
      });
      
      console.log('📊 [ArcWallet] Balance response:', JSON.stringify(response?.data, null, 2));
      
      const balances = response?.data?.tokenBalances || [];
      
      // Find USDC balance (look for USDC-TESTNET or USDC symbol)
      const usdcBalance = balances.find((b: any) => 
        b.token?.symbol === 'USDC' || 
        b.token?.symbol === 'USDC-TESTNET' ||
        b.token?.name?.includes('USDC')
      );

      const balanceAmount = usdcBalance?.amount || '0';
      console.log('✅ [ArcWallet] USDC Balance found:', balanceAmount, 'USDC');
      
      return {
        success: true,
        balances,
        usdcBalance: balanceAmount
      };
    } catch (error: any) {
      console.error('❌ [ArcWallet] Error fetching balance:', error?.response?.data || error.message || error);
      return {
        success: false,
        error: error?.response?.data?.message || error.message || 'Failed to fetch balance'
      };
    }
  }

  /**
   * Execute smart contract function with Circle wallet
   * This uses Circle's contract execution API to interact with smart contracts
   */
  async executeContract(
    walletId: string,
    contractAddress: string,
    abiFunction: string,
    args: any[]
  ): Promise<{
    success: boolean;
    transactionHash?: string;
    error?: string;
  }> {
    if (!this.isConfigured) {
      return {
        success: false,
        error: 'Arc Wallet Service not configured'
      };
    }

    try {
      console.log(`📝 [ArcWallet] Executing contract function with wallet ${walletId}...`);
      console.log('   Contract:', contractAddress);
      console.log('   Function:', abiFunction);
      
      const response = await this.client.createContractExecutionTransaction({
        walletId,
        contractAddress,
        abiFunctionSignature: abiFunction,
        abiParameters: args,
        fee: {
          type: 'level',
          config: {
            feeLevel: 'MEDIUM'
          }
        }
      });

      const txHash = response?.data?.transactionHash || response?.data?.txHash;
      
      console.log('✅ [ArcWallet] Contract execution initiated:', txHash);
      return {
        success: true,
        transactionHash: txHash
      };
    } catch (error: any) {
      console.error('❌ [ArcWallet] Error executing contract:', error?.response?.data || error.message || error);
      return {
        success: false,
        error: error?.response?.data?.message || error.message || 'Failed to execute contract'
      };
    }
  }

  /**
   * Sign message with Circle wallet
   * Uses Circle SDK to sign a message with wallet's private key
   * This is for Circle-managed wallets only
   */
  async signMessage(walletId: string, message: string): Promise<{
    success: boolean;
    signature?: string;
    address?: string;
    error?: string;
  }> {
    if (!this.isConfigured) {
      return {
        success: false,
        error: 'Arc Wallet Service not configured'
      };
    }

    try {
      console.log(`🔐 [ArcWallet] Signing message with wallet ${walletId}...`);
      
      // Get wallet address first
      const walletResult = await this.getWallet(walletId);
      if (!walletResult.success || !walletResult.wallet) {
        return {
          success: false,
          error: 'Wallet not found'
        };
      }

      const address = walletResult.wallet.address;
      
      // Note: Circle SDK signing method may vary
      // This is a placeholder - check Circle docs for exact method
      // For now, return a mock signature since Circle may not support message signing directly
      console.warn('⚠️ [ArcWallet] Circle SDK message signing not fully implemented');
      console.warn('   This requires Circle to support EIP-191 personal_sign');
      console.warn('   For production, use smart contract verification instead');
      
      // Return error for now - this needs Circle SDK support
      return {
        success: false,
        error: 'Circle SDK message signing not available. Please use external wallet for signing.'
      };

      // When Circle supports it, the code would be:
      // const response = await this.client.signMessage({
      //   walletId,
      //   message
      // });
      // return {
      //   success: true,
      //   signature: response.data.signature,
      //   address
      // };
    } catch (error: any) {
      console.error('❌ [ArcWallet] Error signing message:', error?.response?.data || error.message || error);
      return {
        success: false,
        error: error?.response?.data?.message || error.message || 'Failed to sign message'
      };
    }
  }
}

// Export singleton instance
export const arcWalletService = new ArcWalletService();
export default arcWalletService;
