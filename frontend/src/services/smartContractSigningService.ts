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
    if (!walletInfo.circleWalletId) {
      return {
        success: false,
        error: 'Circle wallet ID is required'
      };
    }

    console.log('🔵 [Circle Contract] Signing via backend API...');

    // Send lease ID as-is (UUID string)
    // Backend will handle conversion
    console.log('   Lease ID:', leaseInfo.leaseId);

    // Call backend to execute contract transaction
    const response = await fetch('https://rent-flow.onrender.com/api/arc/sign-lease-contract', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        walletId: walletInfo.circleWalletId,
        leaseId: leaseInfo.leaseId, // Send UUID as-is
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
        error: result.error || 'Circle contract signing failed'
      };
    }

    console.log('✅ [Circle Contract] Transaction submitted:', result.transactionHash);

    return {
      success: true,
      transactionHash: result.transactionHash,
      method: 'circle'
    };
  } catch (error) {
    console.error('❌ [Circle Contract] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Circle contract signing failed'
    };
  }
}

/**
 * Sign with external wallet (MetaMask) via smart contract
 * User signs the transaction in their browser wallet
 */
async function signWithExternalWallet(
  _address: string, // Not used directly, but keep for interface consistency
  leaseInfo: LeaseInfo
): Promise<SigningResult> {
  try {
    if (typeof window === 'undefined' || !window.ethereum) {
      return {
        success: false,
        error: 'No Web3 wallet detected. Please install MetaMask.'
      };
    }

    console.log('🦊 [MetaMask Contract] Preparing contract transaction...');

    // Connect to Arc Testnet
    const provider = new ethers.BrowserProvider(window.ethereum);
    
    // Ensure we're on Arc Testnet
    const network = await provider.getNetwork();
    if (Number(network.chainId) !== ARC_CHAIN_ID) {
      console.log('⚠️ Wrong network detected, switching to Arc Testnet...');
      
      try {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: `0x${ARC_CHAIN_ID.toString(16)}` }],
        });
      } catch (switchError: any) {
        // Chain not added to MetaMask
        if (switchError.code === 4902) {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: `0x${ARC_CHAIN_ID.toString(16)}`,
              chainName: 'Arc Testnet',
              nativeCurrency: {
                name: 'ETH',
                symbol: 'ETH',
                decimals: 18
              },
              rpcUrls: [ARC_RPC_URL],
              blockExplorerUrls: ['https://testnet.arcscan.app']
            }],
          });
        } else {
          throw switchError;
        }
      }
    }

    const signer = await provider.getSigner();
    const contract = new ethers.Contract(CONTRACT_ADDRESS, LEASE_SIGNATURE_ABI, signer);

    // Send lease ID as-is (UUID string) - backend/contract will handle it
    console.log('   Lease ID:', leaseInfo.leaseId);

    // First, get the message hash from the contract
    console.log('📋 [MetaMask Contract] Getting message hash...');
    const messageHash = await contract.getLeaseMessageHash(
      leaseInfo.leaseId, // Send UUID as-is
      leaseInfo.landlord,
      leaseInfo.tenant,
      leaseInfo.leaseDocumentHash,
      ethers.parseUnits(leaseInfo.monthlyRent.toString(), 6), // USDC has 6 decimals
      ethers.parseUnits(leaseInfo.securityDeposit.toString(), 6),
      leaseInfo.isLandlord
    );

    console.log('✍️ [MetaMask Contract] Requesting user signature...');
    
    // Sign the message hash with user's wallet
    const signature = await signer.signMessage(ethers.getBytes(messageHash));

    console.log('📤 [MetaMask Contract] Submitting to contract...');

    // Call the smart contract signLease function
    const tx = await contract.signLease(
      leaseInfo.leaseId, // Send UUID as-is
      signature,
      leaseInfo.isLandlord
    );

    console.log('⏳ [MetaMask Contract] Waiting for confirmation...');
    const receipt = await tx.wait();

    console.log('✅ [MetaMask Contract] Lease signed on-chain!');
    console.log('   Transaction:', receipt.hash);
    console.log('   Block:', receipt.blockNumber);

    return {
      success: true,
      transactionHash: receipt.hash,
      method: 'metamask'
    };
  } catch (error: any) {
    console.error('❌ [MetaMask Contract] Error:', error);
    
    if (error.code === 4001) {
      return {
        success: false,
        error: 'User rejected the transaction'
      };
    }

    return {
      success: false,
      error: error.message || 'MetaMask contract signing failed'
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
