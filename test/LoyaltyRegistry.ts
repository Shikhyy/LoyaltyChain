import { ethers } from "hardhat";
import { expect, assert } from "chai";

describe("LoyaltyRegistry", () => {
  let registry: any;
  let owner: any;
  let addr1: any;

  beforeEach(async () => {
    [owner, addr1] = await ethers.getSigners();
    const Registry = await ethers.getContractFactory("LoyaltyRegistry");
    registry = await Registry.deploy();
  });

  describe("registerBrand", () => {
    it("should register a brand and emit BrandRegistered event", async () => {
      const tx = await registry.registerBrand(
        "IndiGo Miles",
        "IGM",
        "https://example.com/igm.png",
        owner.address,
        100
      );
      
      const receipt = await tx.wait();
      const event = receipt.logs.find((log: any) => log.eventName === "BrandRegistered");
      
      expect(event).to.exist;
      expect(event.args.brandId).to.equal(0);
      expect(event.args.name).to.equal("IndiGo Miles");
      expect(event.args.operator).to.equal(owner.address);
    });

    it("should store correct brand data", async () => {
      await registry.registerBrand(
        "Air India Points",
        "AIP",
        "https://example.com/aip.png",
        addr1.address,
        100
      );

      const brand = await registry.getBrand(0);
      
      expect(brand.name).to.equal("Air India Points");
      expect(brand.symbol).to.equal("AIP");
      expect(brand.logoURI).to.equal("https://example.com/aip.png");
      expect(brand.operator).to.equal(addr1.address);
      expect(brand.pointsPerToken).to.equal(100);
      expect(brand.active).to.equal(true);
    });

    it("should increment brandCount", async () => {
      expect(await registry.brandCount()).to.equal(0);
      
      await registry.registerBrand("Brand 1", "B1", "http://b1.com", owner.address, 100);
      expect(await registry.brandCount()).to.equal(1);
      
      await registry.registerBrand("Brand 2", "B2", "http://b2.com", owner.address, 50);
      expect(await registry.brandCount()).to.equal(2);
    });

    it("should allow owner to register multiple brands", async () => {
      await registry.registerBrand("Brand A", "BA", "http://a.com", owner.address, 100);
      await registry.registerBrand("Brand B", "BB", "http://b.com", owner.address, 50);
      await registry.registerBrand("Brand C", "BC", "http://c.com", owner.address, 25);

      expect(await registry.brandCount()).to.equal(3);
    });
  });

  describe("updateBrand", () => {
    beforeEach(async () => {
      await registry.registerBrand(
        "IndiGo Miles",
        "IGM",
        "https://example.com/igm.png",
        owner.address,
        100
      );
    });

    it("should update brand metadata", async () => {
      await registry.updateBrand(
        0,
        "https://new-logo.com/igm.png",
        addr1.address,
        200
      );

      const brand = await registry.getBrand(0);
      
      expect(brand.logoURI).to.equal("https://new-logo.com/igm.png");
      expect(brand.operator).to.equal(addr1.address);
      expect(brand.pointsPerToken).to.equal(200);
    });

    it("should emit BrandUpdated event", async () => {
      const tx = await registry.updateBrand(0, "http://new.com", owner.address, 100);
      const receipt = await tx.wait();
      const event = receipt.logs.find((log: any) => log.eventName === "BrandUpdated");
      
      expect(event).to.exist;
      expect(event.args.brandId).to.equal(0);
    });

    it("should revert if brand not active", async () => {
      await registry.deactivateBrand(0);
      
      await expect(
        registry.updateBrand(0, "http://new.com", owner.address, 100)
      ).to.be.reverted;
    });
  });

  describe("deactivateBrand", () => {
    beforeEach(async () => {
      await registry.registerBrand(
        "IndiGo Miles",
        "IGM",
        "https://example.com/igm.png",
        owner.address,
        100
      );
    });

    it("should deactivate a brand", async () => {
      await registry.deactivateBrand(0);
      
      const brand = await registry.getBrand(0);
      expect(brand.active).to.equal(false);
    });

    it("should emit BrandDeactivated event", async () => {
      const tx = await registry.deactivateBrand(0);
      const receipt = await tx.wait();
      const event = receipt.logs.find((log: any) => log.eventName === "BrandDeactivated");
      
      expect(event).to.exist;
      expect(event.args.brandId).to.equal(0);
    });
  });

  describe("getAllBrands", () => {
    it("should return all registered brands", async () => {
      await registry.registerBrand("Brand 1", "B1", "http://b1.com", owner.address, 100);
      await registry.registerBrand("Brand 2", "B2", "http://b2.com", owner.address, 50);

      const brands = await registry.getAllBrands();
      
      expect(brands.length).to.equal(2);
      expect(brands[0].name).to.equal("Brand 1");
      expect(brands[1].name).to.equal("Brand 2");
    });

    it("should return empty array when no brands", async () => {
      const brands = await registry.getAllBrands();
      expect(brands.length).to.equal(0);
    });
  });

  describe("access control", () => {
    it("should allow owner to register brands", async () => {
      await registry.registerBrand("Brand 1", "B1", "http://b1.com", owner.address, 100);
      
      const brand = await registry.getBrand(0);
      expect(brand.name).to.equal("Brand 1");
    });

    it("should allow owner to update brands", async () => {
      await registry.registerBrand("Brand 1", "B1", "http://b1.com", owner.address, 100);
      await registry.updateBrand(0, "http://new.com", owner.address, 50);
      
      const brand = await registry.getBrand(0);
      expect(brand.logoURI).to.equal("http://new.com");
    });

    it("should allow owner to deactivate brands", async () => {
      await registry.registerBrand("Brand 1", "B1", "http://b1.com", owner.address, 100);
      await registry.deactivateBrand(0);
      
      const brand = await registry.getBrand(0);
      expect(brand.active).to.equal(false);
    });
  });
});
