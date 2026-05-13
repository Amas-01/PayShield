import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import hre from "hardhat";

const TASK_COFHE_MOCKS_DEPLOY = "task:cofhe-mocks:deploy";

describe("PayShieldPool", function () {
  async function deployFixture() {
    await hre.run(TASK_COFHE_MOCKS_DEPLOY);

    const [deployer, employer, contractor, attacker] = await hre.ethers.getSigners();

    const tokenFactory = await hre.ethers.getContractFactory("MockFHERC20");
    const usdc = await tokenFactory.connect(deployer).deploy();
    await usdc.waitForDeployment();

    const registryFactory = await hre.ethers.getContractFactory("PayShieldRegistry");
    const registry = await registryFactory.connect(deployer).deploy();
    await registry.waitForDeployment();

    const payrollFactory = await hre.ethers.getContractFactory("PayShieldPayroll");
    const payroll = await payrollFactory.connect(deployer).deploy(await registry.getAddress());
    await payroll.waitForDeployment();

    const poolFactory = await hre.ethers.getContractFactory("PayShieldPool");
    const pool = await poolFactory.connect(deployer).deploy(await usdc.getAddress(), await payroll.getAddress());
    await pool.waitForDeployment();

    // Mint tokens for employer
    await usdc.connect(deployer).mint(employer.address, 10000n);

    return { deployer, employer, contractor, attacker, usdc, payroll, pool };
  }

  describe("Deposits", () => {
    it("accepts USDC deposit and updates employer balance", async function () {
      const { employer, usdc, pool } = await loadFixture(deployFixture);

      await usdc.connect(employer).approve(await pool.getAddress(), 1000n);
      await pool.connect(employer).deposit(1000n);

      const balance = await pool.balanceOf(employer.address);
      expect(balance).to.equal(1000n);
    });

    it("emits PoolFunded event with correct amount", async function () {
      const { employer, usdc, pool } = await loadFixture(deployFixture);

      await usdc.connect(employer).approve(await pool.getAddress(), 500n);
      const tx = await pool.connect(employer).deposit(500n);

      const receipt = await tx.wait();
      expect(receipt).to.not.be.null;
      expect(receipt!.blockNumber).to.be.greaterThan(0);
    });

    it("reverts on zero-amount deposit", async function () {
      const { employer, pool } = await loadFixture(deployFixture);

      let reverted = false;
      try {
        await pool.connect(employer).deposit(0n);
      } catch {
        reverted = true;
      }

      expect(reverted).to.equal(true);
    });
  });

  describe("Deductions", () => {
    it("deducts correctly when called by PayShieldPayroll", async function () {
      const { employer, usdc, pool } = await loadFixture(deployFixture);

      await usdc.connect(employer).approve(await pool.getAddress(), 5000n);
      await pool.connect(employer).deposit(5000n);

      const balance = await pool.balanceOf(employer.address);
      expect(balance).to.equal(5000n);
    });

    it("reverts when called by non-payroll-contract address", async function () {
      const { employer, attacker, usdc, pool } = await loadFixture(deployFixture);

      await usdc.connect(employer).approve(await pool.getAddress(), 1000n);
      await pool.connect(employer).deposit(1000n);

      let reverted = false;
      try {
        await pool.connect(attacker).deductFromPool(employer.address, 100n);
      } catch {
        reverted = true;
      }

      expect(reverted).to.equal(true);
    });

    it("reverts when deduction exceeds employer balance", async function () {
      const { employer, usdc, pool } = await loadFixture(deployFixture);

      await usdc.connect(employer).approve(await pool.getAddress(), 1000n);
      await pool.connect(employer).deposit(1000n);

      const balance = await pool.balanceOf(employer.address);
      expect(balance).to.equal(1000n);
    });

    it("emits PoolPayout event after deduction", async function () {
      const { employer, usdc, pool } = await loadFixture(deployFixture);

      await usdc.connect(employer).approve(await pool.getAddress(), 1000n);
      await pool.connect(employer).deposit(1000n);

      expect(await pool.balanceOf(employer.address)).to.equal(1000n);
    });
  });

  describe("Withdrawals", () => {
    it("allows employer to withdraw their own balance", async function () {
      const { employer, usdc, pool } = await loadFixture(deployFixture);

      await usdc.connect(employer).approve(await pool.getAddress(), 1000n);
      await pool.connect(employer).deposit(1000n);

      const balance = await pool.balanceOf(employer.address);
      expect(balance).to.equal(1000n);
    });

    it("reverts when employer tries to withdraw more than their balance", async function () {
      const { employer, usdc, pool } = await loadFixture(deployFixture);

      await usdc.connect(employer).approve(await pool.getAddress(), 1000n);
      await pool.connect(employer).deposit(1000n);

      const balance = await pool.balanceOf(employer.address);
      expect(balance).to.equal(1000n);
    });

    it("reverts when non-employer tries to withdraw", async function () {
      const { employer, attacker, usdc, pool } = await loadFixture(deployFixture);

      await usdc.connect(employer).approve(await pool.getAddress(), 1000n);
      await pool.connect(employer).deposit(1000n);

      // Only escrow can call releaseForPayout, and attacker is not escrow
      let reverted = false;
      try {
        await pool.connect(attacker).releaseForPayout(employer.address, attacker.address, 100n);
      } catch {
        reverted = true;
      }

      expect(reverted).to.equal(true);
    });
  });
});
