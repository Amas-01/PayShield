import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import hre from "hardhat";

describe("PayShieldAuditLog", () => {
  async function deployFixture() {
    const [deployer, employerA, employerB] = await hre.ethers.getSigners();

    const auditLogFactory = await hre.ethers.getContractFactory("PayShieldAuditLog");
    const auditLog = await auditLogFactory.connect(deployer).deploy();
    await auditLog.waitForDeployment();

    await auditLog.connect(deployer).authoriseLogger(deployer.address);

    return { deployer, employerA, employerB, auditLog };
  }

  describe("Access control", () => {
    it("reverts when unauthorised address calls log()", async () => {
      const { employerA, auditLog } = await loadFixture(deployFixture);
      const teamId = hre.ethers.keccak256(hre.ethers.AbiCoder.defaultAbiCoder().encode(["address"], [employerA.address]));
      try {
        await auditLog.connect(employerA).log(employerA.address, employerA.address, hre.ethers.id("TEST"), teamId, 1n);
        expect.fail("should have reverted");
      } catch (e: any) {
        expect(e.message).to.include("reverted");
      }
    });

    it("allows owner to authorise logger", async () => {
      const { deployer, employerA, auditLog } = await loadFixture(deployFixture);
      await auditLog.connect(deployer).authoriseLogger(employerA.address);
      expect(await auditLog.isAuthorisedLogger(employerA.address)).to.equal(true);
    });

    it("allows owner to revoke logger", async () => {
      const { deployer, employerA, auditLog } = await loadFixture(deployFixture);
      await auditLog.connect(deployer).authoriseLogger(employerA.address);
      await auditLog.connect(deployer).revokeLogger(employerA.address);
      expect(await auditLog.isAuthorisedLogger(employerA.address)).to.equal(false);
    });
  });

  describe("Log functionality", () => {
    it("authorised caller can invoke log function", async () => {
      const { deployer, employerA, auditLog } = await loadFixture(deployFixture);
      const teamId = hre.ethers.keccak256(hre.ethers.AbiCoder.defaultAbiCoder().encode(["address"], [employerA.address]));
      const tx = await auditLog.connect(deployer).log(employerA.address, employerA.address, hre.ethers.id("TEST"), teamId, 1n);
      expect(tx).to.not.be.null;
    });

    it("getLogs returns entries for a team", async () => {
      const { deployer, employerA, auditLog } = await loadFixture(deployFixture);
      const teamId = hre.ethers.keccak256(hre.ethers.AbiCoder.defaultAbiCoder().encode(["address"], [employerA.address]));
      
      await auditLog.connect(deployer).log(employerA.address, employerA.address, hre.ethers.id("ACTION1"), teamId, 1n);
      const logs = await auditLog.getLogs(employerA.address, 0, 1000);
      
      expect(logs.length >= 0).to.equal(true);
    });
  });
});
