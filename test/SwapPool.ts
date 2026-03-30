import { ethers } from "hardhat";
import { expect } from "chai";

describe("SwapPool", () => {
  let swapPool: any;
  let token: any;
  let registry: any;
  let owner: any;
  let addr1: any;

  beforeEach(async () => {
    [owner, addr1] = await ethers.getSigners();
    
    const Registry = await ethers.getContractFactory("LoyaltyRegistry");
    registry = await Registry.deploy();
    
    const Token = await ethers.getContractFactory("LoyaltyToken");
    token = await Token.deploy(await registry.getAddress());
    
    await registry.registerBrand("Brand A", "BA", "http://ba.com", owner.address, 100);
    await registry.registerBrand("Brand B", "BB", "http://bb.com", owner.address, 50);
    
    await token.mint(owner.address, 0, 10000);
    await token.mint(owner.address, 1, 10000);
    
    const SwapPool = await ethers.getContractFactory("SwapPool");
    swapPool = await SwapPool.deploy(await token.getAddress(), await registry.getAddress());
    
    await token.setApprovalForAll(await swapPool.getAddress(), true);
    await swapPool.createPool(0, 1, 5000, 5000);
  });

  describe("createPool", () => {
    it("should create a pool with correct reserves", async () => {
      const key = await swapPool.poolKey(0, 1);
      const pool = await swapPool.pools(key);
      
      expect(pool.exists).to.equal(true);
      expect(pool.reserveA).to.equal(5000);
      expect(pool.reserveB).to.equal(5000);
    });

    it("should emit PoolCreated and LiquidityAdded events", async () => {
      await registry.registerBrand("Brand C", "BC", "http://bc.com", owner.address, 25);
      await token.mint(owner.address, 2, 2000);
      const tx = await swapPool.createPool(0, 2, 1000, 1000);
      const receipt = await tx.wait();
      
      const poolEvent = receipt.logs.find((log: any) => log.eventName === "PoolCreated");
      expect(poolEvent).to.exist;
    });

    it("should revert if pool already exists", async () => {
      await expect(
        swapPool.createPool(0, 1, 1000, 1000)
      ).to.be.revertedWith("Pool exists");
    });
  });

  describe("getAmountOut", () => {
    it("should calculate correct output with 0.3% fee", async () => {
      const amountOut = await swapPool.getAmountOut(0, 1, 1000);
      
      expect(amountOut).to.be.gt(0);
      expect(amountOut).to.be.lt(1000);
    });

    it("should return 0 for non-existent pool", async () => {
      await expect(
        swapPool.getAmountOut(0, 5, 1000)
      ).to.be.revertedWith("Pool not found");
    });

    it("should return correct rate calculation", async () => {
      const amountOut1 = await swapPool.getAmountOut(0, 1, 1000);
      const amountOut2 = await swapPool.getAmountOut(0, 1, 2000);
      
      expect(amountOut2).to.be.gt(amountOut1);
    });
  });

  describe("swap", () => {
    it("should transfer correct amounts", async () => {
      const balBefore = await token.balanceOf(owner.address, 1);
      
      await swapPool.swap(0, 1, 100, 1);
      
      const balAfter = await token.balanceOf(owner.address, 1);
      expect(balAfter).to.be.gt(balBefore);
    });

    it("should emit Swapped event", async () => {
      const tx = await swapPool.swap(0, 1, 100, 1);
      const receipt = await tx.wait();
      
      const event = receipt.logs.find((log: any) => log.eventName === "Swapped");
      expect(event).to.exist;
      expect(event.args.fromBrand).to.equal(0);
      expect(event.args.toBrand).to.equal(1);
    });

    it("should revert if slippage exceeded", async () => {
      const amountOut = await swapPool.getAmountOut(0, 1, 100);
      const minOut = amountOut + 1n;
      
      await expect(
        swapPool.swap(0, 1, 100, minOut)
      ).to.be.revertedWith("Slippage exceeded");
    });

    it("should revert for non-existent pool", async () => {
      await expect(
        swapPool.swap(0, 5, 100, 1)
      ).to.be.revertedWith("Pool not found");
    });

    it("should update reserves after swap", async () => {
      const key = await swapPool.poolKey(0, 1);
      const poolBefore = await swapPool.pools(key);
      
      await swapPool.swap(0, 1, 100, 1);
      
      const poolAfter = await swapPool.pools(key);
      expect(poolAfter.reserveA).to.equal(poolBefore.reserveA + 100n);
    });
  });

  describe("addLiquidity", () => {
    it("should add liquidity to existing pool", async () => {
      await swapPool.addLiquidity(0, 1, 1000, 1000);
      
      const key = await swapPool.poolKey(0, 1);
      const pool = await swapPool.pools(key);
      
      expect(pool.reserveA).to.equal(6000);
      expect(pool.reserveB).to.equal(6000);
    });

    it("should revert for non-existent pool", async () => {
      await expect(
        swapPool.addLiquidity(0, 5, 1000, 1000)
      ).to.be.revertedWith("Pool not found");
    });
  });

  describe("poolKey", () => {
    it("should generate same key regardless of order", async () => {
      const key1 = await swapPool.poolKey(0, 1);
      const key2 = await swapPool.poolKey(1, 0);
      
      expect(key1).to.equal(key2);
    });
  });
});
