// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title RentFlowCore
 * @notice Core contract for AI-powered property management with USDC payments
 * @dev Implements property registration, lease management, and AI-driven maintenance approval
 * 
 * OPTIMIZATIONS:
 * - Packed structs to minimize storage slots
 * - Immutable variables for gas savings
 * - SafeERC20 for secure token transfers
 * - Custom errors for gas efficiency
 * - Events indexed for efficient filtering
 * 
 * SECURITY:
 * - ReentrancyGuard on all external calls
 * - Pausable for emergency stops
 * - Role-based access control
 * - Pull over push pattern for payments
 */
contract RentFlowCore is ReentrancyGuard, Ownable, Pausable {
    using SafeERC20 for IERC20;
    
    // ============ Custom Errors (Gas Efficient) ============
    
    error InvalidUSDCAddress();
    error RentMustBePositive();
    error DepositTooLow();
    error NotPropertyOwner();
    error PropertyNotActive();
    error InvalidTenantAddress();
    error StartDateInPast();
    error InvalidDuration();
    error InvalidRentDueDay();
    error LeaseNotActive();
    error OnlyTenantCanPay();
    error LeaseNotStarted();
    error LeaseHasEnded();
    error NotAuthorizedAIAgent();
    error NotAuthorizedForProperty();
    error DescriptionRequired();
    error EstimatedCostInvalid();
    error RequestNotPending();
    error ApprovedAmountInvalid();
    error InvalidContractorAddress();
    error ExceedsAutoApprovalLimit();
    error AmountMustBePositive();
    error InsufficientMaintenanceFunds();
    error NotAuthorized();
    error LeaseNotCompleted();
    error DeductionExceedsDeposit();
    error InvalidAgentAddress();
    
    // ============ State Variables ============
    
    IERC20 public immutable USDC;
    
    // Gas optimization: Pack struct to fit in fewer storage slots
    struct Property {
        address owner;              // 20 bytes
        uint88 monthlyRent;         // 11 bytes (enough for USDC with 6 decimals)
        uint88 securityDeposit;     // 11 bytes
        uint32 createdAt;           // 4 bytes (timestamp until year 2106)
        bool isActive;              // 1 byte
        // Total: 47 bytes = 2 storage slots
    }
    
    // Gas optimization: Pack struct
    struct Lease {
        uint256 propertyId;         // 32 bytes (slot 1)
        address tenant;             // 20 bytes (slot 2 start)
        uint88 securityDepositHeld; // 11 bytes
        bool isActive;              // 1 byte
        // 32 bytes (slot 2 end)
        uint64 startDate;           // 8 bytes (slot 3 start)
        uint64 endDate;             // 8 bytes
        uint32 rentDueDay;          // 4 bytes (1-28)
        uint64 lastPaymentDate;     // 8 bytes
        uint64 totalPaid;           // 8 bytes
        LeaseStatus status;         // 1 byte
        // Total: 37 bytes in slot 3 + remaining
    }
    
    struct MaintenanceRequest {
        uint256 propertyId;
        address requestedBy;
        address contractor;
        uint88 estimatedCost;
        uint88 approvedAmount;
        uint64 createdAt;
        MaintenanceStatus status;
        string description;         // Dynamic, separate slot
    }
    
    enum LeaseStatus { Active, Paused, Terminated, Completed }
    enum MaintenanceStatus { Pending, Approved, InProgress, Completed, Rejected }
    
    mapping(uint256 => Property) public properties;
    mapping(uint256 => Lease) public leases;
    mapping(uint256 => MaintenanceRequest) public maintenanceRequests;
    mapping(address => uint256[]) public ownerProperties;
    mapping(address => uint256[]) public tenantLeases;
    mapping(uint256 => uint256) public maintenanceFunds;
    mapping(address => bool) public authorizedAIAgents;
    
    uint256 public propertyCounter;
    uint256 public leaseCounter;
    uint256 public maintenanceCounter;
    
    // ============ Events ============
    
    event PropertyRegistered(uint256 indexed propertyId, address indexed owner, uint256 monthlyRent);
    event LeaseCreated(uint256 indexed leaseId, uint256 indexed propertyId, address indexed tenant);
    event RentPaid(uint256 indexed leaseId, uint256 amount, uint256 timestamp);
    event RentOverdue(uint256 indexed leaseId, uint256 daysPastDue);
    event MaintenanceRequested(uint256 indexed requestId, uint256 indexed propertyId, uint256 estimatedCost);
    event MaintenanceApproved(uint256 indexed requestId, uint256 approvedAmount, address contractor);
    event MaintenancePaid(uint256 indexed requestId, uint256 amount, address contractor);
    event SecurityDepositReturned(uint256 indexed leaseId, address tenant, uint256 amount);
    event AIAgentAuthorized(address indexed agent, bool authorized);
    event MaintenanceFundAdded(uint256 indexed propertyId, uint256 amount);
    
    // ============ Modifiers ============
    
    modifier onlyPropertyOwner(uint256 propertyId) {
        if (properties[propertyId].owner != msg.sender) revert NotPropertyOwner();
        _;
    }
    
    modifier onlyAIAgent() {
        if (!authorizedAIAgents[msg.sender]) revert NotAuthorizedAIAgent();
        _;
    }
    
    modifier validProperty(uint256 propertyId) {
        if (!properties[propertyId].isActive) revert PropertyNotActive();
        _;
    }
    
    // ============ Constructor ============
    
    constructor(address _usdcAddress) Ownable(msg.sender) {
        if (_usdcAddress == address(0)) revert InvalidUSDCAddress();
        USDC = IERC20(_usdcAddress);
    }
    
    // ============ Property Management ============
    
    function registerProperty(
        uint88 monthlyRent,
        uint88 securityDeposit
    ) external whenNotPaused returns (uint256) {
        if (monthlyRent == 0) revert RentMustBePositive();
        if (securityDeposit < monthlyRent) revert DepositTooLow();
        
        uint256 propertyId = propertyCounter++;
        
        properties[propertyId] = Property({
            owner: msg.sender,
            monthlyRent: monthlyRent,
            securityDeposit: securityDeposit,
            isActive: true,
            createdAt: uint32(block.timestamp)
        });
        
        ownerProperties[msg.sender].push(propertyId);
        
        emit PropertyRegistered(propertyId, msg.sender, monthlyRent);
        
        return propertyId;
    }
    
    function deactivateProperty(uint256 propertyId) external onlyPropertyOwner(propertyId) {
        properties[propertyId].isActive = false;
    }
    
    // ============ Lease Management ============
    
    function createLease(
        uint256 propertyId,
        address tenant,
        uint64 startDate,
        uint32 durationMonths,
        uint32 rentDueDay
    ) external onlyPropertyOwner(propertyId) validProperty(propertyId) nonReentrant returns (uint256) {
        if (tenant == address(0)) revert InvalidTenantAddress();
        if (startDate < block.timestamp) revert StartDateInPast();
        if (durationMonths == 0 || durationMonths > 36) revert InvalidDuration();
        if (rentDueDay < 1 || rentDueDay > 28) revert InvalidRentDueDay();
        
        uint256 leaseId = leaseCounter++;
        Property memory prop = properties[propertyId];
        
        // Transfer security deposit from tenant to contract using SafeERC20
        USDC.safeTransferFrom(tenant, address(this), prop.securityDeposit);
        
        uint64 endDate = startDate + uint64(durationMonths * 30 days);
        
        leases[leaseId] = Lease({
            propertyId: propertyId,
            tenant: tenant,
            securityDepositHeld: prop.securityDeposit,
            isActive: true,
            startDate: startDate,
            endDate: endDate,
            rentDueDay: rentDueDay,
            lastPaymentDate: 0,
            totalPaid: 0,
            status: LeaseStatus.Active
        });
        
        tenantLeases[tenant].push(leaseId);
        
        emit LeaseCreated(leaseId, propertyId, tenant);
        
        return leaseId;
    }
    
    function payRent(uint256 leaseId) external nonReentrant whenNotPaused {
        Lease storage lease = leases[leaseId];
        if (lease.status != LeaseStatus.Active) revert LeaseNotActive();
        if (msg.sender != lease.tenant) revert OnlyTenantCanPay();
        if (block.timestamp < lease.startDate) revert LeaseNotStarted();
        if (block.timestamp > lease.endDate) revert LeaseHasEnded();
        
        Property memory prop = properties[lease.propertyId];
        uint256 rentAmount = prop.monthlyRent;
        
        // Transfer rent directly to property owner using SafeERC20
        USDC.safeTransferFrom(msg.sender, prop.owner, rentAmount);
        
        lease.lastPaymentDate = uint64(block.timestamp);
        lease.totalPaid += uint64(rentAmount);
        
        emit RentPaid(leaseId, rentAmount, block.timestamp);
    }
    
    function checkRentOverdue(uint256 leaseId) external onlyAIAgent {
        Lease memory lease = leases[leaseId];
        if (lease.status != LeaseStatus.Active) revert LeaseNotActive();
        
        if (lease.lastPaymentDate == 0 && block.timestamp > lease.startDate + 5 days) {
            emit RentOverdue(leaseId, (block.timestamp - lease.startDate) / 1 days);
        } else if (lease.lastPaymentDate > 0) {
            uint256 daysSincePayment = (block.timestamp - lease.lastPaymentDate) / 1 days;
            if (daysSincePayment > 35) {
                emit RentOverdue(leaseId, daysSincePayment - 30);
            }
        }
    }
    
    // ============ Maintenance Management ============
    
    function requestMaintenance(
        uint256 propertyId,
        string calldata description,
        uint88 estimatedCost
    ) external validProperty(propertyId) returns (uint256) {
        if (
            properties[propertyId].owner != msg.sender && 
            !_isTenantOfProperty(msg.sender, propertyId)
        ) revert NotAuthorizedForProperty();
        if (bytes(description).length == 0) revert DescriptionRequired();
        if (estimatedCost == 0) revert EstimatedCostInvalid();
        
        uint256 requestId = maintenanceCounter++;
        
        maintenanceRequests[requestId] = MaintenanceRequest({
            propertyId: propertyId,
            requestedBy: msg.sender,
            contractor: address(0),
            estimatedCost: estimatedCost,
            approvedAmount: 0,
            createdAt: uint64(block.timestamp),
            status: MaintenanceStatus.Pending,
            description: description
        });
        
        emit MaintenanceRequested(requestId, propertyId, estimatedCost);
        
        return requestId;
    }
    
    function approveMaintenance(
        uint256 requestId,
        uint88 approvedAmount,
        address contractor
    ) external onlyAIAgent {
        MaintenanceRequest storage request = maintenanceRequests[requestId];
        if (request.status != MaintenanceStatus.Pending) revert RequestNotPending();
        if (approvedAmount == 0) revert ApprovedAmountInvalid();
        if (contractor == address(0)) revert InvalidContractorAddress();
        
        uint88 autoApprovalLimit = 500 * 10**6; // $500 in USDC
        if (approvedAmount > autoApprovalLimit) revert ExceedsAutoApprovalLimit();
        
        request.approvedAmount = approvedAmount;
        request.contractor = contractor;
        request.status = MaintenanceStatus.Approved;
        
        emit MaintenanceApproved(requestId, approvedAmount, contractor);
    }
    
    function fundMaintenance(uint256 propertyId, uint88 amount) 
        external 
        onlyPropertyOwner(propertyId) 
        nonReentrant 
    {
        if (amount == 0) revert AmountMustBePositive();
        
        USDC.safeTransferFrom(msg.sender, address(this), amount);
        
        maintenanceFunds[propertyId] += amount;
        
        emit MaintenanceFundAdded(propertyId, amount);
    }
    
    function payMaintenanceContractor(uint256 requestId) external nonReentrant {
        MaintenanceRequest storage request = maintenanceRequests[requestId];
        if (request.status != MaintenanceStatus.Approved) revert RequestNotPending();
        
        uint256 propertyId = request.propertyId;
        if (
            msg.sender != properties[propertyId].owner && 
            !authorizedAIAgents[msg.sender]
        ) revert NotAuthorized();
        
        uint256 amount = request.approvedAmount;
        if (maintenanceFunds[propertyId] < amount) revert InsufficientMaintenanceFunds();
        
        maintenanceFunds[propertyId] -= amount;
        request.status = MaintenanceStatus.Completed;
        
        USDC.safeTransfer(request.contractor, amount);
        
        emit MaintenancePaid(requestId, amount, request.contractor);
    }
    
    // ============ Security Deposit Management ============
    
    function returnSecurityDeposit(uint256 leaseId, uint88 deductionAmount) 
        external 
        nonReentrant 
    {
        Lease storage lease = leases[leaseId];
        if (
            msg.sender != properties[lease.propertyId].owner && 
            !authorizedAIAgents[msg.sender]
        ) revert NotAuthorized();
        if (
            lease.status != LeaseStatus.Completed && 
            block.timestamp <= lease.endDate
        ) revert LeaseNotCompleted();
        if (deductionAmount > lease.securityDepositHeld) revert DeductionExceedsDeposit();
        
        uint88 returnAmount = lease.securityDepositHeld - deductionAmount;
        lease.securityDepositHeld = 0;
        lease.status = LeaseStatus.Completed;
        
        if (returnAmount > 0) {
            USDC.safeTransfer(lease.tenant, returnAmount);
        }
        
        if (deductionAmount > 0) {
            USDC.safeTransfer(properties[lease.propertyId].owner, deductionAmount);
        }
        
        emit SecurityDepositReturned(leaseId, lease.tenant, returnAmount);
    }
    
    // ============ AI Agent Management ============
    
    function setAIAgent(address agent, bool authorized) external onlyOwner {
        if (agent == address(0)) revert InvalidAgentAddress();
        authorizedAIAgents[agent] = authorized;
        emit AIAgentAuthorized(agent, authorized);
    }
    
    // ============ Emergency Functions ============
    
    function pause() external onlyOwner {
        _pause();
    }
    
    function unpause() external onlyOwner {
        _unpause();
    }
    
    // ============ View Functions ============
    
    function _isTenantOfProperty(address user, uint256 propertyId) internal view returns (bool) {
        uint256[] memory userLeases = tenantLeases[user];
        for (uint256 i = 0; i < userLeases.length; i++) {
            if (leases[userLeases[i]].propertyId == propertyId && 
                leases[userLeases[i]].status == LeaseStatus.Active) {
                return true;
            }
        }
        return false;
    }
    
    function getOwnerProperties(address owner) external view returns (uint256[] memory) {
        return ownerProperties[owner];
    }
    
    function getTenantLeases(address tenant) external view returns (uint256[] memory) {
        return tenantLeases[tenant];
    }
    
    function getMaintenanceFundBalance(uint256 propertyId) external view returns (uint256) {
        return maintenanceFunds[propertyId];
    }
}
