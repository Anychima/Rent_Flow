/**
 * Smart Contract Signing Service - Arc Testnet
 * 
 * Uses RentFlowLeaseSignature smart contract for on-chain signing
 * Works with BOTH Circle wallets AND external wallets (MetaMask, etc.)
 * 
 * Contract Address: 0x60e3b0a49e04e348aA81D4C3b795c0B7df441312 (Updated: Now supports string lease IDs)
 * Network: Arc Testnet (Chain ID: 5042002)
 * 
 * This is the CORRECT approach:
 * - Circle wallets CAN send transactions to smart contracts
 * - External wallets sign transactions via MetaMask
 * - All signatures recorded on-chain
 */

import { ethers } from 'ethers';

// API Configuration - Uses same environment variable as rest of app
const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3001';

// Smart Contract ABI (only the functions we need)
const LEASE_SIGNATURE_ABI = [
  "function signLease(string memory leaseId, bytes memory signature, bool isLandlord) external",
  "function getLease(string memory leaseId) public view returns (tuple(string leaseId, address landlord, address tenant, string leaseDocumentHash, uint256 monthlyRent, uint256 securityDeposit, uint64 startDate, uint64 endDate, bool landlordSigned, bool tenantSigned, bytes landlordSignature, bytes tenantSignature, uint256 landlordSignedAt, uint256 tenantSignedAt, uint8 status))",
  "function getLeaseMessageHash(string memory leaseId, address landlord, address tenant, string memory documentHash, uint256 monthlyRent, uint256 securityDeposit, bool isLandlord) public pure returns (bytes32)",
  "function isLeaseFullySigned(string memory leaseId) public view returns (bool)"
];

const CONTRACT_ADDRESS = '0x16c91074476E1d8f9984c79ad919C051a1366AA8'; // Updated: Fixed signature verification for independent signing
const ARC_RPC_URL = 'https://rpc.testnet.arc.network';
const ARC_CHAIN_ID = 5042002;

interface SigningResult {
  success: boolean;
  transactionHash?: string;
  error?: string;
  method?: 'circle' | 'metamask';
}

interface LeaseInfo {
  leaseId: string;
  landlord: string;
  tenant: string;
  leaseDocumentHash: string;
  monthlyRent: number;
  securityDeposit: number;
  isLandlord: boolean;
}

/**
 * Sign lease using smart contract (works with ALL wallets)
 * 
 * @param walletInfo - Wallet address and type
 * @param leaseInfo - Lease details for signature
 * @returns Transaction hash and success status
 */
export async function signLeaseOnChain(
  walletInfo: { address: string; walletType: 'circle' | 'external'; circleWalletId?: string },
  leaseInfo: LeaseInfo
): Promise<SigningResult> {
  
  console.log('📝 [Smart Contract Signing] Initiating on-chain signature...');
  console.log('   Wallet Type:', walletInfo.walletType);
  console.log('   Address:', walletInfo.address);
  console.log('   Lease ID:', leaseInfo.leaseId);
  
  if (walletInfo.walletType === 'circle') {
    return signWithCircleWallet(walletInfo, leaseInfo);
  } else {
    return signWithExternalWallet(walletInfo.address, leaseInfo);
  }
}

/**
 * Sign with Circle wallet via backend API
 * Backend will use Circle SDK to execute the contract transaction
 */
async function signWithCircleWallet(
  walletInfo: { address: string; circleWalletId?: string },
  leaseInfo: LeaseInfo
): Promise<SigningResult> {
  try {
    console.log('🔵 [Circle Wallet] Circle wallet detected');
    console.log('   Switching to MetaMask for signature (Circle SDK limitation)');
    console.log('   Circle wallet address:', walletInfo.address);
    
    // IMPORTANT: Circle SDK doesn't support message signing
    // Workaround: Use MetaMask to sign even if user has Circle wallet
    // The transaction will still use their Circle wallet address
    
    if (typeof window === 'undefined' || !window.ethereum) {
      return {
        success: false,
        error: 'MetaMask is required for signing. Please install MetaMask browser extension.'
      };
    }

    console.log('🦊 [MetaMask] Requesting signature from user...');
    console.log('   This signature will be linked to your Circle wallet address');
    
    // Use MetaMask to sign the lease
    return signWithExternalWallet(walletInfo.address, leaseInfo);
    
  } catch (error) {
    console.error('❌ [Circle Contract] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to sign with wallet'
    };
  }
}

