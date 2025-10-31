import { ethers } from 'ethers';
import * as dotenv from 'dotenv';

dotenv.config();

/**
 * Service for interacting with RentFlowCore smart contract
 * Handles on-chain property, lease, and payment tracking
 */

// Contract ABI (key functions)
const RENT_FLOW_CORE_ABI = [
  "function registerProperty(uint88 monthlyRent, uint88 securityDeposit) external returns (uint256)",
  "function createLease(uint256 propertyId, address tenant, uint64 startDate, uint32 durationMonths, uint32 rentDueDay) external returns (uint256)",
  "function payRent(uint256 leaseId) external payable",
  "function getProperty(uint256 propertyId) external view returns (tuple(address owner, uint88 monthlyRent, uint88 securityDeposit, uint32 createdAt, bool isActive))",
  "function getLease(uint256 leaseId) external view returns (tuple(uint256 propertyId, address tenant, uint88 securityDepositHeld, bool isActive, uint64 startDate, uint64 endDate, uint32 rentDueDay, uint64 lastPaymentDate, uint64 totalPaid, uint8 status))",
  "function propertyCounter() external view returns (uint256)",
  "function leaseCounter() external view returns (uint256)",
  "event PropertyRegistered(uint256 indexed propertyId, address indexed owner, uint256 monthlyRent)",
  "event LeaseCreated(uint256 indexed leaseId, uint256 indexed propertyId, address indexed tenant)",
  "event RentPaid(uint256 indexed leaseId, uint256 amount, uint256 timestamp)"
];

class RentFlowCoreService {
  private contract!: ethers.Contract;
  private provider!: ethers.JsonRpcProvider;
  private wallet!: ethers.Wallet;
  private isConfigured: boolean = false;

  constructor() {
    try {
      // Initialize provider
      this.provider = new ethers.JsonRpcProvider(
        process.env.ARC_RPC_URL || 'https://rpc.testnet.arc.network'
      );

      // Initialize wallet
      const privateKey = process.env.DEPLOYER_PRIVATE_KEY;
      if (!privateKey || privateKey.length !== 66) {
        console.warn('⚠️  [RentFlowCore] DEPLOYER_PRIVATE_KEY not configured properly');
        return;
      }
      this.wallet = new ethers.Wallet(privateKey, this.provider);

      // Initialize contract
      const contractAddress = process.env.RENT_FLOW_CORE_CONTRACT;
      if (!contractAddress) {
        console.warn('⚠️  [RentFlowCore] RENT_FLOW_CORE_CONTRACT not found in environment');
        return;
      }

      this.contract = new ethers.Contract(contractAddress, RENT_FLOW_CORE_ABI, this.wallet);
      this.isConfigured = true;

      console.log('✅ [RentFlowCore] Service initialized:', contractAddress);
    } catch (error) {
      console.error('❌ [RentFlowCore] Initialization failed:', error);
      this.isConfigured = false;
    }
  }

  /**
   * Check if service is ready
   */
  isReady(): boolean {
    return this.isConfigured;
  }

  /**
   * Register a property on-chain
   */
  async registerProperty(params: {
    monthlyRent: number;
    securityDeposit: number;
  }): Promise<{ success: boolean; propertyId?: number; transactionHash?: string; error?: string }> {
    if (!this.isConfigured) {
      return { success: false, error: 'RentFlowCore not configured' };
    }

    try {
      console.log('🏠 [RentFlowCore] Registering property on-chain...');

      // Convert to contract format (6 decimals for USDC)
      const monthlyRent = ethers.parseUnits(params.monthlyRent.toString(), 6);
      const securityDeposit = ethers.parseUnits(params.securityDeposit.toString(), 6);

      const tx = await this.contract.registerProperty(monthlyRent, securityDeposit);
      const receipt = await tx.wait();

      // Extract propertyId from event
      const event = receipt.logs.find((log: any) => {
        try {
          const parsed = this.contract.interface.parseLog(log);
          return parsed?.name === 'PropertyRegistered';
        } catch {
          return false;
        }
      });

      let propertyId = 0;
      if (event) {
        const parsed = this.contract.interface.parseLog(event);
        propertyId = Number(parsed?.args[0] || 0);
      }

      console.log('✅ [RentFlowCore] Property registered:', { propertyId, tx: receipt.hash });

      return {
        success: true,
        propertyId,
        transactionHash: receipt.hash
      };
    } catch (error) {
      console.error('❌ [RentFlowCore] Property registration failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Registration failed'
      };
    }
  }

