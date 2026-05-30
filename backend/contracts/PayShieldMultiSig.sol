// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./PayShieldPayroll.sol";
import "./PayShieldRegistry.sol";
import "./PayShieldEscrow.sol";
import "./interfaces/IPayShieldAuditLog.sol";

contract PayShieldMultiSig is Ownable, ReentrancyGuard {
    uint256 public constant MAX_SIGNERS = 10;
    uint256 public constant MIN_THRESHOLD = 1;
    uint256 public constant MAX_BATCH_SIZE = 50;
    uint256 public constant BATCH_EXPIRY_SECONDS = 7 days;

    bytes32 public constant ACTION_PAYROLL_SUBMITTED = keccak256("PAYROLL_SUBMITTED");
    bytes32 public constant ACTION_PAYROLL_APPROVED = keccak256("PAYROLL_APPROVED");
    bytes32 public constant ACTION_PAYROLL_RELEASED = keccak256("PAYROLL_RELEASED");
    bytes32 public constant ACTION_SIGNER_ADDED = keccak256("SIGNER_ADDED");
    bytes32 public constant ACTION_APPROVAL_CAST = keccak256("APPROVAL_CAST");

    struct PayrollBatch {
        bytes32 batchId;
        address employer;
        address[] contractors;
        uint256 createdAt;
        uint256 approvalCount;
        bool executed;
        bool expired;
    }

    PayShieldPayroll public immutable payroll;
    PayShieldRegistry public immutable registry;
    IPayShieldAuditLog public immutable auditLog;
    PayShieldEscrow public escrow;

    mapping(address employer => address[]) private _signerSet;
    mapping(address employer => mapping(address signer => bool)) private _isSigner;
    mapping(address employer => uint256) private _threshold;
    mapping(bytes32 batchId => PayrollBatch) private _batches;
    mapping(bytes32 batchId => mapping(address signer => bool)) private _hasApproved;
    mapping(address employer => uint256) private _batchNonce;

    error ZeroAddress();
    error NotASigner(address caller);
    error AlreadyApproved(address signer, bytes32 batchId);
    error BatchExpired(bytes32 batchId, uint256 expiredAt);
    error BatchAlreadyExecuted(bytes32 batchId);
    error BoundsExceeded(uint256 value, uint256 max);
    error InvalidThreshold(uint256 threshold, uint256 signerCount);
    error DuplicateContractor(address contractor);
    error CrossTeamAccess(address caller, address expectedTeam);
    error ThresholdNotConfigured(address employer);
    error UnauthorizedCaller(address caller);
    error DuplicateSigner(address signer);
    error InvalidBatch(bytes32 batchId);

    event SignerConfigured(address indexed employer, address indexed signer, bool active);
    event ThresholdUpdated(address indexed employer, uint256 threshold);
    event BatchCreated(bytes32 indexed batchId, address indexed employer, uint256 contractorCount);
    event BatchApproved(bytes32 indexed batchId, address indexed signer, uint256 approvalCount);
    event BatchExecuted(bytes32 indexed batchId, address indexed employer);

    constructor(address payrollAddress, address registryAddress, address auditLogAddress) Ownable(msg.sender) {
        if (payrollAddress == address(0) || registryAddress == address(0) || auditLogAddress == address(0)) {
            revert ZeroAddress();
        }
        payroll = PayShieldPayroll(payrollAddress);
        registry = PayShieldRegistry(registryAddress);
        auditLog = IPayShieldAuditLog(auditLogAddress);
    }

    function setEscrow(address escrowAddress) external onlyOwner {
        if (escrowAddress == address(0)) revert ZeroAddress();
        escrow = PayShieldEscrow(escrowAddress);
    }

    modifier onlyEmployer() {
        if (uint8(registry.getRoleAsUint(msg.sender)) != 1) revert UnauthorizedCaller(msg.sender);
        _;
    }

    function configureSigner(address signer, bool active) external onlyEmployer nonReentrant {
        if (signer == address(0)) revert ZeroAddress();
        if (signer == msg.sender) revert UnauthorizedCaller(msg.sender);

        if (active) {
            if (_isSigner[msg.sender][signer]) revert DuplicateSigner(signer);
            if (_signerSet[msg.sender].length >= MAX_SIGNERS) revert BoundsExceeded(_signerSet[msg.sender].length, MAX_SIGNERS);
            _signerSet[msg.sender].push(signer);
            _isSigner[msg.sender][signer] = true;
        } else {
            _isSigner[msg.sender][signer] = false;
            address[] storage signers = _signerSet[msg.sender];
            for (uint256 i = 0; i < signers.length; i++) {
                if (signers[i] == signer) {
                    signers[i] = signers[signers.length - 1];
                    signers.pop();
                    break;
                }
            }
        }

        auditLog.log(msg.sender, signer, ACTION_SIGNER_ADDED, keccak256(abi.encodePacked(msg.sender)), block.timestamp);
        emit SignerConfigured(msg.sender, signer, active);
    }

    function setThreshold(uint256 threshold) external onlyEmployer nonReentrant {
        uint256 signerCount = _signerSet[msg.sender].length;
        if (threshold < MIN_THRESHOLD || threshold > signerCount) revert InvalidThreshold(threshold, signerCount);
        _threshold[msg.sender] = threshold;
        emit ThresholdUpdated(msg.sender, threshold);
    }

    function createBatch(address[] calldata contractors) external onlyEmployer nonReentrant returns (bytes32 batchId) {
        if (contractors.length == 0 || contractors.length > MAX_BATCH_SIZE) revert BoundsExceeded(contractors.length, MAX_BATCH_SIZE);
        if (_threshold[msg.sender] == 0) revert ThresholdNotConfigured(msg.sender);

        for (uint256 i = 0; i < contractors.length; i++) {
            address contractor = contractors[i];
            if (contractor == address(0)) revert ZeroAddress();
            if (!registry.isEmployerContractor(msg.sender, contractor)) revert CrossTeamAccess(contractor, msg.sender);
            for (uint256 j = 0; j < i; j++) {
                if (contractors[j] == contractor) revert DuplicateContractor(contractor);
            }
        }

        batchId = keccak256(abi.encodePacked(msg.sender, _batchNonce[msg.sender]++, block.timestamp));
        PayrollBatch storage batch = _batches[batchId];
        batch.batchId = batchId;
        batch.employer = msg.sender;
        batch.contractors = contractors;
        batch.createdAt = block.timestamp;

        auditLog.log(msg.sender, address(0), ACTION_PAYROLL_SUBMITTED, keccak256(abi.encodePacked(msg.sender)), block.timestamp);
        emit BatchCreated(batchId, msg.sender, contractors.length);
    }

    function approve(bytes32 batchId) external nonReentrant {
        PayrollBatch storage batch = _batches[batchId];
        if (batch.batchId == bytes32(0)) revert InvalidBatch(batchId);
        if (!_isSigner[batch.employer][msg.sender]) revert NotASigner(msg.sender);
        if (batch.executed) revert BatchAlreadyExecuted(batchId);
        uint256 expiryAt = batch.createdAt + BATCH_EXPIRY_SECONDS;
        if (block.timestamp > expiryAt) {
            batch.expired = true;
            revert BatchExpired(batchId, expiryAt);
        }
        if (_hasApproved[batchId][msg.sender]) revert AlreadyApproved(msg.sender, batchId);

        _hasApproved[batchId][msg.sender] = true;
        batch.approvalCount++;

        auditLog.log(msg.sender, batch.employer, ACTION_APPROVAL_CAST, keccak256(abi.encodePacked(batch.employer)), block.timestamp);
        emit BatchApproved(batchId, msg.sender, batch.approvalCount);

        if (batch.approvalCount >= _threshold[batch.employer]) {
            _executeBatch(batchId);
        }
    }

    function _executeBatch(bytes32 batchId) internal {
        PayrollBatch storage batch = _batches[batchId];
        if (batch.executed) revert BatchAlreadyExecuted(batchId);
        batch.executed = true;

        for (uint256 i = 0; i < batch.contractors.length; i++) {
            payroll.releaseFor(batch.employer, batch.contractors[i]);
            if (address(escrow) != address(0)) {
                escrow.release(batch.employer, batch.contractors[i]);
            }
        }

        auditLog.log(batch.employer, address(0), ACTION_PAYROLL_RELEASED, keccak256(abi.encodePacked(batch.employer)), block.timestamp);
        emit BatchExecuted(batchId, batch.employer);
    }

    function getBatch(bytes32 batchId) external view returns (PayrollBatch memory) {
        PayrollBatch storage batch = _batches[batchId];
        if (batch.batchId == bytes32(0)) revert InvalidBatch(batchId);
        return batch;
    }

    function getSignerSet(address employer) external view returns (address[] memory) {
        return _signerSet[employer];
    }

    function getThreshold(address employer) external view returns (uint256) {
        return _threshold[employer];
    }

    function hasApproved(bytes32 batchId, address signer) external view returns (bool) {
        return _hasApproved[batchId][signer];
    }
}