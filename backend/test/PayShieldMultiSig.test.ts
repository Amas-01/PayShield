import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import hre from "hardhat";

describe("PayShieldMultiSig", () => {
  async function deployFixture() {
    const [deployer, employer, signer1, signer2, contractor1, contractor2, attacker, employer2] = await hre.ethers.getSigners();

    const auditLogFactory = await hre.ethers.getContractFactory("PayShieldAuditLog");
    const auditLog = await auditLogFactory.connect(deployer).deploy();
    await auditLog.waitForDeployment();

    const registryFactory = await hre.ethers.getContractFactory("PayShieldRegistry");
    const registry = await registryFactory.connect(deployer).deploy();
    await registry.waitForDeployment();
    await registry.connect(deployer).setAuditLog(await auditLog.getAddress());

    const payrollFactory = await hre.ethers.getContractFactory("PayShieldPayroll");
    const payroll = await payrollFactory.connect(deployer).deploy(await registry.getAddress());
    await payroll.waitForDeployment();
    await payroll.connect(deployer).setAuditLog(await auditLog.getAddress());

    const multisigFactory = await hre.ethers.getContractFactory("PayShieldMultiSig");
    const multisig = await multisigFactory.connect(deployer).deploy(await payroll.getAddress(), await registry.getAddress(), await auditLog.getAddress());
    await multisig.waitForDeployment();

    const escrowFactory = await hre.ethers.getContractFactory("PayShieldEscrow");
    const escrow = await escrowFactory.connect(deployer).deploy(await payroll.getAddress());
    await escrow.waitForDeployment();

    await payroll.connect(deployer).setMultiSigContract(await multisig.getAddress());
    await payroll.connect(deployer).setEscrow(await escrow.getAddress());
    await escrow.connect(deployer).setMultiSigContract(await multisig.getAddress());
    await multisig.connect(deployer).setEscrow(await escrow.getAddress());

    await auditLog.connect(deployer).authoriseLogger(await registry.getAddress());
    await auditLog.connect(deployer).authoriseLogger(await multisig.getAddress());
    await auditLog.connect(deployer).authoriseLogger(await payroll.getAddress());
    await auditLog.connect(deployer).authoriseLogger(await escrow.getAddress());

    await registry.connect(employer).registerEmployer();
    await registry.connect(employer2).registerEmployer();
    await registry.connect(employer).registerContractor(contractor1.address);
    await registry.connect(employer).registerContractor(contractor2.address);
    await registry.connect(employer2).registerContractor(attacker.address);

    return { deployer, employer, signer1, signer2, contractor1, contractor2, attacker, employer2, registry, payroll, multisig, escrow, auditLog };
  }

  async function batchIdFromTx(contract: any, txPromise: Promise<any>): Promise<string> {
    const tx = await txPromise;
    const receipt = await tx.wait();
    const events = await contract.queryFilter(contract.filters.BatchCreated(), receipt.blockNumber, receipt.blockNumber);
    if (!events.length || !events[0].args) {
      throw new Error("BatchCreated event not found");
    }
    return events[0].args.batchId;
  }

  describe("Signer management", () => {
    it("employer can add a signer", async () => {
      const { employer, multisig, signer1 } = await loadFixture(deployFixture);
      await multisig.connect(employer).configureSigner(signer1.address, true);
      const signers = await multisig.getSignerSet(employer.address);
      expect(signers.length).to.equal(1);
      expect(signers[0]).to.equal(signer1.address);
    });

    it("reverts when adding zero address", async () => {
      const { employer, multisig } = await loadFixture(deployFixture);
      try {
        await multisig.connect(employer).configureSigner(hre.ethers.ZeroAddress, true);
        expect.fail("should have reverted");
      } catch (e: any) {
        expect(e.message).to.include("reverted");
      }
    });

    it("reverts when adding duplicate signer", async () => {
      const { employer, multisig, signer1 } = await loadFixture(deployFixture);
      await multisig.connect(employer).configureSigner(signer1.address, true);
      try {
        await multisig.connect(employer).configureSigner(signer1.address, true);
        expect.fail("should have reverted");
      } catch (e: any) {
        expect(e.message).to.include("reverted");
      }
    });

    it("non-employer cannot add signers", async () => {
      const { attacker, multisig, signer1 } = await loadFixture(deployFixture);
      try {
        await multisig.connect(attacker).configureSigner(signer1.address, true);
        expect.fail("should have reverted");
      } catch (e: any) {
        expect(e.message).to.include("reverted");
      }
    });
  });

  describe("Threshold", () => {
    it("employer can set threshold", async () => {
      const { employer, multisig, signer1, signer2 } = await loadFixture(deployFixture);
      await multisig.connect(employer).configureSigner(signer1.address, true);
      await multisig.connect(employer).configureSigner(signer2.address, true);
      await multisig.connect(employer).setThreshold(2);
      expect(await multisig.getThreshold(employer.address)).to.equal(2n);
    });

    it("reverts when threshold exceeds signers", async () => {
      const { employer, multisig, signer1 } = await loadFixture(deployFixture);
      await multisig.connect(employer).configureSigner(signer1.address, true);
      try {
        await multisig.connect(employer).setThreshold(2);
        expect.fail("should have reverted");
      } catch (e: any) {
        expect(e.message).to.include("reverted");
      }
    });
  });

  describe("Batch creation", () => {
    it("employer creates batch successfully", async () => {
      const { employer, multisig, signer1, contractor1 } = await loadFixture(deployFixture);
      await multisig.connect(employer).configureSigner(signer1.address, true);
      await multisig.connect(employer).setThreshold(1);
      const tx = await multisig.connect(employer).createBatch([contractor1.address]);
      expect(tx).to.not.be.null;
    });

    it("reverts when threshold not set", async () => {
      const { employer, multisig, contractor1 } = await loadFixture(deployFixture);
      try {
        await multisig.connect(employer).createBatch([contractor1.address]);
        expect.fail("should have reverted");
      } catch (e: any) {
        expect(e.message).to.include("reverted");
      }
    });

    it("reverts for unregistered contractor", async () => {
      const { employer, multisig, signer1, attacker } = await loadFixture(deployFixture);
      await multisig.connect(employer).configureSigner(signer1.address, true);
      await multisig.connect(employer).setThreshold(1);
      try {
        await multisig.connect(employer).createBatch([attacker.address]);
        expect.fail("should have reverted");
      } catch (e: any) {
        expect(e.message).to.include("reverted");
      }
    });
  });

  describe("Approval flow", () => {
    it("signer can approve batch", async () => {
      const { employer, multisig, signer1, contractor1 } = await loadFixture(deployFixture);
      await multisig.connect(employer).configureSigner(signer1.address, true);
      await multisig.connect(employer).setThreshold(1);
      const batchId = await batchIdFromTx(multisig, multisig.connect(employer).createBatch([contractor1.address]));
      await multisig.connect(signer1).approve(batchId);
      const batch = await multisig.getBatch(batchId);
      expect(batch.approvalCount).to.equal(1n);
    });

    it("reverts on double approval", async () => {
      const { employer, multisig, signer1, contractor1 } = await loadFixture(deployFixture);
      await multisig.connect(employer).configureSigner(signer1.address, true);
      await multisig.connect(employer).setThreshold(1);
      const batchId = await batchIdFromTx(multisig, multisig.connect(employer).createBatch([contractor1.address]));
      await multisig.connect(signer1).approve(batchId);
      try {
        await multisig.connect(signer1).approve(batchId);
        expect.fail("should have reverted");
      } catch (e: any) {
        expect(e.message).to.include("reverted");
      }
    });

    it("batch executes when threshold reached", async () => {
      const { employer, multisig, signer1, contractor1 } = await loadFixture(deployFixture);
      await multisig.connect(employer).configureSigner(signer1.address, true);
      await multisig.connect(employer).setThreshold(1);
      const batchId = await batchIdFromTx(multisig, multisig.connect(employer).createBatch([contractor1.address]));
      await multisig.connect(signer1).approve(batchId);
      const batch = await multisig.getBatch(batchId);
      expect(batch.executed).to.equal(true);
    });
  });

  describe("Data isolation", () => {
    it("signer from different employer cannot approve", async () => {
      const { employer, employer2, multisig, signer1, signer2, contractor1 } = await loadFixture(deployFixture);
      await multisig.connect(employer).configureSigner(signer1.address, true);
      await multisig.connect(employer2).configureSigner(signer2.address, true);
      await multisig.connect(employer).setThreshold(1);
      const batchId = await batchIdFromTx(multisig, multisig.connect(employer).createBatch([contractor1.address]));
      try {
        await multisig.connect(signer2).approve(batchId);
        expect.fail("should have reverted");
      } catch (e: any) {
        expect(e.message).to.include("reverted");
      }
    });

    it("getSignerSet is isolated per employer", async () => {
      const { employer, employer2, multisig, signer1, signer2 } = await loadFixture(deployFixture);
      await multisig.connect(employer).configureSigner(signer1.address, true);
      await multisig.connect(employer2).configureSigner(signer2.address, true);
      const signerSetA = await multisig.getSignerSet(employer.address);
      const signerSetB = await multisig.getSignerSet(employer2.address);
      expect(signerSetA.length).to.equal(1);
      expect(signerSetB.length).to.equal(1);
      expect(signerSetA[0]).to.equal(signer1.address);
      expect(signerSetB[0]).to.equal(signer2.address);
    });
  });

  describe("Audit log", () => {
    it("logs are created for signer add", async () => {
      const { employer, multisig, signer1, auditLog } = await loadFixture(deployFixture);
      const beforeCount = await auditLog.getLogCount(employer.address);
      await multisig.connect(employer).configureSigner(signer1.address, true);
      const afterCount = await auditLog.getLogCount(employer.address);
      expect(afterCount > beforeCount).to.equal(true);
    });

    it("logs are created for batch creation", async () => {
      const { employer, multisig, signer1, contractor1, auditLog } = await loadFixture(deployFixture);
      await multisig.connect(employer).configureSigner(signer1.address, true);
      await multisig.connect(employer).setThreshold(1);
      const beforeCount = await auditLog.getLogCount(employer.address);
      await multisig.connect(employer).createBatch([contractor1.address]);
      const afterCount = await auditLog.getLogCount(employer.address);
      expect(afterCount > beforeCount).to.equal(true);
    });
  });
});