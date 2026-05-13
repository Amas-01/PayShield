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
});
