// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MockUSDC
 * @notice Mock USDC token for testing purposes
 * @dev Mimics USDC with 6 decimals and includes mint function for testing
 * 
 * OPTIMIZATIONS:
 * - Immutable decimals for gas savings
 * - Custom errors for gas efficiency
 * - Access control for minting in production-like tests
 * 
 * DECISION: Create mock token instead of using real USDC on testnet
 * REASON: Full control over supply, no need for faucets, easier testing
 */
contract MockUSDC is ERC20, Ownable {
    uint8 private constant USDC_DECIMALS = 6;
    
    // Custom errors
    error InvalidMintAmount();
    error InvalidBurnAmount();
    
    constructor() ERC20("Mock USD Coin", "USDC") Ownable(msg.sender) {
        // Mint initial supply to deployer for distribution in tests
        // 10 million USDC for testing
        _mint(msg.sender, 10_000_000 * 10**USDC_DECIMALS);
    }
    
    /**
     * @notice Override decimals to match real USDC (6 decimals)
     * @dev USDC uses 6 decimals unlike most ERC20 tokens (18)
     */
    function decimals() public pure override returns (uint8) {
        return USDC_DECIMALS;
    }
    
    /**
     * @notice Mint tokens to any address for testing
     * @param to Address to mint tokens to
     * @param amount Amount of tokens to mint (with 6 decimals)
     * @dev Only owner can mint in production-like tests
     */
    function mint(address to, uint256 amount) external onlyOwner {
        if (amount == 0) revert InvalidMintAmount();
        _mint(to, amount);
    }
    
    /**
     * @notice Mint tokens to caller for quick testing (anyone can call)
     * @param amount Amount of tokens to mint to msg.sender
     * @dev Useful for rapid testing, remove for production
     */
    function mintToSelf(uint256 amount) external {
        if (amount == 0) revert InvalidMintAmount();
        _mint(msg.sender, amount);
    }
    
    /**
     * @notice Burn tokens from caller for testing
     * @param amount Amount of tokens to burn
     */
    function burn(uint256 amount) external {
        if (amount == 0) revert InvalidBurnAmount();
        _burn(msg.sender, amount);
    }
    
    /**
     * @notice Get balance in human-readable format (actual USDC amount)
     * @param account Address to check balance for
     * @return Balance in USDC (not wei)
     */
    function balanceOfUSDC(address account) external view returns (uint256) {
        return balanceOf(account) / 10**USDC_DECIMALS;
    }
}
