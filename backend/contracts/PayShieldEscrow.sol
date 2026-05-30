// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./PayShieldPayroll.sol";
import "./PayShieldPool.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract PayShieldEscrow is ReentrancyGuard {
    PayShieldPayroll public immutable payroll;
    PayShieldPool public pool;
    address public multiSigContract;
    address public settlementRouter;
    address public owner;

    event PayoutAttempted(address indexed employer, address indexed recipient, uint256 amount, bool success);

    error UnauthorizedCaller(address caller);

    constructor(address payrollAddress) {
        require(payrollAddress != address(0), "invalid payroll");
        payroll = PayShieldPayroll(payrollAddress);
        owner = msg.sender;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "only owner");
        _;
    }

    modifier onlyMultiSigContract() {
        if (msg.sender != multiSigContract) revert UnauthorizedCaller(msg.sender);
        _;
    }

    modifier onlySettlementRouter() {
        if (msg.sender != settlementRouter) revert UnauthorizedCaller(msg.sender);
        _;
    }

    function setMultiSigContract(address multiSigAddress) external onlyOwner {
        require(multiSigAddress != address(0), "invalid multisig");
        multiSigContract = multiSigAddress;
    }

    function setSettlementRouter(address routerAddress) external onlyOwner {
        require(routerAddress != address(0), "invalid router");
        settlementRouter = routerAddress;
    }

    function setPool(address poolAddress) external onlyOwner {
        require(poolAddress != address(0), "invalid pool");
        pool = PayShieldPool(poolAddress);
    }

    function release(address contractor, uint256 amount) external onlySettlementRouter nonReentrant {
        // Wave 6: called by Settlement Router with contractor address and amount
        // No confirmation check needed — MultiSig already approved the batch
        pool.releaseForPayout(address(0), contractor, amount);
        emit PayoutAttempted(address(0), contractor, amount, true);
    }

    function release(address employer, address contractor) external onlyMultiSigContract nonReentrant returns (bool) {
        bool confirmed = payroll.isPayrollConfirmed(employer, contractor);
        if (!confirmed) {
            emit PayoutAttempted(employer, contractor, 0, false);
            return false;
        }

        emit PayoutAttempted(employer, contractor, 0, true);
        return true;
    }

    function release(address employer, address contractor, uint256 amount) external onlyMultiSigContract nonReentrant returns (bool) {
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
