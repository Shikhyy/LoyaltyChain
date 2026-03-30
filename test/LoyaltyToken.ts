import { ethers } from "hardhat";
import { expect } from "chai";

describe("LoyaltyToken", () => {
  let token: any;
  let registry: any;
  let owner: any;
  let addr1: any;
  let addr2: any;

  beforeEach(async () => {
    [owner, addr1, addr2] = await ethers.getSigners();
    
    const Registry = await ethers.getContractFactory("LoyaltyRegistry");
    registry = await Registry.deploy();
    
    const Token = await ethers.getContractFactory("LoyaltyToken");
    token = await Token.deploy(await registry.getAddress());
    
    await registry.registerBrand("IndiGo Miles", "IGM", "http://igm.com", owner.address, 100);
    await registry.registerBrand("Air India Points", "AIP", "http://aip.com", owner.address, 100);
  });

  describe("mint", () => {
    it("should allow operator to mint tokens", async () => {
      const tx = await token.mint(addr1.address, 0, 1000);
      await tx.wait();
      
      const balance = await token.balanceOf(addr1.address, 0);
      expect(balance).to.equal(1000);
    });

    it("should emit TokensMinted event", async () => {
      const tx = await token.mint(addr1.address, 0, 1000);
      const receipt = await tx.wait();
      const event = receipt.logs.find((log: any) => log.eventName === "TokensMinted");
      
      expect(event).to.exist;
      expect(event.args.brandId).to.equal(0);
      expect(event.args.to).to.equal(addr1.address);
      expect(event.args.amount).to.equal(1000);
    });

    it("should update totalSupply", async () => {
      await token.mint(addr1.address, 0, 1000);
      
      const supply = await token.totalSupply(0);
      expect(supply).to.equal(1000);
    });

    it("should revert if non-operator tries to mint", async () => {
      await expect(
        token.connect(addr1).mint(addr2.address, 0, 1000)
      ).to.be.reverted;
    });
  });

  describe("batchMint", () => {
    it("should mint to multiple recipients", async () => {
      await token.batchMint([addr1.address, addr2.address], 0, [500, 500]);
      
      expect(await token.balanceOf(addr1.address, 0)).to.equal(500);
      expect(await token.balanceOf(addr2.address, 0)).to.equal(500);
    });

    it("should revert if arrays length mismatch", async () => {
      await expect(
        token.batchMint([addr1.address], 0, [500, 500])
      ).to.be.reverted;
    });
  });

  describe("redeem", () => {
    beforeEach(async () => {
      await token.mint(addr1.address, 0, 1000);
    });

    it("should burn tokens and emit Redeemed event", async () => {
      const tx = await token.connect(addr1).redeem(0, 500, "REWARD-123");
      const receipt = await tx.wait();
      
      const burnEvent = receipt.logs.find((log: any) => log.eventName === "TokensBurned");
      const redeemEvent = receipt.logs.find((log: any) => log.eventName === "Redeemed");
      
      expect(burnEvent).to.exist;
      expect(redeemEvent).to.exist;
      expect(redeemEvent.args.rewardCode).to.equal("REWARD-123");
      
      const balance = await token.balanceOf(addr1.address, 0);
      expect(balance).to.equal(500);
    });

    it("should revert if insufficient balance", async () => {
      await expect(
        token.connect(addr1).redeem(0, 2000, "REWARD-123")
      ).to.be.revertedWith("Insufficient balance");
    });

    it("should decrease totalSupply on redeem", async () => {
      await token.connect(addr1).redeem(0, 500, "REWARD-123");
      
      const supply = await token.totalSupply(0);
      expect(supply).to.equal(500);
    });
  });

  describe("getPortfolio", () => {
    it("should return all brand balances for a user", async () => {
      await token.mint(addr1.address, 0, 100);
      await token.mint(addr1.address, 1, 200);
      
      const [ids, balances] = await token.getPortfolio(addr1.address);
      
      expect(ids.length).to.equal(2);
      expect(balances[0]).to.equal(100);
      expect(balances[1]).to.equal(200);
    });

    it("should return zero for brands with no balance", async () => {
      await token.mint(addr1.address, 0, 100);
      
      const [ids, balances] = await token.getPortfolio(addr1.address);
      
      expect(balances[1]).to.equal(0);
    });
  });

  describe("uri", () => {
    it("should return logoURI from registry", async () => {
      const tokenUri = await token.uri(0);
      expect(tokenUri).to.equal("http://igm.com");
    });
  });
});
