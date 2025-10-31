import { ethers } from 'ethers';
import * as dotenv from 'dotenv';

dotenv.config();

/**
 * Service for interacting with RentFlowAIDecisions smart contract
 * Records AI decision-making on-chain for transparency and auditability
 */

// Contract ABI (only the functions we need)
const AI_DECISIONS_ABI = [
  "function recordPaymentDecision(address tenant, address landlord, uint256 amountUSDC, bool approved, uint8 confidenceScore, string memory reasoning) external returns (bytes32)",
  "function markPaymentExecuted(bytes32 decisionId, bytes32 transactionHash) external",
  "function recordMaintenanceDecision(uint256 requestId, string memory category, string memory priority, uint256 estimatedCostMin, uint256 estimatedCostMax, string memory reasoning, uint8 urgencyScore) external returns (bytes32)",
  "function recordApplicationScore(address applicant, address property, uint8 compatibilityScore, uint8 riskScore, bool recommended, string memory reasoning) external returns (bytes32)",
  "function recordVoiceAuthorization(address user, string memory commandType, string memory command, bool authorized) external returns (bytes32)",
  "function getPaymentDecision(bytes32 decisionId) external view returns (tuple(address tenant, address landlord, uint256 amountUSDC, bool approved, uint8 confidenceScore, string reasoning, uint256 timestamp, bool executed, bytes32 transactionHash))",
  "function getTotalPaymentDecisions() external view returns (uint256)",
  "function getTotalMaintenanceDecisions() external view returns (uint256)",
  "function getTotalVoiceAuthorizations() external view returns (uint256)",
  "function paymentDecisionIds(uint256 index) external view returns (bytes32)",
  "function maintenanceDecisionIds(uint256 index) external view returns (bytes32)",
  "function voiceAuthIds(uint256 index) external view returns (bytes32)",
  "event AIPaymentDecision(bytes32 indexed decisionId, address indexed tenant, uint256 amount, bool approved, uint8 confidenceScore, string reasoning, uint256 timestamp)",
  "event VoiceCommandAuthorization(bytes32 indexed authId, address indexed user, string command, bool authorized, uint256 timestamp)"
];

class AIDecisionsContractService {
  private contract: ethers.Contract;
  private provider: ethers.JsonRpcProvider;
  private wallet: ethers.Wallet;

  constructor() {
    // Initialize provider
    this.provider = new ethers.JsonRpcProvider(
      process.env.ARC_RPC_URL || 'https://rpc.testnet.arc.network'
    );

    // Initialize wallet
    const privateKey = process.env.DEPLOYER_PRIVATE_KEY;
    if (!privateKey) {
      throw new Error('DEPLOYER_PRIVATE_KEY not found in environment variables');
    }
    this.wallet = new ethers.Wallet(privateKey, this.provider);

    // Initialize contract
    const contractAddress = process.env.AI_DECISIONS_CONTRACT;
    if (!contractAddress) {
      throw new Error('AI_DECISIONS_CONTRACT not found in environment variables');
    }
    this.contract = new ethers.Contract(contractAddress, AI_DECISIONS_ABI, this.wallet);

    console.log('✅ [AI Decisions Contract] Initialized:', contractAddress);
  }

  /**
   * Record an AI payment decision on-chain
   */
  async recordPaymentDecision(params: {
    tenant: string;
    landlord: string;
    amountUSDC: number;
    approved: boolean;
    confidenceScore: number;
    reasoning: string;
  }): Promise<{ decisionId: string; transactionHash: string }> {
    try {
      console.log('🔗 [Blockchain] Recording AI payment decision on-chain...');
      
      // Convert amount to USDC format (6 decimals)
      const amountInUSDC = ethers.parseUnits(params.amountUSDC.toString(), 6);
      
      // Ensure confidence score is 0-100
      const confidenceScore = Math.min(Math.max(Math.floor(params.confidenceScore), 0), 100);

      const tx = await this.contract.recordPaymentDecision(
        params.tenant,
        params.landlord,
        amountInUSDC,
        params.approved,
        confidenceScore,
        params.reasoning
      );

      const receipt = await tx.wait();
      
      // Get the decision ID from the latest entry in the paymentDecisionIds array
      const totalDecisions = await this.contract.getTotalPaymentDecisions();
      const decisionId = await this.contract.paymentDecisionIds(totalDecisions - 1n);

      console.log('✅ [Blockchain] Payment decision recorded on-chain:', {
        decisionId,
        transactionHash: receipt.hash,
        blockNumber: receipt.blockNumber
      });

      return {
        decisionId,
        transactionHash: receipt.hash
      };
    } catch (error) {
      console.error('❌ [Blockchain] Failed to record payment decision:', error);
      throw error;
    }
  }

