import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with:", deployer.address);

  const Registry = await ethers.getContractFactory("LoyaltyRegistry");
  const registry = await Registry.deploy();
  await registry.waitForDeployment();
  console.log("LoyaltyRegistry:", await registry.getAddress());

  const Token = await ethers.getContractFactory("LoyaltyToken");
  const token = await Token.deploy(await registry.getAddress());
  await token.waitForDeployment();
  console.log("LoyaltyToken:", await token.getAddress());

  const SwapPool = await ethers.getContractFactory("SwapPool");
  const swapPool = await SwapPool.deploy(
    await token.getAddress(),
    await registry.getAddress(),
    deployer.address
  );
  await swapPool.waitForDeployment();
  console.log("SwapPool:", await swapPool.getAddress());

  const brands = [
    { name: "IndiGo Miles",        symbol: "IGM", logo: "https://example.com/igm.png", pts: 100 },
    { name: "Air India Points",    symbol: "AIP", logo: "https://example.com/aip.png", pts: 100 },
    { name: "OYO Rewards",         symbol: "OYO", logo: "https://example.com/oyo.png", pts: 50  },
    { name: "Taj InnerCircle",     symbol: "TAJ", logo: "https://example.com/taj.png", pts: 50  },
    { name: "Flipkart SuperCoins", symbol: "FKC", logo: "https://example.com/fkc.png", pts: 10  },
    { name: "Tata Neu Points",     symbol: "NEU", logo: "https://example.com/neu.png", pts: 10  },
  ];

  for (const b of brands) {
    const tx = await registry.registerBrand(b.name, b.symbol, b.logo, deployer.address, b.pts);
    await tx.wait();
    console.log(`Registered brand: ${b.name}`);
  }

  for (let i = 0; i < brands.length; i++) {
    const tx = await token.mint(deployer.address, i, 10000n);
    await tx.wait();
    console.log(`Minted 10000 brand ${i} tokens`);
  }

  const approvalTx = await token.setApprovalForAll(await swapPool.getAddress(), true);
  await approvalTx.wait();

  const pool1 = await swapPool.createPool(0, 1, 5000n, 5000n);
  await pool1.wait();
  console.log("Seeded IGM <-> AIP pool");

  const pool2 = await swapPool.createPool(2, 3, 5000n, 5000n);
  await pool2.wait();
  console.log("Seeded OYO <-> TAJ pool");

  const pool3 = await swapPool.createPool(4, 5, 5000n, 5000n);
  await pool3.wait();
  console.log("Seeded FKC <-> NEU pool");

  console.log("\n--- COPY THESE TO .env.local ---");
  console.log(`NEXT_PUBLIC_REGISTRY_ADDRESS=${await registry.getAddress()}`);
  console.log(`NEXT_PUBLIC_TOKEN_ADDRESS=${await token.getAddress()}`);
  console.log(`NEXT_PUBLIC_SWAP_ADDRESS=${await swapPool.getAddress()}`);
}

main().catch(console.error);
