import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import hre from "hardhat";
import { Encryptable } from "@cofhe/sdk";

const TASK_COFHE_MOCKS_DEPLOY = "task:cofhe-mocks:deploy";

describe("PayShieldEscrow", function () {
  async function deployFixture() {
    await hre.run(TASK_COFHE_MOCKS_DEPLOY);

    const [deployer, employer, contractor, attacker] = await hre.ethers.getSigners();

    const tokenFactory = await hre.ethers.getContractFactory("MockFHERC20");
    const token = await tokenFactory.connect(deployer).deploy();
    await token.waitForDeployment();

    const registryFactory = await hre.ethers.getContractFactory("PayShieldRegistry");
    const registry = await registryFactory.connect(deployer).deploy();
    await registry.waitForDeployment();
    await registry.connect(employer).registerEmployer();
    await registry.connect(employer).registerContractor(contractor.address);

    const payrollFactory = await hre.ethers.getContractFactory("PayShieldPayroll");
    const payroll = await payrollFactory.connect(deployer).deploy(await registry.getAddress());
    await payroll.waitForDeployment();

    const poolFactory = await hre.ethers.getContractFactory("PayShieldPool");
    const pool = await poolFactory.connect(deployer).deploy(await token.getAddress(), await payroll.getAddress());
    await pool.waitForDeployment();

    const escrowFactory = await hre.ethers.getContractFactory("PayShieldEscrow");
    const escrow = await escrowFactory.connect(deployer).deploy(await payroll.getAddress());
    await escrow.waitForDeployment();

    await pool.connect(deployer).setEscrow(await escrow.getAddress());
    await payroll.connect(deployer).setPool(await pool.getAddress());
    await escrow.connect(deployer).setPool(await pool.getAddress());

    return { employer, contractor, attacker, payroll, escrow };
  }

  it("reverts when random address calls release", async function () {
    const { employer, contractor, attacker, escrow } = await loadFixture(deployFixture);

    let reverted = false;
    try {
      await escrow.connect(attacker).release(employer.address, contractor.address, 1000n);
    } catch {
      reverted = true;
    }

    expect(reverted).to.equal(true);
  });
});
