import { ethers } from "hardhat";
import { expect } from "chai";
import { PayShieldSettlementRouter, PayShieldAuditLog, PayShieldCorridorRegistry } from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

describe("PayShieldSettlementRouter", () => {
  let router: PayShieldSettlementRouter;
  let auditLog: PayShieldAuditLog;
  let corridorRegistry: PayShieldCorridorRegistry;
  let owner: HardhatEthersSigner;
  let employer: HardhatEthersSigner;
  let contractor1: HardhatEthersSigner;
  let multiSig: HardhatEthersSigner;
  let escrowMock: HardhatEthersSigner;

  beforeEach(async () => {
    const signers = await ethers.getSigners();
    owner = signers[0];
    employer = signers[1];
    contractor1 = signers[2];
    multiSig = signers[3];
    escrowMock = signers[4];

    // Deploy AuditLog
    const auditLogFactory = await ethers.getContractFactory("PayShieldAuditLog");
    auditLog = (await auditLogFactory.deploy()) as PayShieldAuditLog;

    // Deploy CorridorRegistry
    const corridorFactory = await ethers.getContractFactory("PayShieldCorridorRegistry");
    corridorRegistry = (await corridorFactory.deploy()) as PayShieldCorridorRegistry;

    // Deploy SettlementRouter
    const routerFactory = await ethers.getContractFactory("PayShieldSettlementRouter");
    router = (await routerFactory.deploy(
      await auditLog.getAddress(),
      escrowMock.address,
      await corridorRegistry.getAddress(),
      multiSig.address
    )) as PayShieldSettlementRouter;

    // Authorise router as logger
    await auditLog.authoriseLogger(await router.getAddress());

    // Set router in corridor registry
    await corridorRegistry.setSettlementRouter(await router.getAddress());
  });

  describe("Constructor validation", () => {
    it("reverts if auditLog is zero address", async () => {
      const factory = await ethers.getContractFactory("PayShieldSettlementRouter");
      try {
        await factory.deploy(
          ethers.ZeroAddress,
          escrowMock.address,
          await corridorRegistry.getAddress(),
          multiSig.address
        );
        expect.fail("Should have reverted");
      } catch (error: any) {
        expect(error.message).to.include("ZeroAddress");
      }
    });

    it("reverts if escrow is zero address", async () => {
      const factory = await ethers.getContractFactory("PayShieldSettlementRouter");
      try {
        await factory.deploy(
          await auditLog.getAddress(),
          ethers.ZeroAddress,
          await corridorRegistry.getAddress(),
          multiSig.address
        );
        expect.fail("Should have reverted");
      } catch (error: any) {
        expect(error.message).to.include("ZeroAddress");
      }
    });

    it("reverts if corridorRegistry is zero address", async () => {
      const factory = await ethers.getContractFactory("PayShieldSettlementRouter");
      try {
        await factory.deploy(
          await auditLog.getAddress(),
          escrowMock.address,
          ethers.ZeroAddress,
          multiSig.address
        );
        expect.fail("Should have reverted");
      } catch (error: any) {
        expect(error.message).to.include("ZeroAddress");
      }
    });

    it("reverts if multiSig is zero address", async () => {
      const factory = await ethers.getContractFactory("PayShieldSettlementRouter");
      try {
        await factory.deploy(
          await auditLog.getAddress(),
          escrowMock.address,
          await corridorRegistry.getAddress(),
          ethers.ZeroAddress
        );
        expect.fail("Should have reverted");
      } catch (error: any) {
        expect(error.message).to.include("ZeroAddress");
      }
    });
  });

  describe("setExchangeRateRef", () => {
    it("employer can set their own team rate reference", async () => {
      const teamId = ethers.keccak256(ethers.solidityPacked(['address'], [employer.address]));
      await router.connect(employer).setExchangeRateRef(teamId, "CBN-2025-05-23");
      // No way to read it back directly, but it should not revert
    });

    it("reverts when rateRef is empty string", async () => {
      const teamId = ethers.keccak256(ethers.solidityPacked(['address'], [employer.address]));
      try {
        await router.connect(employer).setExchangeRateRef(teamId, "");
        expect.fail("Should have reverted");
      } catch (error: any) {
        expect(error.message).to.include("EmptyRateRef");
      }
    });

    it("reverts when rateRef exceeds 64 bytes", async () => {
      const teamId = ethers.keccak256(ethers.solidityPacked(['address'], [employer.address]));
      const longRef = "A".repeat(65);
      try {
        await router.connect(employer).setExchangeRateRef(teamId, longRef);
        expect.fail("Should have reverted");
      } catch (error: any) {
        expect(error.message).to.include("RateRefTooLong");
      }
    });

    it("reverts when caller's teamId does not match provided teamId", async () => {
      const wrongTeamId = ethers.keccak256(ethers.solidityPacked(['address'], [contractor1.address]));
      try {
        await router.connect(employer).setExchangeRateRef(wrongTeamId, "test-ref");
        expect.fail("Should have reverted");
      } catch (error: any) {
        expect(error.message).to.include("DataIsolationViolation");
      }
    });
  });

  describe("routeSettlement", () => {
    let nigeriaUkId: string;

    beforeEach(async () => {
      nigeriaUkId = ethers.id("Nigeria-UK");
    });

    it("reverts when called by non-multiSig address", async () => {
      const teamId = ethers.keccak256(ethers.solidityPacked(['address'], [employer.address]));
      try {
        await router.routeSettlement(teamId, employer.address, contractor1.address, nigeriaUkId, 1000);
        expect.fail("Should have reverted");
      } catch (error: any) {
        expect(error.message).to.include("UnauthorisedCaller");
      }
    });

    it("reverts when teamId is bytes32(0)", async () => {
      try {
        await router.connect(multiSig).routeSettlement(
          ethers.ZeroHash,
          employer.address,
          contractor1.address,
          nigeriaUkId,
          1000
        );
        expect.fail("Should have reverted");
      } catch (error: any) {
        expect(error.message).to.include("InvalidTeamId");
      }
    });

    it("reverts when employer is zero address", async () => {
      const teamId = ethers.keccak256(ethers.solidityPacked(['address'], [employer.address]));
      try {
        await router.connect(multiSig).routeSettlement(
          teamId,
          ethers.ZeroAddress,
          contractor1.address,
          nigeriaUkId,
          1000
        );
        expect.fail("Should have reverted");
      } catch (error: any) {
        expect(error.message).to.include("ZeroAddress");
      }
    });

    it("reverts when contractor is zero address", async () => {
      const teamId = ethers.keccak256(ethers.solidityPacked(['address'], [employer.address]));
      try {
        await router.connect(multiSig).routeSettlement(
          teamId,
          employer.address,
          ethers.ZeroAddress,
          nigeriaUkId,
          1000
        );
        expect.fail("Should have reverted");
      } catch (error: any) {
        expect(error.message).to.include("ZeroAddress");
      }
    });

    it("reverts when usdcAmount is zero", async () => {
      const teamId = ethers.keccak256(ethers.solidityPacked(['address'], [employer.address]));
      try {
        await router.connect(multiSig).routeSettlement(
          teamId,
          employer.address,
          contractor1.address,
          nigeriaUkId,
          0
        );
        expect.fail("Should have reverted");
      } catch (error: any) {
        expect(error.message).to.include("ZeroAmount");
      }
    });

    it("reverts when derived teamId does not match provided teamId", async () => {
      const wrongTeamId = ethers.keccak256(ethers.solidityPacked(['address'], [contractor1.address]));
      try {
        await router.connect(multiSig).routeSettlement(
          wrongTeamId,
          employer.address,
          contractor1.address,
          nigeriaUkId,
          1000
        );
        expect.fail("Should have reverted");
      } catch (error: any) {
        expect(error.message).to.include("DataIsolationViolation");
      }
    });

    it("reverts when corridorId is not active", async () => {
      const teamId = ethers.keccak256(ethers.solidityPacked(['address'], [employer.address]));
      const inactiveCorridor = ethers.id("Inactive-Corridor");
      try {
        await router.connect(multiSig).routeSettlement(
          teamId,
          employer.address,
          contractor1.address,
          inactiveCorridor,
          1000
        );
        expect.fail("Should have reverted");
      } catch (error: any) {
        expect(error.message).to.include("CorridorInactive");
      }
    });
  });

  describe("Data isolation", () => {
    it("getTeamSettlements reverts when caller is not the employer", async () => {
      const teamId = ethers.keccak256(ethers.solidityPacked(['address'], [employer.address]));
      try {
        await router.connect(contractor1).getTeamSettlements(teamId);
        expect.fail("Should have reverted");
      } catch (error: any) {
        expect(error.message).to.include("DataIsolationViolation");
      }
    });

    it("contractor can only read their own records within a team", async () => {
      const teamId = ethers.keccak256(ethers.solidityPacked(['address'], [employer.address]));
      try {
        // contractor1 tries to read contractor2's records
        const contractor2 = (await ethers.getSigners())[5];
        const records = await router.connect(contractor1).getContractorRecords(teamId, contractor2.address);
        expect.fail("Should have reverted");
      } catch (error: any) {
        expect(error.message).to.include("DataIsolationViolation");
      }
    });
  });

  describe("View functions", () => {
    it("getSettlementCount returns correct count per team", async () => {
      const teamId = ethers.keccak256(ethers.solidityPacked(['address'], [employer.address]));
      const count = await router.getSettlementCount(teamId);
      expect(Number(count)).to.equal(0);
    });
  });
});
