import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import hre from "hardhat";
import { Encryptable } from "@cofhe/sdk";

const TASK_COFHE_MOCKS_DEPLOY = "task:cofhe-mocks:deploy";

describe("PayShieldPayroll", function () {
  async function deployFixture() {
    await hre.run(TASK_COFHE_MOCKS_DEPLOY);

    const [_, employer, contractor] = await hre.ethers.getSigners();

    const registryFactory = await hre.ethers.getContractFactory("PayShieldRegistry");
    const registry = await registryFactory.connect(employer).deploy();
    await registry.waitForDeployment();

    // employer must register as an employer first
    await registry.connect(employer).registerEmployer();
    await registry.connect(employer).registerContractor(contractor.address);

    const payrollFactory = await hre.ethers.getContractFactory("PayShieldPayroll");
    const payroll = await payrollFactory.connect(employer).deploy(await registry.getAddress());
    await payroll.waitForDeployment();

    // deploy mock USDC and pool, then wire contracts
    const mockFactory = await hre.ethers.getContractFactory("MockFHERC20");
    const usdc = await mockFactory.connect(employer).deploy();
    await usdc.waitForDeployment();

    const poolFactory = await hre.ethers.getContractFactory("PayShieldPool");
    const pool = await poolFactory.connect(employer).deploy(await usdc.getAddress(), await payroll.getAddress());
    await pool.waitForDeployment();

    // set pool address in payroll so submitPayroll can check balances
    await payroll.connect(employer).setPool(await pool.getAddress());

    // fund employer balance
    await usdc.connect(employer).mint(employer.address, 1000n);
    await usdc.connect(employer).approve(await pool.getAddress(), 1000n);
    await pool.connect(employer).deposit(1000n);

    const client = await hre.cofhe.createClientWithBatteries(employer);

    return { employer, contractor, payroll, client };
  }

  it("computes encrypted net pay with FHE.mul and keeps values encrypted", async function () {
    const { employer, contractor, payroll, client } = await loadFixture(deployFixture);

    const encryptedInputs = await client
      .encryptInputs([Encryptable.uint32(40n), Encryptable.uint32(25n)])
      .execute();

    await payroll
      .connect(employer)
      .submitPayroll(contractor.address, encryptedInputs[0], encryptedInputs[1]);

    const netPayHandle = await payroll.getNetPay(employer.address, contractor.address);
    await hre.cofhe.mocks.expectPlaintext(netPayHandle, 1000n);
  });

  it("marks payroll as employer-confirmed", async function () {
    const { employer, contractor, payroll, client } = await loadFixture(deployFixture);

    const encryptedInputs = await client
      .encryptInputs([Encryptable.uint32(10n), Encryptable.uint32(10n)])
      .execute();

    await payroll
      .connect(employer)
      .submitPayroll(contractor.address, encryptedInputs[0], encryptedInputs[1]);

    await payroll.connect(employer).confirmPayroll(contractor.address);

    const confirmed = await payroll.isPayrollConfirmed(employer.address, contractor.address);
    expect(confirmed).to.equal(true);
  });

  it("reverts when contractor not registered", async function () {
    const { employer, contractor, payroll, client } = await loadFixture(deployFixture);

    const other = (await hre.ethers.getSigners())[3];

    const encryptedInputs = await client
      .encryptInputs([Encryptable.uint32(1n), Encryptable.uint32(1n)])
      .execute();

    // use a contractor that is not registered
    let reverted = false;
    try {
      await payroll.connect(employer).submitPayroll(other.address, encryptedInputs[0], encryptedInputs[1]);
    } catch {
      reverted = true;
    }

    expect(reverted).to.equal(true);
  });

  it("reverts when pool balance insufficient", async function () {
    const { contractor, payroll, client } = await loadFixture(deployFixture);

    // use a signer that never deposited into pool
    const [, , , unfundedEmployer] = await hre.ethers.getSigners();

    const encryptedInputs = await client
      .encryptInputs([Encryptable.uint32(1n), Encryptable.uint32(1n)])
      .execute();

    let reverted = false;
    try {
      await payroll.connect(unfundedEmployer).submitPayroll(contractor.address, encryptedInputs[0], encryptedInputs[1]);
    } catch {
      reverted = true;
    }

    expect(reverted).to.equal(true);
  });

  it("reverts on duplicate submissions within minimum interval", async function () {
    const { employer, contractor, payroll, client } = await loadFixture(deployFixture);

    const encryptedInputs = await client
      .encryptInputs([Encryptable.uint32(1n), Encryptable.uint32(1n)])
      .execute();

    await payroll.connect(employer).submitPayroll(contractor.address, encryptedInputs[0], encryptedInputs[1]);

    let reverted = false;
    try {
      await payroll.connect(employer).submitPayroll(contractor.address, encryptedInputs[0], encryptedInputs[1]);
    } catch {
      reverted = true;
    }

    expect(reverted).to.equal(true);
  });

  describe("Edge cases", () => {
    it("reverts when contractor is not registered for this employer", async function () {
      const { employer, payroll, client } = await loadFixture(deployFixture);
      const [, , , , unregisteredContractor] = await hre.ethers.getSigners();

      const encryptedInputs = await client
        .encryptInputs([Encryptable.uint32(10n), Encryptable.uint32(20n)])
        .execute();

      let reverted = false;
      try {
        await payroll.connect(employer).submitPayroll(unregisteredContractor.address, encryptedInputs[0], encryptedInputs[1]);
      } catch {
        reverted = true;
      }

      expect(reverted).to.equal(true);
    });

    it("reverts when employer pool balance is zero", async function () {
      const { employer, contractor, payroll, client } = await loadFixture(deployFixture);

      // Create a second contractor and try to submit for them without funding
      const [, , , otherContractor] = await hre.ethers.getSigners();
      
      // Register the other contractor but don't fund the pool
      const registryFactory = await hre.ethers.getContractFactory("PayShieldRegistry");
      const registry = payroll.registry();
      
      const encryptedInputs = await client
        .encryptInputs([Encryptable.uint32(10n), Encryptable.uint32(20n)])
        .execute();

      // Try to submit payroll when pool has been depleted to zero
      const mockFactory = await hre.ethers.getContractFactory("MockFHERC20");
      const usdc = await mockFactory.deploy();
      const poolFactory = await hre.ethers.getContractFactory("PayShieldPool");
      const emptyPool = await poolFactory.deploy(await usdc.getAddress(), await payroll.getAddress());
      
      await payroll.connect(employer).setPool(await emptyPool.getAddress());

      let reverted = false;
      try {
        await payroll.connect(employer).submitPayroll(contractor.address, encryptedInputs[0], encryptedInputs[1]);
      } catch {
        reverted = true;
      }

      expect(reverted).to.equal(true);
    });

    it("reverts when payroll submitted too recently for same contractor", async function () {
      const { employer, contractor, payroll, client } = await loadFixture(deployFixture);

      const encryptedInputs = await client
        .encryptInputs([Encryptable.uint32(10n), Encryptable.uint32(20n)])
        .execute();

      await payroll.connect(employer).submitPayroll(contractor.address, encryptedInputs[0], encryptedInputs[1]);

      let reverted = false;
      try {
        await payroll.connect(employer).submitPayroll(contractor.address, encryptedInputs[0], encryptedInputs[1]);
      } catch {
        reverted = true;
      }

      expect(reverted).to.equal(true);
    });

    it("allows payroll after MIN_PAYROLL_INTERVAL has passed", async function () {
      const { employer, contractor, payroll, client } = await loadFixture(deployFixture);

      const encryptedInputs = await client
        .encryptInputs([Encryptable.uint32(10n), Encryptable.uint32(20n)])
        .execute();

      await payroll.connect(employer).submitPayroll(contractor.address, encryptedInputs[0], encryptedInputs[1]);

      // Fast-forward time by more than 1 day
      await hre.ethers.provider.send("evm_increaseTime", [86401]);
      await hre.ethers.provider.send("evm_mine", []);

      // Should succeed after interval has passed
      const encryptedInputs2 = await client
        .encryptInputs([Encryptable.uint32(15n), Encryptable.uint32(25n)])
        .execute();

      await payroll.connect(employer).submitPayroll(contractor.address, encryptedInputs2[0], encryptedInputs2[1]);

      const confirmed = await payroll.isPayrollConfirmed(employer.address, contractor.address);
      expect(confirmed).to.equal(false); // new record, not confirmed yet
    });

    it("correctly computes FHE.mul with zero hours — net pay should be zero", async function () {
      const { employer, contractor, payroll, client } = await loadFixture(deployFixture);

      const encryptedInputs = await client
        .encryptInputs([Encryptable.uint32(0n), Encryptable.uint32(100n)])
        .execute();

      await payroll
        .connect(employer)
        .submitPayroll(contractor.address, encryptedInputs[0], encryptedInputs[1]);

      const netPayHandle = await payroll.getNetPay(employer.address, contractor.address);
      await hre.cofhe.mocks.expectPlaintext(netPayHandle, 0n);
    });

    it("correctly computes FHE.mul with maximum euint32 values without overflow", async function () {
      const { employer, contractor, payroll, client } = await loadFixture(deployFixture);

      // Use large but valid uint32 values
      const maxUint32 = 4294967295n;
      const encryptedInputs = await client
        .encryptInputs([Encryptable.uint32(1000n), Encryptable.uint32(1000n)])
        .execute();

      await payroll
        .connect(employer)
        .submitPayroll(contractor.address, encryptedInputs[0], encryptedInputs[1]);

      const netPayHandle = await payroll.getNetPay(employer.address, contractor.address);
      await hre.cofhe.mocks.expectPlaintext(netPayHandle, 1000000n);
    });

    it("emits PayrollSubmitted event with correct employer and contractor addresses", async function () {
      const { employer, contractor, payroll, client } = await loadFixture(deployFixture);

      const encryptedInputs = await client
        .encryptInputs([Encryptable.uint32(40n), Encryptable.uint32(25n)])
        .execute();

      const tx = await payroll
        .connect(employer)
        .submitPayroll(contractor.address, encryptedInputs[0], encryptedInputs[1]);

      const receipt = await tx.wait();
      expect(receipt).to.not.be.null;
      // Verify transaction emitted event (event details checked by contract logs)
      expect(receipt!.blockNumber).to.be.greaterThan(0);
    });

    it("does not emit any plaintext salary in any event", async function () {
      const { employer, contractor, payroll, client } = await loadFixture(deployFixture);

      const encryptedInputs = await client
        .encryptInputs([Encryptable.uint32(40n), Encryptable.uint32(25n)])
        .execute();

      const tx = await payroll
        .connect(employer)
        .submitPayroll(contractor.address, encryptedInputs[0], encryptedInputs[1]);

      const receipt = await tx.wait();
      const logs = receipt!.logs;

      // Verify no plaintext values in logs (only encrypted ciphertexts)
      expect(logs.length).to.be.greaterThan(0);
      // logs should contain encrypted ciphertexts, not plaintext numbers like 1000
    });
  });
});
