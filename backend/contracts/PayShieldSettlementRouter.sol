// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./interfaces/IPayShieldAuditLog.sol";
import "./interfaces/IPayShieldEscrow.sol";
import "./interfaces/IPayShieldCorridorRegistry.sol";

contract PayShieldSettlementRouter is Ownable, ReentrancyGuard {
    uint256 public constant MAX_RATE_REF_BYTES = 64;
    uint256 public constant MAX_BATCH_SIZE = 50;

    IPayShieldAuditLog public immutable auditLog;
    IPayShieldEscrow public immutable escrow;
    IPayShieldCorridorRegistry public immutable corridorRegistry;

    address public multiSigContract;

    struct SettlementRecord {
        uint256 recordId;
        bytes32 teamId;
        address employer;
        address contractor;
        bytes32 corridorId;
        string corridorLabel;
        string exchangeRateRef;
        uint256 usdcAmount;
        uint256 settledAt;
        bool released;
    }

    mapping(bytes32 teamId => SettlementRecord[]) private _teamSettlements;
    mapping(bytes32 teamId => mapping(address contractor => uint256[])) private _contractorRecordIds;
    mapping(bytes32 teamId => string) private _teamRateRef;

    uint256 private _globalRecordCounter;

    error ZeroAddress();
    error ZeroAmount();
    error UnauthorisedCaller(address caller);
    error InvalidTeamId();
    error CorridorInactive(bytes32 corridorId);
    error EmptyRateRef();
    error RateRefTooLong(uint256 length, uint256 max);
    error DataIsolationViolation();

    event SettlementRouted(
        bytes32 indexed teamId,
        address indexed contractor,
        bytes32 indexed corridorId,
        uint256 usdcAmount,
        uint256 recordId
    );

    event ExchangeRateRefSet(bytes32 indexed teamId, string rateRef);

    constructor(
        address _auditLog,
        address _escrow,
        address _corridorRegistry,
        address _multiSig
    ) Ownable(msg.sender) {
        if (_auditLog == address(0)) revert ZeroAddress();
        if (_escrow == address(0)) revert ZeroAddress();
        if (_corridorRegistry == address(0)) revert ZeroAddress();
        if (_multiSig == address(0)) revert ZeroAddress();

        auditLog = IPayShieldAuditLog(_auditLog);
        escrow = IPayShieldEscrow(_escrow);
        corridorRegistry = IPayShieldCorridorRegistry(_corridorRegistry);
        multiSigContract = _multiSig;
    }

    modifier onlyMultiSig() {
        if (msg.sender != multiSigContract) revert UnauthorisedCaller(msg.sender);
        _;
    }

    function setExchangeRateRef(
        bytes32 teamId,
        string calldata rateRef
    ) external {
        bytes32 callerTeamId = keccak256(abi.encodePacked(msg.sender));
        if (callerTeamId != teamId) revert DataIsolationViolation();

        if (bytes(rateRef).length == 0) revert EmptyRateRef();
        if (bytes(rateRef).length > MAX_RATE_REF_BYTES) revert RateRefTooLong(bytes(rateRef).length, MAX_RATE_REF_BYTES);

        _teamRateRef[teamId] = rateRef;

        auditLog.log(
            msg.sender,
            address(0),
            auditLog.ACTION_RATE_REF_SET(),
            teamId,
            block.timestamp
        );

        emit ExchangeRateRefSet(teamId, rateRef);
    }

    function routeSettlement(
        bytes32 teamId,
        address employer,
        address contractor,
        bytes32 corridorId,
        uint256 usdcAmount
    ) external nonReentrant onlyMultiSig {
        if (teamId == bytes32(0)) revert InvalidTeamId();
        if (employer == address(0)) revert ZeroAddress();
        if (contractor == address(0)) revert ZeroAddress();
        if (usdcAmount == 0) revert ZeroAmount();

        bytes32 derivedTeamId = keccak256(abi.encodePacked(employer));
        if (derivedTeamId != teamId) revert DataIsolationViolation();

        if (!corridorRegistry.isActive(corridorId)) revert CorridorInactive(corridorId);

        IPayShieldCorridorRegistry.Corridor memory corridor = corridorRegistry.getCorridor(corridorId);
        string memory rateRef = _teamRateRef[teamId];

        uint256 recordId = _globalRecordCounter++;

        SettlementRecord memory record = SettlementRecord({
            recordId: recordId,
            teamId: teamId,
            employer: employer,
            contractor: contractor,
            corridorId: corridorId,
            corridorLabel: corridor.label,
            exchangeRateRef: rateRef,
            usdcAmount: usdcAmount,
            settledAt: block.timestamp,
            released: false
        });

        _teamSettlements[teamId].push(record);
        uint256 localIndex = _teamSettlements[teamId].length - 1;
        _contractorRecordIds[teamId][contractor].push(localIndex);

        escrow.release(contractor, usdcAmount);
        _teamSettlements[teamId][localIndex].released = true;

        corridorRegistry.incrementSettlementCount(corridorId);

        auditLog.log(
            employer,
            contractor,
            auditLog.ACTION_SETTLEMENT_ROUTED(),
            teamId,
            block.timestamp
        );

        emit SettlementRouted(teamId, contractor, corridorId, usdcAmount, recordId);
    }

    function getTeamSettlements(
        bytes32 teamId
    ) external view returns (SettlementRecord[] memory) {
        bytes32 callerTeamId = keccak256(abi.encodePacked(msg.sender));
        if (callerTeamId != teamId) revert DataIsolationViolation();

        return _teamSettlements[teamId];
    }

    function getContractorRecords(
        bytes32 teamId,
        address contractor
    ) external view returns (SettlementRecord[] memory) {
        if (msg.sender != contractor) revert DataIsolationViolation();

        uint256[] memory indices = _contractorRecordIds[teamId][contractor];
        SettlementRecord[] memory result = new SettlementRecord[](indices.length);

        for (uint256 i = 0; i < indices.length; i++) {
            result[i] = _teamSettlements[teamId][indices[i]];
        }

        return result;
    }

    function getSettlementCount(bytes32 teamId) external view returns (uint256) {
        return _teamSettlements[teamId].length;
    }
}
