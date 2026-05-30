// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IPayShieldCorridorRegistry {
    struct Corridor {
        bytes32 corridorId;
        string label;
        string sourceRegion;
        string destRegion;
        bool active;
        uint256 registeredAt;
        uint256 totalSettlements;
    }

    function isActive(bytes32 corridorId) external view returns (bool);

    function getCorridor(bytes32 corridorId) external view returns (Corridor memory);

    function incrementSettlementCount(bytes32 corridorId) external;
}
