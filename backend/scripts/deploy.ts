import { ethers } from "hardhat";

async function main() {
  const usdcAddress = process.env.USDC_ADDRESS;
  if (!usdcAddress) {
    throw new Error("USDC_ADDRESS is required");
  }

  const registryFactory = await ethers.getContractFactory("PayShieldRegistry");
  const registry = await registryFactory.deploy();
  await registry.waitForDeployment();

  const payrollFactory = await ethers.getContractFactory("PayShieldPayroll");
  const payroll = await payrollFactory.deploy(await registry.getAddress());
  await payroll.waitForDeployment();

  const escrowFactory = await ethers.getContractFactory("PayShieldEscrow");
  const escrow = await escrowFactory.deploy(await payroll.getAddress());
  await escrow.waitForDeployment();

  const poolFactory = await ethers.getContractFactory("PayShieldPool");
  const pool = await poolFactory.deploy(usdcAddress, await payroll.getAddress());
  await pool.waitForDeployment();

  const setEscrowTx = await pool.setEscrow(await escrow.getAddress());
  await setEscrowTx.wait();

  // wire payroll and escrow to pool
  const setPoolTx = await payroll.setPool(await pool.getAddress());
  await setPoolTx.wait();

  const escrowSetPoolTx = await escrow.setPool(await pool.getAddress());
  await escrowSetPoolTx.wait();

  console.log("PayShieldRegistry:", await registry.getAddress());
  console.log("PayShieldPayroll:", await payroll.getAddress());
  console.log("PayShieldPool:", await pool.getAddress());
  console.log("PayShieldEscrow:", await escrow.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
