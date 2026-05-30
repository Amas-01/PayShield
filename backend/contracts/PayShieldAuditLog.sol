// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./interfaces/IPayShieldAuditLog.sol";

contract PayShieldAuditLog is Ownable, ReentrancyGuard, IPayShieldAuditLog {
    bytes32 public constant ACTION_PAYROLL_SUBMITTED = keccak256("PAYROLL_SUBMITTED");
    bytes32 public constant ACTION_PAYROLL_APPROVED = keccak256("PAYROLL_APPROVED");
    bytes32 public constant ACTION_PAYROLL_RELEASED = keccak256("PAYROLL_RELEASED");
    bytes32 public constant ACTION_CONTRACTOR_ADDED = keccak256("CONTRACTOR_ADDED");
    bytes32 public constant ACTION_CONTRACTOR_REMOVED = keccak256("CONTRACTOR_REMOVED");
    bytes32 public constant ACTION_POOL_DEPOSIT = keccak256("POOL_DEPOSIT");
    bytes32 public constant ACTION_POOL_WITHDRAW = keccak256("POOL_WITHDRAW");
    bytes32 public constant ACTION_SIGNER_ADDED = keccak256("SIGNER_ADDED");
    bytes32 public constant ACTION_APPROVAL_CAST = keccak256("APPROVAL_CAST");

    // Wave 6 — Corridor Settlement Actions
    bytes32 public constant ACTION_SETTLEMENT_ROUTED = keccak256("SETTLEMENT_ROUTED");
    bytes32 public constant ACTION_CORRIDOR_REGISTERED = keccak256("CORRIDOR_REGISTERED");
    bytes32 public constant ACTION_CORRIDOR_PAUSED = keccak256("CORRIDOR_PAUSED");
    bytes32 public constant ACTION_RATE_REF_SET = keccak256("RATE_REF_SET");

    mapping(bytes32 => AuditEntry[]) private _teamLogs;
    mapping(address => bool) private _authorisedLoggers;

    error UnauthorisedLogger(address caller);
    error ZeroAddress();
    error InvalidTeamId();

    event LogWritten(bytes32 indexed teamId, bytes32 indexed actionType, uint256 blockNumber);
    event LoggerAuthorised(address indexed contractAddress);
    event LoggerRevoked(address indexed contractAddress);

    constructor() Ownable(msg.sender) {}

    modifier onlyAuthorisedLogger() {
        if (!_authorisedLoggers[msg.sender]) revert UnauthorisedLogger(msg.sender);
        _;
    }

    function authoriseLogger(address contractAddress) external onlyOwner {
        if (contractAddress == address(0)) revert ZeroAddress();
        _authorisedLoggers[contractAddress] = true;
        emit LoggerAuthorised(contractAddress);
    }

    function revokeLogger(address contractAddress) external onlyOwner {
        if (contractAddress == address(0)) revert ZeroAddress();
        _authorisedLoggers[contractAddress] = false;
        emit LoggerRevoked(contractAddress);
    }

    function isAuthorisedLogger(address contractAddress) external view returns (bool) {
        return _authorisedLoggers[contractAddress];
    }

    function log(
        address actor,
        address subject,
        bytes32 actionType,
        bytes32 teamId,
        uint256 timestamp
    ) external nonReentrant onlyAuthorisedLogger {
        if (actor == address(0)) revert ZeroAddress();
        if (teamId == bytes32(0)) revert InvalidTeamId();

        _teamLogs[teamId].push(
            AuditEntry({
                actor: actor,
                subject: subject,
                actionType: actionType,
                teamId: teamId,
                blockNumber: block.number,
                timestamp: timestamp
            })
        );

        emit LogWritten(teamId, actionType, block.number);
    }

    function getLogs(
        address employer,
        uint256 fromBlock,
        uint256 toBlock
    ) external view returns (AuditEntry[] memory) {
        bytes32 teamId = keccak256(abi.encodePacked(employer));
        require(toBlock >= fromBlock, "AuditLog: invalid block range");

        AuditEntry[] storage all = _teamLogs[teamId];
        uint256 count;
        for (uint256 i = 0; i < all.length; i++) {
            if (all[i].blockNumber >= fromBlock && all[i].blockNumber <= toBlock) {
                count++;
            }
        }

        AuditEntry[] memory result = new AuditEntry[](count);
        uint256 idx;
        for (uint256 i = 0; i < all.length; i++) {
            if (all[i].blockNumber >= fromBlock && all[i].blockNumber <= toBlock) {
                result[idx++] = all[i];
            }
        }
        return result;
    }

    function getLogCount(address employer) external view returns (uint256) {
        return _teamLogs[keccak256(abi.encodePacked(employer))].length;
    }
}