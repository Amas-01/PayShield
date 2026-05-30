// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IPayShieldAuditLog {
    struct AuditEntry {
        address actor;
        address subject;
        bytes32 actionType;
        bytes32 teamId;
        uint256 blockNumber;
        uint256 timestamp;
    }

    // Wave 5 & earlier
    function ACTION_PAYROLL_SUBMITTED() external view returns (bytes32);
    function ACTION_PAYROLL_APPROVED() external view returns (bytes32);
    function ACTION_PAYROLL_RELEASED() external view returns (bytes32);
    function ACTION_CONTRACTOR_ADDED() external view returns (bytes32);
    function ACTION_CONTRACTOR_REMOVED() external view returns (bytes32);
    function ACTION_POOL_DEPOSIT() external view returns (bytes32);
    function ACTION_POOL_WITHDRAW() external view returns (bytes32);
    function ACTION_SIGNER_ADDED() external view returns (bytes32);
    function ACTION_APPROVAL_CAST() external view returns (bytes32);

    // Wave 6 — Corridor Settlement
    function ACTION_SETTLEMENT_ROUTED() external view returns (bytes32);
    function ACTION_CORRIDOR_REGISTERED() external view returns (bytes32);
    function ACTION_CORRIDOR_PAUSED() external view returns (bytes32);
    function ACTION_RATE_REF_SET() external view returns (bytes32);

    function log(
        address actor,
        address subject,
        bytes32 actionType,
        bytes32 teamId,
        uint256 timestamp
    ) external;

    function getLogs(
        address employer,
        uint256 fromBlock,
        uint256 toBlock
    ) external view returns (AuditEntry[] memory);
}