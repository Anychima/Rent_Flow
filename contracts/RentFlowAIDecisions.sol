// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title RentFlowAIDecisions
 * @notice Records AI agent decisions on-chain for transparency and auditability
 * @dev For Arc Testnet Hackathon - demonstrates AI + blockchain integration
 * 
 * This contract stores AI decision-making on-chain including:
 * - Payment approval decisions with confidence scores
 * - Maintenance request priorities with AI reasoning
 * - Application screening scores
 * - Voice command authorizations
 */
contract RentFlowAIDecisions {
    
    // ==================== Events ====================
    
    event AIPaymentDecision(
        bytes32 indexed decisionId,
        address indexed tenant,
        uint256 amount,
        bool approved,
        uint8 confidenceScore,
        string reasoning,
        uint256 timestamp
    );
    
    event AIMaintenanceDecision(
        bytes32 indexed decisionId,
        uint256 indexed requestId,
        string priority,
        uint256 estimatedCost,
        string reasoning,
        uint256 timestamp
    );
    
    event AIApplicationScore(
        bytes32 indexed decisionId,
        address indexed applicant,
        uint8 compatibilityScore,
        uint8 riskScore,
        bool recommended,
        uint256 timestamp
    );
    
    event VoiceCommandAuthorization(
        bytes32 indexed authId,
        address indexed user,
        string command,
        bool authorized,
        uint256 timestamp
    );
    
    // ==================== Structs ====================
    
    struct PaymentDecision {
        address tenant;
        address landlord;
        uint256 amountUSDC;
        bool approved;
        uint8 confidenceScore; // 0-100
        string reasoning;
        uint256 timestamp;
        bool executed;
        bytes32 transactionHash;
    }
    
    struct MaintenanceDecision {
        uint256 requestId;
        string category;
        string priority; // low, medium, high, urgent
        uint256 estimatedCostMin;
        uint256 estimatedCostMax;
        string reasoning;
        uint8 urgencyScore; // 1-10
        uint256 timestamp;
    }
    
    struct ApplicationScore {
        address applicant;
        address property;
        uint8 compatibilityScore; // 0-100
        uint8 riskScore; // 0-100
        bool recommended;
        string reasoning;
        uint256 timestamp;
    }
    
    struct VoiceAuth {
        address user;
        string commandType; // "pay_rent", "query_status", "report_maintenance"
        string command;
        bool authorized;
        uint256 timestamp;
    }
    
    // ==================== Storage ====================
    
    mapping(bytes32 => PaymentDecision) public paymentDecisions;
    mapping(bytes32 => MaintenanceDecision) public maintenanceDecisions;
    mapping(bytes32 => ApplicationScore) public applicationScores;
    mapping(bytes32 => VoiceAuth) public voiceAuthorizations;
    
    // Arrays for enumeration
    bytes32[] public paymentDecisionIds;
    bytes32[] public maintenanceDecisionIds;
    bytes32[] public applicationScoreIds;
    bytes32[] public voiceAuthIds;
    
    // Access control
    address public aiAgent;
    mapping(address => bool) public authorizedAgents;
    
    // ==================== Modifiers ====================
    
    modifier onlyAIAgent() {
        require(authorizedAgents[msg.sender] || msg.sender == aiAgent, "Not authorized AI agent");
        _;
    }
    
    // ==================== Constructor ====================
    
    constructor() {
        aiAgent = msg.sender;
        authorizedAgents[msg.sender] = true;
    }
    
    // ==================== AI Decision Functions ====================
    
    /**
     * @notice Record an AI payment decision on-chain
     * @param tenant Address of the tenant
     * @param landlord Address of the landlord
     * @param amountUSDC Payment amount in USDC (6 decimals)
     * @param approved Whether AI approved the payment
     * @param confidenceScore AI confidence (0-100)
     * @param reasoning AI's decision reasoning
     */
    function recordPaymentDecision(
        address tenant,
        address landlord,
        uint256 amountUSDC,
        bool approved,
        uint8 confidenceScore,
        string memory reasoning
    ) external onlyAIAgent returns (bytes32) {
        require(tenant != address(0), "Invalid tenant");
        require(landlord != address(0), "Invalid landlord");
        require(confidenceScore <= 100, "Score must be 0-100");
        
        bytes32 decisionId = keccak256(abi.encodePacked(
            tenant,
            landlord,
            amountUSDC,
            block.timestamp,
            paymentDecisionIds.length
        ));
        
        paymentDecisions[decisionId] = PaymentDecision({
            tenant: tenant,
            landlord: landlord,
            amountUSDC: amountUSDC,
            approved: approved,
            confidenceScore: confidenceScore,
            reasoning: reasoning,
            timestamp: block.timestamp,
            executed: false,
            transactionHash: bytes32(0)
        });
        
        paymentDecisionIds.push(decisionId);
        
        emit AIPaymentDecision(
            decisionId,
            tenant,
            amountUSDC,
            approved,
            confidenceScore,
            reasoning,
            block.timestamp
        );
        
        return decisionId;
    }
    
    /**
     * @notice Update payment decision with execution status
     */
    function markPaymentExecuted(
        bytes32 decisionId,
        bytes32 transactionHash
    ) external onlyAIAgent {
        require(paymentDecisions[decisionId].timestamp > 0, "Decision not found");
        paymentDecisions[decisionId].executed = true;
        paymentDecisions[decisionId].transactionHash = transactionHash;
    }
    
    /**
     * @notice Record AI maintenance analysis on-chain
     */
    function recordMaintenanceDecision(
        uint256 requestId,
        string memory category,
        string memory priority,
        uint256 estimatedCostMin,
        uint256 estimatedCostMax,
        string memory reasoning,
        uint8 urgencyScore
    ) external onlyAIAgent returns (bytes32) {
        require(urgencyScore >= 1 && urgencyScore <= 10, "Urgency must be 1-10");
        
        bytes32 decisionId = keccak256(abi.encodePacked(
            requestId,
            category,
            block.timestamp,
            maintenanceDecisionIds.length
        ));
        
        maintenanceDecisions[decisionId] = MaintenanceDecision({
            requestId: requestId,
            category: category,
            priority: priority,
            estimatedCostMin: estimatedCostMin,
            estimatedCostMax: estimatedCostMax,
            reasoning: reasoning,
            urgencyScore: urgencyScore,
            timestamp: block.timestamp
        });
        
        maintenanceDecisionIds.push(decisionId);
        
        emit AIMaintenanceDecision(
            decisionId,
            requestId,
            priority,
            (estimatedCostMin + estimatedCostMax) / 2,
            reasoning,
            block.timestamp
        );
        
        return decisionId;
    }
    
    /**
     * @notice Record AI application screening score
     */
    function recordApplicationScore(
        address applicant,
        address property,
        uint8 compatibilityScore,
        uint8 riskScore,
        bool recommended,
        string memory reasoning
    ) external onlyAIAgent returns (bytes32) {
        require(applicant != address(0), "Invalid applicant");
        require(compatibilityScore <= 100, "Compatibility must be 0-100");
        require(riskScore <= 100, "Risk must be 0-100");
        
        bytes32 decisionId = keccak256(abi.encodePacked(
            applicant,
            property,
            block.timestamp,
            applicationScoreIds.length
        ));
        
        applicationScores[decisionId] = ApplicationScore({
            applicant: applicant,
            property: property,
            compatibilityScore: compatibilityScore,
            riskScore: riskScore,
            recommended: recommended,
            reasoning: reasoning,
            timestamp: block.timestamp
        });
        
        applicationScoreIds.push(decisionId);
        
        emit AIApplicationScore(
            decisionId,
            applicant,
            compatibilityScore,
            riskScore,
            recommended,
            block.timestamp
        );
        
        return decisionId;
    }
    
    /**
     * @notice Record voice command authorization
     */
    function recordVoiceAuthorization(
        address user,
        string memory commandType,
        string memory command,
        bool authorized
    ) external onlyAIAgent returns (bytes32) {
        require(user != address(0), "Invalid user");
        
        bytes32 authId = keccak256(abi.encodePacked(
            user,
            command,
            block.timestamp,
            voiceAuthIds.length
        ));
        
        voiceAuthorizations[authId] = VoiceAuth({
            user: user,
            commandType: commandType,
            command: command,
            authorized: authorized,
            timestamp: block.timestamp
        });
        
        voiceAuthIds.push(authId);
        
        emit VoiceCommandAuthorization(
            authId,
            user,
            command,
            authorized,
            block.timestamp
        );
        
        return authId;
    }
    
    // ==================== View Functions ====================
    
    function getPaymentDecision(bytes32 decisionId) external view returns (PaymentDecision memory) {
        return paymentDecisions[decisionId];
    }
    
    function getMaintenanceDecision(bytes32 decisionId) external view returns (MaintenanceDecision memory) {
        return maintenanceDecisions[decisionId];
    }
    
    function getApplicationScore(bytes32 decisionId) external view returns (ApplicationScore memory) {
        return applicationScores[decisionId];
    }
    
    function getVoiceAuthorization(bytes32 authId) external view returns (VoiceAuth memory) {
        return voiceAuthorizations[authId];
    }
    
    function getTotalPaymentDecisions() external view returns (uint256) {
        return paymentDecisionIds.length;
    }
    
    function getTotalMaintenanceDecisions() external view returns (uint256) {
        return maintenanceDecisionIds.length;
    }
    
    function getTotalApplicationScores() external view returns (uint256) {
        return applicationScoreIds.length;
    }
    
    function getTotalVoiceAuthorizations() external view returns (uint256) {
        return voiceAuthIds.length;
    }
    
    // ==================== Admin Functions ====================
    
    function authorizeAgent(address agent) external {
        require(msg.sender == aiAgent, "Only AI agent can authorize");
        authorizedAgents[agent] = true;
    }
    
    function revokeAgent(address agent) external {
        require(msg.sender == aiAgent, "Only AI agent can revoke");
        authorizedAgents[agent] = false;
    }
}
