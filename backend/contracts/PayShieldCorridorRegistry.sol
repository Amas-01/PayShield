// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";

contract PayShieldCorridorRegistry is Ownable {
    // ─── Structs ─────────────────────────────────────────────────────────────

    struct Corridor {
        bytes32 corridorId; // keccak256(abi.encodePacked(label)) — immutable key
        string label; // e.g. "Nigeria-UK" — human readable, max 64 bytes
        string sourceRegion; // e.g. "NG" — ISO 3166-1 alpha-2
        string destRegion; // e.g. "GB"
        bool active;
        uint256 registeredAt;
        uint256 totalSettlements; // aggregate counter — not team-specific
    }

    // ─── Storage ─────────────────────────────────────────────────────────────

    mapping(bytes32 corridorId => Corridor) private _corridors;

    bytes32[] private _corridorIds; // ordered list for enumeration

    uint256 public constant MAX_LABEL_BYTES = 64;

    uint256 public constant MAX_REGION_BYTES = 8;

    uint256 public constant MAX_CORRIDORS = 50;

    // ─── Access control ───────────────────────────────────────────────────────

    address public settlementRouter;

    bool private _routerSet;

    // ─── Errors ───────────────────────────────────────────────────────────────

    error CorridorAlreadyExists(bytes32 corridorId);

    error CorridorNotFound(bytes32 corridorId);

    error CorridorInactive(bytes32 corridorId);

    error LabelTooLong(uint256 length, uint256 max);

    error EmptyLabel();

    error TooManyCorridors(uint256 max);

    error ZeroAddress();

    error UnauthorisedCaller(address caller);

    // ─── Events ───────────────────────────────────────────────────────────────

    event CorridorRegistered(bytes32 indexed corridorId, string label);

    event CorridorPaused(bytes32 indexed corridorId);

    event CorridorResumed(bytes32 indexed corridorId);

    event SettlementRouterSet(address indexed router);

    event SettlementCountIncremented(bytes32 indexed corridorId, uint256 newCount);

    constructor() Ownable(msg.sender) {
        // Register the two launch corridors immediately at deploy time
        _registerCorridor("Nigeria-UK", "NG", "GB");
        _registerCorridor("Kenya-India", "KE", "IN");
    }

    // ─── Admin functions ──────────────────────────────────────────────────────

    function registerCorridor(
        string calldata label,
        string calldata sourceRegion,
        string calldata destRegion
    ) external onlyOwner {
        _registerCorridor(label, sourceRegion, destRegion);
    }

    function _registerCorridor(
        string memory label,
        string memory sourceRegion,
        string memory destRegion
    ) internal {
        // Input sanitisation
        if (bytes(label).length == 0) revert EmptyLabel();
        if (bytes(label).length > MAX_LABEL_BYTES) revert LabelTooLong(bytes(label).length, MAX_LABEL_BYTES);
        if (_corridorIds.length >= MAX_CORRIDORS) revert TooManyCorridors(MAX_CORRIDORS);

        bytes32 corridorId = keccak256(abi.encodePacked(label));
        if (_corridors[corridorId].registeredAt != 0) revert CorridorAlreadyExists(corridorId);

        _corridors[corridorId] = Corridor({
            corridorId: corridorId,
            label: label,
            sourceRegion: sourceRegion,
            destRegion: destRegion,
            active: true,
            registeredAt: block.timestamp,
            totalSettlements: 0
        });

        _corridorIds.push(corridorId);

        emit CorridorRegistered(corridorId, label);
    }

    function pauseCorridor(bytes32 corridorId) external onlyOwner {
        if (_corridors[corridorId].registeredAt == 0) revert CorridorNotFound(corridorId);

        _corridors[corridorId].active = false;

        emit CorridorPaused(corridorId);
    }

    function resumeCorridor(bytes32 corridorId) external onlyOwner {
        if (_corridors[corridorId].registeredAt == 0) revert CorridorNotFound(corridorId);

        _corridors[corridorId].active = true;

        emit CorridorResumed(corridorId);
    }

    // ─── Settlement Router authorization ──────────────────────────────────────

    function setSettlementRouter(address router) external onlyOwner {
        require(!_routerSet, "Router already set");
        if (router == address(0)) revert ZeroAddress();

        settlementRouter = router;
        _routerSet = true;

        emit SettlementRouterSet(router);
    }

    modifier onlyRouter() {
        if (msg.sender != settlementRouter) revert UnauthorisedCaller(msg.sender);
        _;
    }

    function incrementSettlementCount(bytes32 corridorId) external onlyRouter {
        if (_corridors[corridorId].registeredAt == 0) revert CorridorNotFound(corridorId);

        _corridors[corridorId].totalSettlements++;

        emit SettlementCountIncremented(corridorId, _corridors[corridorId].totalSettlements);
    }

    // ─── View functions ───────────────────────────────────────────────────────

    function getCorridor(bytes32 corridorId) external view returns (Corridor memory) {
        if (_corridors[corridorId].registeredAt == 0) revert CorridorNotFound(corridorId);

        return _corridors[corridorId];
    }

    function isActive(bytes32 corridorId) external view returns (bool) {
        return _corridors[corridorId].active;
    }

    function getAllCorridors() external view returns (Corridor[] memory) {
        Corridor[] memory result = new Corridor[](_corridorIds.length);

        for (uint256 i = 0; i < _corridorIds.length; i++) {
            result[i] = _corridors[_corridorIds[i]];
        }

        return result;
    }

    function corridorCount() external view returns (uint256) {
        return _corridorIds.length;
    }
}
