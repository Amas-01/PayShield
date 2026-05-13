// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./PayShieldPayroll.sol";
import "./PayShieldPool.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract PayShieldEscrow is ReentrancyGuard {
    PayShieldPayroll public immutable payroll;
    PayShieldPool public pool;
    address public payrollContract;
    address public owner;

    event PayoutAttempted(address indexed employer, address indexed recipient, uint256 amount, bool success);

    error UnauthorizedCaller(address caller);

    constructor(address payrollAddress) {
        require(payrollAddress != address(0), "invalid payroll");
        payroll = PayShieldPayroll(payrollAddress);
        payrollContract = payrollAddress;
        owner = msg.sender;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "only owner");
        _;
    }

    modifier onlyPayrollContract() {
        if (msg.sender != payrollContract) revert UnauthorizedCaller(msg.sender);
        _;
    }

    function setPool(address poolAddress) external onlyOwner {
        require(poolAddress != address(0), "invalid pool");
        pool = PayShieldPool(poolAddress);
    }

    function release(address employer, address contractor, uint256 amount) external onlyPayrollContract nonReentrant returns (bool) {
        bool confirmed = payroll.isPayrollConfirmed(employer, contractor);
        if (!confirmed) {
            emit PayoutAttempted(employer, contractor, amount, false);
            return false;
        }

        bool success = pool.releaseForPayout(employer, contractor, amount);
        emit PayoutAttempted(employer, contractor, amount, success);
        return success;
    }
}
