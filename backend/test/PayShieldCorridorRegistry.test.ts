import { ethers } from "hardhat";
import { expect } from "chai";
import { PayShieldCorridorRegistry } from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

describe("PayShieldCorridorRegistry", () => {
  let registry: PayShieldCorridorRegistry;
  let owner: HardhatEthersSigner;
  let nonOwner: HardhatEthersSigner;
  let router: HardhatEthersSigner;

  beforeEach(async () => {
    const [deployerSigner, nonOwnerSigner, routerSigner] = await ethers.getSigners();
    owner = deployerSigner;
    nonOwner = nonOwnerSigner;
    router = routerSigner;

    const factory = await ethers.getContractFactory("PayShieldCorridorRegistry");
    registry = (await factory.deploy()) as PayShieldCorridorRegistry;
  });

  describe("Constructor", () => {
    it("Nigeria-UK corridor registered at deploy", async () => {
      const nigeriaUkId = ethers.id("Nigeria-UK");
      const corridor = await registry.getCorridor(nigeriaUkId);
      expect(corridor.label).to.equal("Nigeria-UK");
      expect(corridor.active).to.be.true;
    });

    it("Kenya-India corridor registered at deploy", async () => {
      const kenyaIndiaId = ethers.id("Kenya-India");
      const corridor = await registry.getCorridor(kenyaIndiaId);
      expect(corridor.label).to.equal("Kenya-India");
      expect(corridor.active).to.be.true;
    });

    it("both launch corridors are active by default", async () => {
      const nigeriaUkId = ethers.id("Nigeria-UK");
      const kenyaIndiaId = ethers.id("Kenya-India");
      expect(await registry.isActive(nigeriaUkId)).to.be.true;
      expect(await registry.isActive(kenyaIndiaId)).to.be.true;
    });
  });

  describe("registerCorridor", () => {
    it("owner can register a new corridor", async () => {
      await registry.registerCorridor("Pakistan-UAE", "PK", "AE");
      const corridorId = ethers.id("Pakistan-UAE");
      const corridor = await registry.getCorridor(corridorId);
      expect(corridor.label).to.equal("Pakistan-UAE");
      expect(corridor.active).to.be.true;
    });

    it("reverts when non-owner calls registerCorridor", async () => {
      try {
        await registry.connect(nonOwner).registerCorridor("Test-UK", "TS", "GB");
        expect.fail("Should have reverted");
      } catch (error: any) {
        expect(error.message).to.include("OwnableUnauthorizedAccount");
      }
    });

    it("reverts when label is empty string", async () => {
      try {
        await registry.registerCorridor("", "XX", "YY");
        expect.fail("Should have reverted");
      } catch (error: any) {
        expect(error.message).to.include("EmptyLabel");
      }
    });

    it("reverts when label exceeds 64 bytes", async () => {
      const longLabel = "A".repeat(65);
      try {
        await registry.registerCorridor(longLabel, "XX", "YY");
        expect.fail("Should have reverted");
      } catch (error: any) {
        expect(error.message).to.include("LabelTooLong");
      }
    });

    it("reverts when duplicate corridor label is registered", async () => {
      try {
        await registry.registerCorridor("Nigeria-UK", "XX", "YY");
        expect.fail("Should have reverted");
      } catch (error: any) {
        expect(error.message).to.include("CorridorAlreadyExists");
      }
    });

    it("reverts when MAX_CORRIDORS (50) is reached", async () => {
      for (let i = 0; i < 48; i++) {
        await registry.registerCorridor(`Corridor-${i}`, `R${i}`, `D${i}`);
      }
      // We now have 50 corridors total (2 launch + 48 registered)
      try {
        await registry.registerCorridor("Overflow-1", "OF", "OF");
        expect.fail("Should have reverted");
      } catch (error: any) {
        expect(error.message).to.include("TooManyCorridors");
      }
    });
  });

  describe("pauseCorridor / resumeCorridor", () => {
    it("owner can pause an active corridor", async () => {
      const nigeriaUkId = ethers.id("Nigeria-UK");
      await registry.pauseCorridor(nigeriaUkId);
      expect(await registry.isActive(nigeriaUkId)).to.be.false;
    });

    it("owner can resume a paused corridor", async () => {
      const nigeriaUkId = ethers.id("Nigeria-UK");
      await registry.pauseCorridor(nigeriaUkId);
      await registry.resumeCorridor(nigeriaUkId);
      expect(await registry.isActive(nigeriaUkId)).to.be.true;
    });

    it("reverts when pausing non-existent corridorId", async () => {
      const nonExistentId = ethers.id("NonExistent");
      try {
        await registry.pauseCorridor(nonExistentId);
        expect.fail("Should have reverted");
      } catch (error: any) {
        expect(error.message).to.include("CorridorNotFound");
      }
    });

    it("non-owner cannot pause corridor", async () => {
      const nigeriaUkId = ethers.id("Nigeria-UK");
      try {
        await registry.connect(nonOwner).pauseCorridor(nigeriaUkId);
        expect.fail("Should have reverted");
      } catch (error: any) {
        expect(error.message).to.include("OwnableUnauthorizedAccount");
      }
    });
  });

  describe("setSettlementRouter", () => {
    it("owner can set settlement router", async () => {
      await registry.setSettlementRouter(router.address);
      expect(await registry.settlementRouter()).to.equal(router.address);
    });

    it("reverts when setting router to zero address", async () => {
      try {
        await registry.setSettlementRouter(ethers.ZeroAddress);
        expect.fail("Should have reverted");
      } catch (error: any) {
        expect(error.message).to.include("ZeroAddress");
      }
    });

    it("reverts when setSettlementRouter is called twice", async () => {
      await registry.setSettlementRouter(router.address);
      try {
        await registry.setSettlementRouter(owner.address);
        expect.fail("Should have reverted");
      } catch (error: any) {
        // Expected
      }
    });
  });

  describe("incrementSettlementCount", () => {
    beforeEach(async () => {
      await registry.setSettlementRouter(router.address);
    });

    it("reverts when called by non-router address", async () => {
      const nigeriaUkId = ethers.id("Nigeria-UK");
      try {
        await registry.connect(nonOwner).incrementSettlementCount(nigeriaUkId);
        expect.fail("Should have reverted");
      } catch (error: any) {
        expect(error.message).to.include("UnauthorisedCaller");
      }
    });

    it("increments totalSettlements correctly", async () => {
      const nigeriaUkId = ethers.id("Nigeria-UK");
      let corridor = await registry.getCorridor(nigeriaUkId);
      expect(Number(corridor.totalSettlements)).to.equal(0);
      await registry.connect(router).incrementSettlementCount(nigeriaUkId);
      corridor = await registry.getCorridor(nigeriaUkId);
      expect(Number(corridor.totalSettlements)).to.equal(1);
      await registry.connect(router).incrementSettlementCount(nigeriaUkId);
      corridor = await registry.getCorridor(nigeriaUkId);
      expect(Number(corridor.totalSettlements)).to.equal(2);
    });

    it("reverts when incrementing non-existent corridorId", async () => {
      const nonExistentId = ethers.id("NonExistent");
      try {
        await registry.connect(router).incrementSettlementCount(nonExistentId);
        expect.fail("Should have reverted");
      } catch (error: any) {
        expect(error.message).to.include("CorridorNotFound");
      }
    });
  });

  describe("View functions", () => {
    it("getCorridor returns full struct for valid corridorId", async () => {
      const nigeriaUkId = ethers.id("Nigeria-UK");
      const corridor = await registry.getCorridor(nigeriaUkId);
      expect(corridor.label).to.equal("Nigeria-UK");
      expect(corridor.active).to.be.true;
      expect(Number(corridor.registeredAt)).to.be.greaterThan(0);
    });

    it("getCorridor reverts for unknown corridorId", async () => {
      const unknownId = ethers.id("Unknown");
      try {
        await registry.getCorridor(unknownId);
        expect.fail("Should have reverted");
      } catch (error: any) {
        expect(error.message).to.include("CorridorNotFound");
      }
    });

    it("getAllCorridors returns all registered corridors", async () => {
      const corridors = await registry.getAllCorridors();
      expect(corridors.length).to.equal(2);
      expect(corridors[0].label).to.equal("Nigeria-UK");
      expect(corridors[1].label).to.equal("Kenya-India");
    });

    it("isActive returns false after corridor is paused", async () => {
      const nigeriaUkId = ethers.id("Nigeria-UK");
      expect(await registry.isActive(nigeriaUkId)).to.be.true;
      await registry.pauseCorridor(nigeriaUkId);
      expect(await registry.isActive(nigeriaUkId)).to.be.false;
    });

    it("corridorCount returns correct count", async () => {
      expect(Number(await registry.corridorCount())).to.equal(2);
      await registry.registerCorridor("USA-Mexico", "US", "MX");
      expect(Number(await registry.corridorCount())).to.equal(3);
    });
  });
});
