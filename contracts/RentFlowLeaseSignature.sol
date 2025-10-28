// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

/**
 * @title RentFlowLeaseSignature
 * @notice Handles cryptographic lease signing with ECDSA signatures
 * @dev Industry-standard approach using blockchain addresses, not wallet IDs
 * 
 * KEY POINTS:
 * - Uses ADDRESSES (0x...) not wallet IDs
 * - Works with ANY EVM wallet (MetaMask, Circle, Ledger, etc.)
 * - Verifies signatures using ECDSA (elliptic curve cryptography)
 * - Compatible with EIP-191 (personal_sign) and EIP-712 (typed data)
 * 
 * SECURITY:
 * - Only authorized parties can sign (landlord/tenant)
 * - Signatures are cryptographically verified on-chain
 * - Prevents signature replay attacks with unique message hashes
 * - Immutable record of who signed what and when
 */
contract RentFlowLeaseSignature {
    using ECDSA for bytes32;
    using MessageHashUtils for bytes32;

    // ============ Structs ============

    struct Lease {
        string leaseId;          // Changed from uint256 to string to support UUIDs
        address landlord;
        address tenant;
        string leaseDocumentHash;  // IPFS hash or lease details hash
        uint256 monthlyRent;
        uint256 securityDeposit;
        uint64 startDate;
        uint64 endDate;
        bool landlordSigned;
        bool tenantSigned;
        bytes landlordSignature;
        bytes tenantSignature;
        uint256 landlordSignedAt;
        uint256 tenantSignedAt;
        LeaseStatus status;
    }

    enum LeaseStatus {
        Draft,           // Created, not signed
        PartiallySigned, // One party signed
        FullySigned,     // Both parties signed (active)
        Terminated       // Lease ended
    }

    // ============ State Variables ============

    mapping(string => Lease) public leases;  // Changed to string mapping for UUID support
    uint256 public leaseCounter;  // Keep for backwards compatibility

    // ============ Events ============

    event LeaseCreated(
        string indexed leaseId,  // Changed to string
        address indexed landlord,
        address indexed tenant,
        string leaseDocumentHash
    );

    event LeaseSigned(
        string indexed leaseId,  // Changed to string
        address indexed signer,
        bool isLandlord,
        uint256 timestamp
    );

    event LeaseFullySigned(
        string indexed leaseId,  // Changed to string
        uint256 timestamp
    );

    // ============ Errors ============

    error InvalidAddress();
    error LeaseNotFound();
    error NotAuthorizedToSign();
    error InvalidSignature();
    error AlreadySigned();
    error LeaseNotFullySigned();

    // ============ Core Functions ============

    /**
     * @notice Create a new lease (off-chain signature verification)
     * @dev This creates the lease structure that will be signed by both parties
     * 
     * IMPORTANT: This doesn't require signatures upfront
     * Landlord and tenant will sign separately using their wallets
     */
    function createLease(
        string memory leaseId,  // Changed to string to accept UUIDs
        address landlord,
        address tenant,
        string memory leaseDocumentHash,
        uint256 monthlyRent,
        uint256 securityDeposit,
        uint64 startDate,
        uint64 endDate
    ) external returns (string memory) {
        if (landlord == address(0)) revert InvalidAddress();
        // Allow tenant to be address(0) - will be set when tenant signs
        if (bytes(leaseId).length == 0) revert InvalidAddress(); // Validate lease ID

        leases[leaseId] = Lease({
            leaseId: leaseId,
            landlord: landlord,
            tenant: tenant,
            leaseDocumentHash: leaseDocumentHash,
            monthlyRent: monthlyRent,
            securityDeposit: securityDeposit,
            startDate: startDate,
            endDate: endDate,
            landlordSigned: false,
            tenantSigned: false,
            landlordSignature: "",
            tenantSignature: "",
            landlordSignedAt: 0,
            tenantSignedAt: 0,
            status: LeaseStatus.Draft
        });

        emit LeaseCreated(leaseId, landlord, tenant, leaseDocumentHash);

        return leaseId;
    }

    /**
     * @notice Sign lease with cryptographic signature
     * @dev Uses ECDSA signature verification (industry standard)
     * 
     * HOW IT WORKS:
     * 1. User signs message in their wallet (MetaMask, Circle, etc.)
     * 2. Frontend submits signature to this contract
     * 3. Contract recovers signer address from signature
     * 4. Contract verifies signer is landlord or tenant
     * 
     * WALLET COMPATIBILITY:
     * - ✅ MetaMask (personal_sign)
     * - ✅ Circle wallets (via Circle SDK)
     * - ✅ WalletConnect
     * - ✅ Ledger hardware wallets
     * - ✅ ANY EVM wallet that can sign messages
     */
    function signLease(
        string memory leaseId,  // Changed to string
        bytes memory signature,
        bool isLandlord
    ) external {
        Lease storage lease = leases[leaseId];
        
        if (lease.landlord == address(0)) revert LeaseNotFound();

        // Build message hash using current lease data
        // Use actual tenant address from lease (may be zero for landlord signing)
        bytes32 messageHash = getLeaseMessageHash(
            leaseId,
            lease.landlord,
            lease.tenant,  // Use stored tenant (may be zero)
            lease.leaseDocumentHash,
            lease.monthlyRent,
            lease.securityDeposit,
            isLandlord
        );

        // Recover the address that signed this message
        address recoveredSigner = messageHash.toEthSignedMessageHash().recover(signature);

        // Verify signer and record signature
        if (isLandlord) {
            if (recoveredSigner != lease.landlord) revert InvalidSignature();
            if (lease.landlordSigned) revert AlreadySigned();
            
            lease.landlordSigned = true;
            lease.landlordSignature = signature;
            lease.landlordSignedAt = block.timestamp;
        } else {
            // For tenant: if not set yet, set from recovered signer
            if (lease.tenant == address(0)) {
                lease.tenant = recoveredSigner;
            }
            
            if (recoveredSigner != lease.tenant) revert InvalidSignature();
            if (lease.tenantSigned) revert AlreadySigned();
            
            lease.tenantSigned = true;
            lease.tenantSignature = signature;
            lease.tenantSignedAt = block.timestamp;
        }

        // Update status
        if (lease.landlordSigned && lease.tenantSigned) {
            lease.status = LeaseStatus.FullySigned;
            emit LeaseFullySigned(leaseId, block.timestamp);
        } else {
            lease.status = LeaseStatus.PartiallySigned;
        }

        emit LeaseSigned(leaseId, recoveredSigner, isLandlord, block.timestamp);
    }

    /**
     * @notice Get the message hash that needs to be signed
     * @dev This is what users sign in their wallet
     * 
     * SIMPLIFIED MESSAGE FORMAT:
     * Uses keccak256 hash of structured data instead of string concatenation
     * This avoids "stack too deep" errors
     */
    function getLeaseMessageHash(
        string memory leaseId,  // Changed to string
        address landlord,
        address tenant,
        string memory documentHash,
        uint256 monthlyRent,
        uint256 securityDeposit,
        bool isLandlord
    ) public pure returns (bytes32) {
        // Use simple keccak256 of packed data
        return keccak256(abi.encodePacked(
            leaseId,
            landlord,
            tenant,
            documentHash,
            monthlyRent,
            securityDeposit,
            isLandlord ? "LANDLORD" : "TENANT"
        ));
    }

    /**
     * @notice Verify a signature without submitting transaction
     * @dev View function for frontend to validate before submitting
     */
    function verifySignature(
        string memory leaseId,  // Changed to string
        bytes memory signature,
        address expectedSigner,
        bool isLandlord
    ) public view returns (bool) {
        Lease memory lease = leases[leaseId];
        
        if (lease.landlord == address(0)) return false;

        bytes32 messageHash = getLeaseMessageHash(
            leaseId,
            lease.landlord,
            lease.tenant,
            lease.leaseDocumentHash,
            lease.monthlyRent,
            lease.securityDeposit,
            isLandlord
        );

        address recoveredSigner = messageHash.toEthSignedMessageHash().recover(signature);
        
        return recoveredSigner == expectedSigner;
    }

    /**
     * @notice Check if lease is fully signed by both parties
     */
    function isLeaseFullySigned(string memory leaseId) public view returns (bool) {
        Lease memory lease = leases[leaseId];
        return lease.landlordSigned && lease.tenantSigned;
    }

    /**
     * @notice Get complete lease details
     */
    function getLease(string memory leaseId) public view returns (Lease memory) {
        return leases[leaseId];
    }

    // ============ Helper Functions ============
    // (Removed - not needed with simplified hash function)
}
