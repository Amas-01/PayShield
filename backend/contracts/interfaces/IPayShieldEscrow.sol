// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IPayShieldEscrow {
    function release(address contractor, uint256 amount) external;
}