  /**
   * Create a lease on-chain
   */
  async createLease(params: {
    propertyId: number;
    tenantAddress: string;
    startDate: Date;
    durationMonths: number;
    rentDueDay: number;
  }): Promise<{ success: boolean; leaseId?: number; transactionHash?: string; error?: string }> {
    if (!this.isConfigured) {
      return { success: false, error: 'RentFlowCore not configured' };
    }

    try {
      console.log('📝 [RentFlowCore] Creating lease on-chain...');

      const startTimestamp = Math.floor(params.startDate.getTime() / 1000);

      const tx = await this.contract.createLease(
        params.propertyId,
        params.tenantAddress,
        startTimestamp,
        params.durationMonths,
        params.rentDueDay
      );
      const receipt = await tx.wait();

      // Extract leaseId from event
      const event = receipt.logs.find((log: any) => {
        try {
          const parsed = this.contract.interface.parseLog(log);
          return parsed?.name === 'LeaseCreated';
        } catch {
          return false;
        }
      });

      let leaseId = 0;
      if (event) {
        const parsed = this.contract.interface.parseLog(event);
        leaseId = Number(parsed?.args[0] || 0);
      }

      console.log('✅ [RentFlowCore] Lease created:', { leaseId, tx: receipt.hash });

      return {
        success: true,
        leaseId,
        transactionHash: receipt.hash
      };
    } catch (error) {
      console.error('❌ [RentFlowCore] Lease creation failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Lease creation failed'
      };
    }
  }

  /**
   * Record rent payment on-chain
   */
  async recordRentPayment(params: {
    leaseId: number;
    amount: number;
  }): Promise<{ success: boolean; transactionHash?: string; error?: string }> {
    if (!this.isConfigured) {
      return { success: false, error: 'RentFlowCore not configured' };
    }

    try {
      console.log('💰 [RentFlowCore] Recording rent payment on-chain...');

      const tx = await this.contract.payRent(params.leaseId, {
        value: ethers.parseUnits(params.amount.toString(), 6)
      });
      const receipt = await tx.wait();

      console.log('✅ [RentFlowCore] Rent payment recorded:', receipt.hash);

      return {
        success: true,
        transactionHash: receipt.hash
      };
    } catch (error) {
      console.error('❌ [RentFlowCore] Rent payment recording failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Payment recording failed'
      };
    }
  }

  /**
   * Get property details from blockchain
   */
  async getProperty(propertyId: number) {
    if (!this.isConfigured) {
      return null;
    }

    try {
      const property = await this.contract.getProperty(propertyId);
      return {
        owner: property[0],
        monthlyRent: Number(ethers.formatUnits(property[1], 6)),
        securityDeposit: Number(ethers.formatUnits(property[2], 6)),
        createdAt: Number(property[3]),
        isActive: property[4]
      };
    } catch (error) {
      console.error('❌ [RentFlowCore] Get property failed:', error);
      return null;
    }
  }

  /**
   * Get lease details from blockchain
   */
  async getLease(leaseId: number) {
    if (!this.isConfigured) {
      return null;
    }

    try {
      const lease = await this.contract.getLease(leaseId);
      return {
        propertyId: Number(lease[0]),
        tenant: lease[1],
        securityDepositHeld: Number(ethers.formatUnits(lease[2], 6)),
        isActive: lease[3],
        startDate: Number(lease[4]),
        endDate: Number(lease[5]),
        rentDueDay: Number(lease[6]),
        lastPaymentDate: Number(lease[7]),
        totalPaid: Number(ethers.formatUnits(lease[8], 6)),
        status: Number(lease[9])
      };
    } catch (error) {
      console.error('❌ [RentFlowCore] Get lease failed:', error);
      return null;
    }
  }
}

export const rentFlowCoreService = new RentFlowCoreService();
