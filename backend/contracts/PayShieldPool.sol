// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface IFHERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
}

contract PayShieldPool is ReentrancyGuard {
    address public owner;
    address public escrow;
    IFHERC20 public immutable usdc;
    address public payrollContract;

    mapping(address employer => uint256 balance) public employerBalances;
    mapping(address => uint256) public reservedBalances;

    event PoolFunded(address indexed employer, uint256 amount);
    event PoolPayout(address indexed employer, address indexed recipient, uint256 amount, bool success);
    event EscrowUpdated(address indexed escrowAddress);

    error UnauthorizedCaller(address caller);

    modifier onlyOwner() {
        require(msg.sender == owner, "only owner");
        _;
    }

    modifier onlyEscrow() {
        require(msg.sender == escrow, "only escrow");
        _;
    }

    modifier onlyPayrollContract() {
        if (msg.sender != payrollContract) revert UnauthorizedCaller(msg.sender);
        _;
    }

    constructor(address usdcAddress, address payrollAddress) {
        require(usdcAddress != address(0), "invalid token");
        owner = msg.sender;
        usdc = IFHERC20(usdcAddress);
        payrollContract = payrollAddress;
    }

    function setEscrow(address escrowAddress) external onlyOwner {
        require(escrowAddress != address(0), "invalid escrow");
        escrow = escrowAddress;
        emit EscrowUpdated(escrowAddress);
    }

    function deposit(uint256 amount) external nonReentrant {
        require(amount > 0, "amount must be > 0");

        bool transferred = usdc.transferFrom(msg.sender, address(this), amount);
        require(transferred, "transfer failed");

        employerBalances[msg.sender] += amount;
        emit PoolFunded(msg.sender, amount);
    }

    function balanceOf(address employer) external view returns (uint256) {
        return employerBalances[employer];
    }

    function deductFromPool(address employer, uint256 amount) external onlyPayrollContract nonReentrant returns (bool) {
        if (employerBalances[employer] < amount) {
            return false;
        }

        employerBalances[employer] -= amount;
        reservedBalances[employer] += amount;
        return true;
    }

    function releaseForPayout(address employer, address recipient, uint256 amount) external onlyEscrow nonReentrant returns (bool) {
        // prefer reserved balances (deducted at payroll time)
        if (reservedBalances[employer] >= amount) {
            reservedBalances[employer] -= amount;
        } else if (employerBalances[employer] >= amount) {
            employerBalances[employer] -= amount;
        } else {
            emit PoolPayout(employer, recipient, amount, false);
            return false;
        }

        bool success = usdc.transfer(recipient, amount);

        if (!success) {
            // rollback to employerBalances to keep funds safe
            employerBalances[employer] += amount;
        }

        emit PoolPayout(employer, recipient, amount, success);
        return success;
    }
}
