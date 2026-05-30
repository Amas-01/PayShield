// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@fhenixprotocol/cofhe-contracts/FHE.sol";
import "./PayShieldRegistry.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./PayShieldPool.sol";
import "./PayShieldEscrow.sol";
import "./interfaces/IPayShieldAuditLog.sol";

contract PayShieldPayroll is ReentrancyGuard {
    struct PayrollRecord {
        euint32 encryptedHours;
        euint32 encryptedRate;
        euint32 netPay;
        bool exists;
        bool employerConfirmed;
    }

    PayShieldRegistry public immutable registry;
    mapping(address employer => mapping(address contractor => PayrollRecord record)) private payrollRecords;
    PayShieldPool public pool;
    PayShieldEscrow public escrow;
    IPayShieldAuditLog public auditLog;
    address public multiSigContract;
    address public owner;

    uint256 public constant MIN_PAYROLL_INTERVAL = 1 days;
    mapping(address employer => mapping(address contractor => uint256 lastPayrollTimestamp)) public lastPayrollTimestamp;

    error ContractorNotRegistered(address contractor);
    error InsufficientPoolBalance(address employer);
    error PayrollTooRecent(address contractor, uint256 lastTimestamp);
    error UnauthorizedCaller(address caller);

    event PayrollSubmitted(
        address indexed employer,
        address indexed contractor,
        euint32 encryptedHours,
        euint32 encryptedRate,
        euint32 netPay
    );
    event PayrollConfirmed(address indexed employer, address indexed contractor);

    constructor(address registryAddress) {
        require(registryAddress != address(0), "invalid registry");
        registry = PayShieldRegistry(registryAddress);
        owner = msg.sender;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "only owner");
        _;
    }

    function setPool(address poolAddress) external onlyOwner {
        require(poolAddress != address(0), "invalid pool");
        pool = PayShieldPool(poolAddress);
    }

    function setEscrow(address escrowAddress) external onlyOwner {
        require(escrowAddress != address(0), "invalid escrow");
        escrow = PayShieldEscrow(escrowAddress);
    }

    function setAuditLog(address auditLogAddress) external onlyOwner {
        require(auditLogAddress != address(0), "invalid audit log");
        auditLog = IPayShieldAuditLog(auditLogAddress);
    }

    function setMultiSigContract(address multiSigAddress) external onlyOwner {
        require(multiSigAddress != address(0), "invalid multisig");
        multiSigContract = multiSigAddress;
    }

    modifier onlyMultiSigContract() {
        if (msg.sender != multiSigContract) revert UnauthorizedCaller(msg.sender);
        _;
    }

    function submitPayroll(address contractor, InEuint32 memory encryptedHours, InEuint32 memory encryptedRate) external nonReentrant {
        if (uint8(registry.getRoleAsUint(msg.sender)) != 1) revert UnauthorizedCaller(msg.sender);
        if (!registry.isEmployerContractor(msg.sender, contractor)) revert ContractorNotRegistered(contractor);

        if (address(pool) == address(0) || pool.balanceOf(msg.sender) == 0) revert InsufficientPoolBalance(msg.sender);

        uint256 last = lastPayrollTimestamp[msg.sender][contractor];
        if (last != 0 && block.timestamp - last < MIN_PAYROLL_INTERVAL) {
            revert PayrollTooRecent(contractor, last);
        }

        euint32 encryptedHoursValue = FHE.asEuint32(encryptedHours);
        euint32 encryptedRateValue = FHE.asEuint32(encryptedRate);
        euint32 calculatedNetPay = FHE.mul(encryptedHoursValue, encryptedRateValue);

        FHE.allowThis(calculatedNetPay);
        FHE.allow(calculatedNetPay, contractor);

        payrollRecords[msg.sender][contractor] = PayrollRecord({
            encryptedHours: encryptedHoursValue,
            encryptedRate: encryptedRateValue,
            netPay: calculatedNetPay,
            exists: true,
            employerConfirmed: false
        });

        lastPayrollTimestamp[msg.sender][contractor] = block.timestamp;

        emit PayrollSubmitted(msg.sender, contractor, encryptedHoursValue, encryptedRateValue, calculatedNetPay);
        if (address(auditLog) != address(0)) {
            auditLog.log(msg.sender, contractor, keccak256("PAYROLL_SUBMITTED"), keccak256(abi.encodePacked(msg.sender)), block.timestamp);
        }
    }

    function confirmPayroll(address contractor) external {
        PayrollRecord storage record = payrollRecords[msg.sender][contractor];
        require(record.exists, "payroll missing");

        record.employerConfirmed = true;
        emit PayrollConfirmed(msg.sender, contractor);
    }

    function isPayrollConfirmed(address employer, address contractor) external view returns (bool) {
        return payrollRecords[employer][contractor].employerConfirmed;
    }

    function getNetPay(address employer, address contractor) external view returns (euint32) {
        PayrollRecord storage record = payrollRecords[employer][contractor];
        require(record.exists, "payroll missing");
        return record.netPay;
    }

    function releaseFor(address employer, address contractor) external onlyMultiSigContract nonReentrant returns (bool) {
        PayrollRecord storage record = payrollRecords[employer][contractor];
        if (record.exists) {
            record.employerConfirmed = true;
        }

        if (address(auditLog) != address(0)) {
            auditLog.log(employer, contractor, keccak256("PAYROLL_RELEASED"), keccak256(abi.encodePacked(employer)), block.timestamp);
        }

        return true;
    }
}