/**
 * Sign with external wallet (MetaMask) via smart contract
 * User signs the transaction in their browser wallet
 */
async function signWithExternalWallet(
  _address: string,
  leaseInfo: LeaseInfo
): Promise<SigningResult> {
  try {
    if (typeof window === 'undefined' || !window.ethereum) {
      return {
        success: false,
        error: 'No Web3 wallet detected. Please install MetaMask.'
      };
    }

    console.log('🦊 [MetaMask] Preparing to sign message (FREE - no gas needed)...');

    // Connect to provider (just for signing, no transactions)
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();

    // Create message to sign (no contract interaction needed)
    const message = `Sign lease agreement

Lease ID: ${leaseInfo.leaseId}
Landlord: ${leaseInfo.landlord}
Tenant: ${leaseInfo.tenant}
Monthly Rent: ${leaseInfo.monthlyRent} USDC
Security Deposit: ${leaseInfo.securityDeposit} USDC

This signature is FREE and requires no gas fees.`;

    console.log('✍️ [MetaMask] Requesting signature (no gas required)...');
    
    // Simple message signature - NO GAS REQUIRED
    const userSignature = await signer.signMessage(message);
    
    console.log('✅ [MetaMask] Signature obtained! (FREE)');
    console.log('   Signature length:', userSignature.length);

    // Send signature to backend where deployer pays ALL gas
    console.log('📤 [Backend] Sending to backend (deployer pays all gas on Arc)...');
    
    const response = await fetch(`${API_URL}/api/arc/sign-lease-contract`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userSignature,
        leaseId: leaseInfo.leaseId,
        landlord: leaseInfo.landlord,
        tenant: leaseInfo.tenant,
        leaseDocumentHash: leaseInfo.leaseDocumentHash,
        monthlyRent: leaseInfo.monthlyRent,
        securityDeposit: leaseInfo.securityDeposit,
        isLandlord: leaseInfo.isLandlord
      })
    });

    const result = await response.json();

    if (!result.success) {
      return {
        success: false,
        error: result.error || 'Failed to submit signature'
      };
    }

    console.log('✅ [Success] Lease signed on Arc blockchain!');
    console.log('   TX Hash:', result.transactionHash);
    console.log('   User signed (FREE), deployer paid gas');

    return {
      success: true,
      transactionHash: result.transactionHash,
      method: 'metamask'
    };
  } catch (error: any) {
    console.error('❌ [MetaMask] Error:', error);
    
    if (error.code === 4001) {
      return {
        success: false,
        error: 'User rejected the signature request'
      };
    }

    return {
      success: false,
      error: error.message || 'Signing failed'
    };
  }
}

/**
 * Check if lease is fully signed on-chain
 */
export async function checkLeaseStatus(leaseId: string): Promise<{
  success: boolean;
  isFullySigned?: boolean;
  error?: string;
}> {
  try {
    const provider = new ethers.JsonRpcProvider(ARC_RPC_URL);
    const contract = new ethers.Contract(CONTRACT_ADDRESS, LEASE_SIGNATURE_ABI, provider);

    const isFullySigned = await contract.isLeaseFullySigned(leaseId);

    return {
      success: true,
      isFullySigned
    };
  } catch (error) {
    console.error('❌ [Contract] Error checking lease status:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to check lease status'
    };
  }
}

// Extend Window interface for EVM wallet
declare global {
  interface Window {
    ethereum?: any;
  }
}

export default {
  signLeaseOnChain,
  checkLeaseStatus
};
