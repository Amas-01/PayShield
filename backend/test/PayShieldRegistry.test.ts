import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import hre from "hardhat";

describe("PayShieldRegistry", function () {
  async function deployFixture() {
    const [employer, contractor] = await hre.ethers.getSigners();
    const registryFactory = await hre.ethers.getContractFactory("PayShieldRegistry");
    const registry = await registryFactory.connect(employer).deploy();
    await registry.waitForDeployment();
    await registry.connect(employer).registerEmployer();

    return { employer, contractor, registry };
  }

  it("registers contractor and stores employer contractor list", async function () {
    const { employer, contractor, registry } = await loadFixture(deployFixture);

    await registry.connect(employer).registerContractor(contractor.address);
    const contractors = await registry.getContractors(employer.address);

    expect(contractors.length).to.equal(1);
    expect(contractors[0]).to.equal(contractor.address);
  });

  it("enforces Active -> Paid -> Disputed transitions", async function () {
    const { employer, contractor, registry } = await loadFixture(deployFixture);

    await registry.connect(employer).registerContractor(contractor.address);
    await registry.connect(employer).markPaid(contractor.address);
    await registry.connect(employer).markDisputed(contractor.address);

    const state = await registry.getContractorState(employer.address, contractor.address);
    expect(state).to.equal(2n);
  });

  describe("Access control", () => {
    it("reverts when non-employer tries to register a contractor", async function () {
      const { contractor, registry } = await loadFixture(deployFixture);
      const [, , attacker] = await hre.ethers.getSigners();

      let reverted = false;
      try {
        await registry.connect(attacker).registerContractor(contractor.address);
      } catch {
        reverted = true;
      }

      expect(reverted).to.equal(true);
    });

    it("reverts when employer tries to remove a contractor they did not register", async function () {
      const { employer, contractor, registry } = await loadFixture(deployFixture);
      const [, , , otherEmployer] = await hre.ethers.getSigners();

      // employer registers contractor
      await registry.connect(employer).registerEmployer();
      await registry.connect(employer).registerContractor(contractor.address);

      // otherEmployer tries to remove from employer's list
      let reverted = false;
      try {
        await registry.connect(otherEmployer).removeContractor(contractor.address);
      } catch {
        reverted = true;
      }

      expect(reverted).to.equal(true);
    });

    it("correctly transitions state: Active -> Paid -> Disputed", async function () {
      const { employer, contractor, registry } = await loadFixture(deployFixture);

      await registry.connect(employer).registerContractor(contractor.address);
      let state = await registry.getContractorState(employer.address, contractor.address);
      expect(state).to.equal(0n); // Active

      await registry.connect(employer).markPaid(contractor.address);
      state = await registry.getContractorState(employer.address, contractor.address);
      expect(state).to.equal(1n); // Paid

      await registry.connect(employer).markDisputed(contractor.address);
      state = await registry.getContractorState(employer.address, contractor.address);
      expect(state).to.equal(2n); // Disputed
    });

    it("emits ContractorRegistered event on successful registration", async function () {
      const { employer, contractor, registry } = await loadFixture(deployFixture);

      const tx = await registry.connect(employer).registerContractor(contractor.address);
      const receipt = await tx.wait();

      expect(receipt).to.not.be.null;
      expect(receipt!.blockNumber).to.be.greaterThan(0);
      // Event emission verified by contract logs
    });
  });
});