  /**
   * Mark a payment as executed on-chain
   */
  async markPaymentExecuted(decisionId: string, transactionHash: string): Promise<void> {
    try {
      console.log('🔗 [Blockchain] Marking payment as executed on-chain...');
      
      const tx = await this.contract.markPaymentExecuted(decisionId, transactionHash);
      await tx.wait();

      console.log('✅ [Blockchain] Payment marked as executed on-chain');
    } catch (error) {
      console.error('❌ [Blockchain] Failed to mark payment executed:', error);
      throw error;
    }
  }

  /**
   * Record AI maintenance decision on-chain
   */
  async recordMaintenanceDecision(params: {
    requestId: number;
    category: string;
    priority: string;
    estimatedCostMin: number;
    estimatedCostMax: number;
    reasoning: string;
    urgencyScore: number;
  }): Promise<{ decisionId: string; transactionHash: string }> {
    try {
      console.log('🔗 [Blockchain] Recording AI maintenance decision on-chain...');

      const tx = await this.contract.recordMaintenanceDecision(
        params.requestId,
        params.category,
        params.priority,
        ethers.parseUnits(params.estimatedCostMin.toString(), 6),
        ethers.parseUnits(params.estimatedCostMax.toString(), 6),
        params.reasoning,
        Math.min(Math.max(params.urgencyScore, 1), 10)
      );

      const receipt = await tx.wait();
      
      // Get the decision ID from the latest entry in the maintenanceDecisionIds array
      const totalDecisions = await this.contract.getTotalMaintenanceDecisions();
      const decisionId = await this.contract.maintenanceDecisionIds(totalDecisions - 1n);

      console.log('✅ [Blockchain] Maintenance decision recorded on-chain:', decisionId);

      return {
        decisionId,
        transactionHash: receipt.hash
      };
    } catch (error) {
      console.error('❌ [Blockchain] Failed to record maintenance decision:', error);
      throw error;
    }
  }

  /**
   * Record voice command authorization on-chain
   */
  async recordVoiceAuthorization(params: {
    user: string;
    commandType: string;
    command: string;
    authorized: boolean;
  }): Promise<{ authId: string; transactionHash: string }> {
    try {
      console.log('🔗 [Blockchain] Recording voice authorization on-chain...');

      const tx = await this.contract.recordVoiceAuthorization(
        params.user,
        params.commandType,
        params.command,
        params.authorized
      );

      const receipt = await tx.wait();
      
      // Get the auth ID from the latest entry in the voiceAuthIds array
      const totalAuths = await this.contract.getTotalVoiceAuthorizations();
      const authId = await this.contract.voiceAuthIds(totalAuths - 1n);

      console.log('✅ [Blockchain] Voice authorization recorded on-chain:', authId);

      return {
        authId,
        transactionHash: receipt.hash
      };
    } catch (error) {
      console.error('❌ [Blockchain] Failed to record voice authorization:', error);
      throw error;
    }
  }

  /**
   * Get payment decision from blockchain
   */
  async getPaymentDecision(decisionId: string) {
    try {
      const decision = await this.contract.getPaymentDecision(decisionId);
      return {
        tenant: decision[0],
        landlord: decision[1],
        amountUSDC: Number(ethers.formatUnits(decision[2], 6)),
        approved: decision[3],
        confidenceScore: decision[4],
        reasoning: decision[5],
        timestamp: Number(decision[6]),
        executed: decision[7],
        transactionHash: decision[8]
      };
    } catch (error) {
      console.error('❌ [Blockchain] Failed to get payment decision:', error);
      throw error;
    }
  }

  /**
   * Get total number of payment decisions on-chain
   */
  async getTotalPaymentDecisions(): Promise<number> {
    try {
      const total = await this.contract.getTotalPaymentDecisions();
      return Number(total);
    } catch (error) {
      console.error('❌ [Blockchain] Failed to get total payment decisions:', error);
      return 0;
    }
  }
}

export const aiDecisionsContract = new AIDecisionsContractService();
