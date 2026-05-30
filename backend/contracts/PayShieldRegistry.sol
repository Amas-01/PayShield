// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./interfaces/IPayShieldAuditLog.sol";

contract PayShieldRegistry {
    enum Role {
        NONE,
        EMPLOYER,
        CONTRACTOR,
        AUDITOR,
        MULTISIG_SIGNER
    }

    error UnauthorizedCaller(address caller);
    error ZeroAddress();
    error BoundsExceeded(uint256 value, uint256 max);
    error DuplicateContractor(address contractor);

    uint256 public constant MAX_CONTRACTORS_PER_EMPLOYER = 100;

    enum ContractorState {
        Active,
        Paid,
        Disputed
    }

    struct ContractorRecord {
        bool exists;
        ContractorState state;
    }

    mapping(address employer => address[] contractors) private _teamContractors;
    mapping(address employer => mapping(address contractor => ContractorRecord record)) private _contractorRecords;
    mapping(address => Role) internal _roles;
    mapping(address contractor => address employer) internal _contractorTeam;
    mapping(address => bool) public employers;
    address public owner;
    IPayShieldAuditLog public auditLog;

    event ContractorRegistered(address indexed employer, address indexed contractor);
    event ContractorStateUpdated(address indexed employer, address indexed contractor, ContractorState state);

    bytes32 public constant ACTION_CONTRACTOR_ADDED = keccak256("CONTRACTOR_ADDED");
    bytes32 public constant ACTION_CONTRACTOR_REMOVED = keccak256("CONTRACTOR_REMOVED");

    constructor() {
        owner = msg.sender;
    }

    modifier onlyOwner() {
        if (msg.sender != owner) revert UnauthorizedCaller(msg.sender);
        _;
    }

    function setAuditLog(address auditLogAddress) external onlyOwner {
        if (auditLogAddress == address(0)) revert ZeroAddress();
        auditLog = IPayShieldAuditLog(auditLogAddress);
    }

    function assignRole(address account, Role role) external onlyOwner {
        if (account == address(0)) revert ZeroAddress();
        _roles[account] = role;
    }

    function registerEmployer() external {
        employers[msg.sender] = true;
        _roles[msg.sender] = Role.EMPLOYER;
    }

    function registerContractor(address contractor) external {
        if (_roles[msg.sender] != Role.EMPLOYER) revert UnauthorizedCaller(msg.sender);
        if (contractor == address(0)) revert ZeroAddress();

        ContractorRecord storage record = _contractorRecords[msg.sender][contractor];
        if (!record.exists) {
            if (_teamContractors[msg.sender].length >= MAX_CONTRACTORS_PER_EMPLOYER) {
                revert BoundsExceeded(_teamContractors[msg.sender].length, MAX_CONTRACTORS_PER_EMPLOYER);
            }
            _teamContractors[msg.sender].push(contractor);
            record.exists = true;
            _contractorTeam[contractor] = msg.sender;
            _roles[contractor] = Role.CONTRACTOR;
        } else {
            revert DuplicateContractor(contractor);
        }

        record.state = ContractorState.Active;

        emit ContractorRegistered(msg.sender, contractor);
        emit ContractorStateUpdated(msg.sender, contractor, ContractorState.Active);
        if (address(auditLog) != address(0)) {
            auditLog.log(msg.sender, contractor, ACTION_CONTRACTOR_ADDED, keccak256(abi.encodePacked(msg.sender)), block.timestamp);
        }
    }

    function removeContractor(address contractor) external {
        if (_roles[msg.sender] != Role.EMPLOYER) revert UnauthorizedCaller(msg.sender);
        if (_contractorTeam[contractor] != msg.sender) revert UnauthorizedCaller(msg.sender);

        ContractorRecord storage record = _contractorRecords[msg.sender][contractor];
        require(record.exists, "contractor not registered");

        // remove from array by swapping with last
        address[] storage list = _teamContractors[msg.sender];
        for (uint256 i = 0; i < list.length; i++) {
            if (list[i] == contractor) {
                list[i] = list[list.length - 1];
                list.pop();
                break;
            }
        }

        record.exists = false;
        _contractorTeam[contractor] = address(0);
        _roles[contractor] = Role.NONE;
        emit ContractorStateUpdated(msg.sender, contractor, ContractorState.Active);
        if (address(auditLog) != address(0)) {
            auditLog.log(msg.sender, contractor, ACTION_CONTRACTOR_REMOVED, keccak256(abi.encodePacked(msg.sender)), block.timestamp);
        }
    }

    function isEmployerContractor(address employer, address contractor) external view returns (bool) {
        return _contractorRecords[employer][contractor].exists;
    }

    function getContractors(address employer) external view returns (address[] memory) {
        return _teamContractors[employer];
    }

    function getContractorState(address employer, address contractor) external view returns (ContractorState) {
        require(_contractorRecords[employer][contractor].exists, "contractor not registered");
        return _contractorRecords[employer][contractor].state;
    }

    function markPaid(address contractor) external {
        ContractorRecord storage record = _contractorRecords[msg.sender][contractor];
        require(record.exists, "contractor not registered");
        require(record.state == ContractorState.Active, "invalid transition");

        record.state = ContractorState.Paid;
        emit ContractorStateUpdated(msg.sender, contractor, ContractorState.Paid);
    }

    function markDisputed(address contractor) external {
        ContractorRecord storage record = _contractorRecords[msg.sender][contractor];
        require(record.exists, "contractor not registered");
        require(record.state == ContractorState.Paid, "invalid transition");

        record.state = ContractorState.Disputed;
        emit ContractorStateUpdated(msg.sender, contractor, ContractorState.Disputed);
    }

    function getRole(address account) external view returns (Role) {
        return _roles[account];
    }

    function getRoleAsUint(address account) external view returns (uint8) {
        return uint8(_roles[account]);
    }

    function contractorTeam(address contractor) external view returns (address) {
        return _contractorTeam[contractor];
    }
}
