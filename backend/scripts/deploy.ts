import { ethers } from "hardhat";
import { writeFile } from "node:fs/promises";

function assertNotZero(label: string, address: string) {
  if (address === ethers.ZeroAddress) {
    throw new Error(`${label} deployment returned zero address`);
  }
}

async function main() {
  const usdcAddress = process.env.USDC_ADDRESS;
  if (!usdcAddress) {
    throw new Error("USDC_ADDRESS is required");
  }

  try {
    // WAVE 5 DEPLOYMENTS
    const auditLogFactory = await ethers.getContractFactory("PayShieldAuditLog");
    const auditLog = await auditLogFactory.deploy();
    await auditLog.waitForDeployment();
    const auditLogAddress = await auditLog.getAddress();
    assertNotZero("PayShieldAuditLog", auditLogAddress);
    console.log("PayShieldAuditLog:", auditLogAddress);

    const registryFactory = await ethers.getContractFactory("PayShieldRegistry");
    const registry = await registryFactory.deploy();
    await registry.waitForDeployment();
    const registryAddress = await registry.getAddress();
    assertNotZero("PayShieldRegistry", registryAddress);
    console.log("PayShieldRegistry:", registryAddress);

    const payrollFactory = await ethers.getContractFactory("PayShieldPayroll");
    const payroll = await payrollFactory.deploy(registryAddress);
    await payroll.waitForDeployment();
    const payrollAddress = await payroll.getAddress();
    assertNotZero("PayShieldPayroll", payrollAddress);
    console.log("PayShieldPayroll:", payrollAddress);

    // WAVE 6 DEPLOYMENT: CorridorRegistry (before MultiSig for dependency)
    const corridorRegistryFactory = await ethers.getContractFactory("PayShieldCorridorRegistry");
    const corridorRegistry = await corridorRegistryFactory.deploy();
    await corridorRegistry.waitForDeployment();
    const corridorRegistryAddress = await corridorRegistry.getAddress();
    assertNotZero("PayShieldCorridorRegistry", corridorRegistryAddress);
    console.log("PayShieldCorridorRegistry:", corridorRegistryAddress);

    const multisigFactory = await ethers.getContractFactory("PayShieldMultiSig");
    const multisig = await multisigFactory.deploy(payrollAddress, registryAddress, auditLogAddress);
    await multisig.waitForDeployment();
    const multisigAddress = await multisig.getAddress();
    assertNotZero("PayShieldMultiSig", multisigAddress);
    console.log("PayShieldMultiSig:", multisigAddress);

    const escrowFactory = await ethers.getContractFactory("PayShieldEscrow");
    const escrow = await escrowFactory.deploy(payrollAddress);
    await escrow.waitForDeployment();
    const escrowAddress = await escrow.getAddress();
    assertNotZero("PayShieldEscrow", escrowAddress);
    console.log("PayShieldEscrow:", escrowAddress);

    const poolFactory = await ethers.getContractFactory("PayShieldPool");
    const pool = await poolFactory.deploy(usdcAddress, payrollAddress);
    await pool.waitForDeployment();
    const poolAddress = await pool.getAddress();
    assertNotZero("PayShieldPool", poolAddress);
    console.log("PayShieldPool:", poolAddress);

    // WAVE 6 DEPLOYMENT: SettlementRouter (after all dependencies)
    const settlementRouterFactory = await ethers.getContractFactory("PayShieldSettlementRouter");
    const settlementRouter = await settlementRouterFactory.deploy(
      auditLogAddress,
      escrowAddress,
      corridorRegistryAddress,
      multisigAddress
    );
    await settlementRouter.waitForDeployment();
    const settlementRouterAddress = await settlementRouter.getAddress();
    assertNotZero("PayShieldSettlementRouter", settlementRouterAddress);
    console.log("PayShieldSettlementRouter:", settlementRouterAddress);

    // WAVE 5 WIRING
    await (await registry.setAuditLog(auditLogAddress)).wait();
    await (await payroll.setAuditLog(auditLogAddress)).wait();
    await (await payroll.setMultiSigContract(multisigAddress)).wait();
    await (await payroll.setEscrow(escrowAddress)).wait();
    await (await multisig.setEscrow(escrowAddress)).wait();
    await (await escrow.setMultiSigContract(multisigAddress)).wait();
    await (await pool.setEscrow(escrowAddress)).wait();
    await (await pool.setAuditLog(auditLogAddress)).wait();

    // WAVE 6 WIRING: SettlementRouter dependencies
    await (await escrow.setSettlementRouter(settlementRouterAddress)).wait();
    await (await corridorRegistry.setSettlementRouter(settlementRouterAddress)).wait();
    console.log("Wave 6: SettlementRouter dependencies wired");

    // AUDIT LOG AUTHORIZATIONS (Wave 5 + Wave 6)
    await (await auditLog.authoriseLogger(registryAddress)).wait();
    await (await auditLog.authoriseLogger(payrollAddress)).wait();
    await (await auditLog.authoriseLogger(multisigAddress)).wait();
    await (await auditLog.authoriseLogger(escrowAddress)).wait();
    await (await auditLog.authoriseLogger(poolAddress)).wait();
    await (await auditLog.authoriseLogger(settlementRouterAddress)).wait(); // Wave 6
    console.log("Wave 6: SettlementRouter authorized as AuditLog logger");

    const deployment = {
      network: "arbitrum-sepolia",
      chainId: 421614,
      wave: 6,
      deployedAt: new Date().toISOString(),
      contracts: {
        // Wave 5
        PayShieldAuditLog: auditLogAddress,
        PayShieldRegistry: registryAddress,
        PayShieldPayroll: payrollAddress,
        PayShieldMultiSig: multisigAddress,
        PayShieldEscrow: escrowAddress,
        PayShieldPool: poolAddress,
        // Wave 6
        PayShieldCorridorRegistry: corridorRegistryAddress,
        PayShieldSettlementRouter: settlementRouterAddress,
      },
    };

    await writeFile("deployments/arbitrum-sepolia.json", `${JSON.stringify(deployment, null, 2)}\n`, "utf8");
    console.log("Wave 6 deployment complete: deployments/arbitrum-sepolia.json");
  } catch (error) {
    console.error("Deployment failed:", error);
    throw error;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
