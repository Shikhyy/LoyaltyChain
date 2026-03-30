# LoyaltyChain — RWA Demo Day Hackathon Build Guide
**Loyalty Points Tokenization Engine on BNB Chain**
Deadline: March 31, 2026 · Prize pool: $100,000 · Deploy target: BSC Mainnet/Testnet

---

## Table of Contents
1. [Project Overview & Pitch](#1-project-overview--pitch)
2. [Architecture](#2-architecture)
3. [Smart Contracts (Solidity)](#3-smart-contracts-solidity)
4. [Frontend (Next.js + wagmi)](#4-frontend-nextjs--wagmi)
5. [Hardhat Config & Deploy Scripts](#5-hardhat-config--deploy-scripts)
6. [OpenCode Prompts — Copy & Paste](#6-opencode-prompts--copy--paste)
7. [Submission Checklist](#7-submission-checklist)

---

## 1. Project Overview & Pitch

### One-liner
> LoyaltyChain converts siloed airline miles, hotel points, and retail rewards into freely tradeable ERC-1155 tokens on BNB Chain — unlocking a $700B frozen asset class.

### Problem
- 30 trillion loyalty points go unredeemed every year globally
- Points are locked to a single brand, expire silently, and have no secondary market
- Users cannot swap Airtel points for MakeMyTrip miles or sell them for stablecoins

### Solution
LoyaltyChain tokenizes loyalty points as on-chain RWA tokens:
- Brand operators mint their points as ERC-1155 tokens (e.g. 1 token = 100 IndiGo miles)
- Users hold tokens in any BNB Chain wallet
- Cross-brand swaps happen via an on-chain AMM-style swap pool
- Redemption is handled by a smart contract that burns tokens and emits a redemption event

### Why judges will love it
- BNB Chain explicitly lists loyalty points as a priority RWA use case
- No other hackathon team is building this
- Live demo is visually compelling (swap animation, portfolio view, redemption flow)
- Low regulatory friction — loyalty points are not securities in most jurisdictions
- $700B total addressable market with a clear path to real partnerships

---

## 2. Architecture

```
┌─────────────────────────────────────────────────────┐
│                    Frontend (Next.js)                │
│  Dashboard | Swap UI | Portfolio | Redeem Modal      │
└─────────────────┬───────────────────────────────────┘
                  │ wagmi / viem
┌─────────────────▼───────────────────────────────────┐
│              BNB Chain (BSC Testnet)                 │
│                                                      │
│  LoyaltyToken.sol     SwapPool.sol    Registry.sol   │
│  (ERC-1155 RWA)       (AMM swap)      (brand list)   │
└─────────────────────────────────────────────────────┘
```

**Contracts:**
- `LoyaltyToken.sol` — ERC-1155 multi-token. Each token ID = one loyalty brand. Operators can mint/burn.
- `SwapPool.sol` — Constant-product AMM (x*y=k) for cross-brand swaps. No external oracle needed.
- `LoyaltyRegistry.sol` — Stores brand metadata (name, logo URI, redemption rate, operator address).

**Frontend pages:**
- `/` — Dashboard: portfolio balances, recent swaps
- `/swap` — Token swap interface (brand A → brand B)
- `/redeem` — Burn tokens for a redemption code (off-chain fulfillment)
- `/admin` — Operator panel: mint tokens, update metadata

---

## 3. Smart Contracts (Solidity)

### 3.1 LoyaltyRegistry.sol

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title LoyaltyRegistry
 * @notice Stores metadata for each loyalty brand token.
 *         brandId maps to ERC-1155 token ID in LoyaltyToken.
 */
contract LoyaltyRegistry is Ownable {

    struct Brand {
        string  name;           // "IndiGo Miles"
        string  symbol;         // "IGM"
        string  logoURI;        // IPFS or HTTPS URI
        address operator;       // address allowed to mint this brand's tokens
        uint256 pointsPerToken; // how many real points = 1 on-chain token
        bool    active;
    }

    // brandId => Brand
    mapping(uint256 => Brand) public brands;
    uint256 public brandCount;

    event BrandRegistered(uint256 indexed brandId, string name, address operator);
    event BrandUpdated(uint256 indexed brandId);
    event BrandDeactivated(uint256 indexed brandId);

    constructor() Ownable(msg.sender) {}

    function registerBrand(
        string calldata name,
        string calldata symbol,
        string calldata logoURI,
        address operator,
        uint256 pointsPerToken
    ) external onlyOwner returns (uint256 brandId) {
        brandId = brandCount++;
        brands[brandId] = Brand({
            name: name,
            symbol: symbol,
            logoURI: logoURI,
            operator: operator,
            pointsPerToken: pointsPerToken,
            active: true
        });
        emit BrandRegistered(brandId, name, operator);
    }

    function updateBrand(
        uint256 brandId,
        string calldata logoURI,
        address operator,
        uint256 pointsPerToken
    ) external onlyOwner {
        Brand storage b = brands[brandId];
        require(b.active, "Brand not active");
        b.logoURI = logoURI;
        b.operator = operator;
        b.pointsPerToken = pointsPerToken;
        emit BrandUpdated(brandId);
    }

    function deactivateBrand(uint256 brandId) external onlyOwner {
        brands[brandId].active = false;
        emit BrandDeactivated(brandId);
    }

    function getBrand(uint256 brandId) external view returns (Brand memory) {
        return brands[brandId];
    }

    function getAllBrands() external view returns (Brand[] memory) {
        Brand[] memory result = new Brand[](brandCount);
        for (uint256 i = 0; i < brandCount; i++) {
            result[i] = brands[i];
        }
        return result;
    }
}
```

---

### 3.2 LoyaltyToken.sol

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./LoyaltyRegistry.sol";

/**
 * @title LoyaltyToken
 * @notice ERC-1155 token where each token ID = one loyalty brand.
 *         Token ID matches brandId in LoyaltyRegistry.
 *         Only registered brand operators can mint their brand's tokens.
 */
contract LoyaltyToken is ERC1155, Ownable {

    LoyaltyRegistry public immutable registry;

    // brandId => total supply
    mapping(uint256 => uint256) public totalSupply;

    // Redemption tracking
    struct Redemption {
        address user;
        uint256 brandId;
        uint256 amount;
        string  rewardCode;   // off-chain fulfillment code, emitted in event only
        uint256 timestamp;
    }

    event TokensMinted(uint256 indexed brandId, address indexed to, uint256 amount);
    event TokensBurned(uint256 indexed brandId, address indexed from, uint256 amount);
    event Redeemed(
        address indexed user,
        uint256 indexed brandId,
        uint256 amount,
        string rewardCode,
        uint256 timestamp
    );

    modifier onlyOperator(uint256 brandId) {
        LoyaltyRegistry.Brand memory b = registry.getBrand(brandId);
        require(b.active, "Brand not active");
        require(msg.sender == b.operator || msg.sender == owner(), "Not operator");
        _;
    }

    constructor(address registryAddress)
        ERC1155("")
        Ownable(msg.sender)
    {
        registry = LoyaltyRegistry(registryAddress);
    }

    /**
     * @notice Returns metadata URI for a token ID (brand).
     *         Falls back to registry logoURI for marketplace display.
     */
    function uri(uint256 brandId) public view override returns (string memory) {
        LoyaltyRegistry.Brand memory b = registry.getBrand(brandId);
        return b.logoURI;
    }

    /**
     * @notice Mint loyalty tokens for a user.
     *         Called by brand operator when user earns points off-chain.
     */
    function mint(
        address to,
        uint256 brandId,
        uint256 amount
    ) external onlyOperator(brandId) {
        _mint(to, brandId, amount, "");
        totalSupply[brandId] += amount;
        emit TokensMinted(brandId, to, amount);
    }

    /**
     * @notice Batch mint to multiple users at once (gas efficient for operators).
     */
    function batchMint(
        address[] calldata recipients,
        uint256 brandId,
        uint256[] calldata amounts
    ) external onlyOperator(brandId) {
        require(recipients.length == amounts.length, "Length mismatch");
        for (uint256 i = 0; i < recipients.length; i++) {
            _mint(recipients[i], brandId, amounts[i], "");
            totalSupply[brandId] += amounts[i];
            emit TokensMinted(brandId, recipients[i], amounts[i]);
        }
    }

    /**
     * @notice Redeem tokens: burn them and emit an event with a reward code.
     *         The reward code is generated off-chain and passed by the frontend.
     */
    function redeem(
        uint256 brandId,
        uint256 amount,
        string calldata rewardCode
    ) external {
        require(balanceOf(msg.sender, brandId) >= amount, "Insufficient balance");
        _burn(msg.sender, brandId, amount);
        totalSupply[brandId] -= amount;
        emit TokensBurned(brandId, msg.sender, amount);
        emit Redeemed(msg.sender, brandId, amount, rewardCode, block.timestamp);
    }

    /**
     * @notice Get balances for a user across all registered brands.
     */
    function getPortfolio(address user)
        external
        view
        returns (uint256[] memory brandIds, uint256[] memory balances)
    {
        uint256 count = registry.brandCount();
        brandIds = new uint256[](count);
        balances = new uint256[](count);
        for (uint256 i = 0; i < count; i++) {
            brandIds[i] = i;
            balances[i] = balanceOf(user, i);
        }
    }
}
```

---

### 3.3 SwapPool.sol

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./LoyaltyToken.sol";
import "./LoyaltyRegistry.sol";

/**
 * @title SwapPool
 * @notice Constant-product AMM (x*y=k) for swapping loyalty tokens cross-brand.
 *         Liquidity is seeded by the protocol. Fee is 0.3%.
 *
 * Each brand pair has an independent pool.
 * Pool key = keccak256(abi.encodePacked(min(brandA, brandB), max(brandA, brandB)))
 */
contract SwapPool is Ownable {

    LoyaltyToken public immutable loyaltyToken;
    LoyaltyRegistry public immutable registry;

    uint256 public constant FEE_BPS = 30; // 0.3%
    uint256 public constant BPS = 10000;

    struct Pool {
        uint256 reserveA;
        uint256 reserveB;
        uint256 brandA;
        uint256 brandB;
        bool    exists;
    }

    // poolKey => Pool
    mapping(bytes32 => Pool) public pools;

    event PoolCreated(uint256 indexed brandA, uint256 indexed brandB, bytes32 poolKey);
    event LiquidityAdded(bytes32 indexed poolKey, uint256 amountA, uint256 amountB);
    event Swapped(
        address indexed user,
        uint256 indexed fromBrand,
        uint256 indexed toBrand,
        uint256 amountIn,
        uint256 amountOut
    );

    constructor(address tokenAddress, address registryAddress)
        Ownable(msg.sender)
    {
        loyaltyToken = LoyaltyToken(tokenAddress);
        registry = LoyaltyRegistry(registryAddress);
    }

    function poolKey(uint256 brandA, uint256 brandB) public pure returns (bytes32) {
        (uint256 lo, uint256 hi) = brandA < brandB
            ? (brandA, brandB)
            : (brandB, brandA);
        return keccak256(abi.encodePacked(lo, hi));
    }

    /**
     * @notice Create a new swap pool for two brands.
     *         Owner seeds initial liquidity from treasury.
     */
    function createPool(
        uint256 brandA,
        uint256 brandB,
        uint256 seedA,
        uint256 seedB
    ) external onlyOwner {
        bytes32 key = poolKey(brandA, brandB);
        require(!pools[key].exists, "Pool exists");

        // Transfer seed liquidity from owner to this contract
        loyaltyToken.safeTransferFrom(msg.sender, address(this), brandA, seedA, "");
        loyaltyToken.safeTransferFrom(msg.sender, address(this), brandB, seedB, "");

        pools[key] = Pool({
            reserveA: seedA,
            reserveB: seedB,
            brandA: brandA,
            brandB: brandB,
            exists: true
        });

        emit PoolCreated(brandA, brandB, key);
        emit LiquidityAdded(key, seedA, seedB);
    }

    /**
     * @notice Add liquidity to an existing pool (owner only for demo).
     */
    function addLiquidity(
        uint256 brandA,
        uint256 brandB,
        uint256 amountA,
        uint256 amountB
    ) external onlyOwner {
        bytes32 key = poolKey(brandA, brandB);
        require(pools[key].exists, "Pool not found");

        loyaltyToken.safeTransferFrom(msg.sender, address(this), brandA, amountA, "");
        loyaltyToken.safeTransferFrom(msg.sender, address(this), brandB, amountB, "");

        Pool storage p = pools[key];
        p.reserveA += amountA;
        p.reserveB += amountB;

        emit LiquidityAdded(key, amountA, amountB);
    }

    /**
     * @notice Get expected output for a swap (no state change).
     */
    function getAmountOut(
        uint256 fromBrand,
        uint256 toBrand,
        uint256 amountIn
    ) public view returns (uint256 amountOut) {
        bytes32 key = poolKey(fromBrand, toBrand);
        Pool memory p = pools[key];
        require(p.exists, "Pool not found");

        (uint256 reserveIn, uint256 reserveOut) = fromBrand == p.brandA
            ? (p.reserveA, p.reserveB)
            : (p.reserveB, p.reserveA);

        uint256 amountInWithFee = amountIn * (BPS - FEE_BPS);
        amountOut = (amountInWithFee * reserveOut) /
                    (reserveIn * BPS + amountInWithFee);
    }

    /**
     * @notice Swap fromBrand tokens for toBrand tokens.
     * @param minAmountOut Slippage protection.
     */
    function swap(
        uint256 fromBrand,
        uint256 toBrand,
        uint256 amountIn,
        uint256 minAmountOut
    ) external {
        bytes32 key = poolKey(fromBrand, toBrand);
        Pool storage p = pools[key];
        require(p.exists, "Pool not found");

        uint256 amountOut = getAmountOut(fromBrand, toBrand, amountIn);
        require(amountOut >= minAmountOut, "Slippage exceeded");

        // Transfer fromBrand tokens from user to pool
        loyaltyToken.safeTransferFrom(msg.sender, address(this), fromBrand, amountIn, "");

        // Update reserves
        if (fromBrand == p.brandA) {
            p.reserveA += amountIn;
            p.reserveB -= amountOut;
        } else {
            p.reserveB += amountIn;
            p.reserveA -= amountOut;
        }

        // Transfer toBrand tokens to user
        loyaltyToken.safeTransferFrom(address(this), msg.sender, toBrand, amountOut, "");

        emit Swapped(msg.sender, fromBrand, toBrand, amountIn, amountOut);
    }

    /**
     * @notice Required by ERC-1155 to receive tokens.
     */
    function onERC1155Received(
        address, address, uint256, uint256, bytes calldata
    ) external pure returns (bytes4) {
        return this.onERC1155Received.selector;
    }

    function onERC1155BatchReceived(
        address, address, uint256[] calldata, uint256[] calldata, bytes calldata
    ) external pure returns (bytes4) {
        return this.onERC1155BatchReceived.selector;
    }
}
```

---

## 4. Frontend (Next.js + wagmi)

### 4.1 Project structure

```
loyaltychain-frontend/
├── app/
│   ├── layout.tsx
│   ├── page.tsx              ← Dashboard
│   ├── swap/page.tsx         ← Swap UI
│   ├── redeem/page.tsx       ← Redeem tokens
│   └── admin/page.tsx        ← Operator mint panel
├── components/
│   ├── WalletConnect.tsx
│   ├── PortfolioCard.tsx
│   ├── SwapWidget.tsx
│   ├── RedeemModal.tsx
│   └── BrandBadge.tsx
├── lib/
│   ├── contracts.ts          ← ABI + addresses
│   ├── wagmiConfig.ts        ← Chain config
│   └── mockBrands.ts         ← Seed data for demo
├── public/
│   └── brands/               ← Brand logos (PNG)
└── package.json
```

---

### 4.2 package.json

```json
{
  "name": "loyaltychain-frontend",
  "version": "1.0.0",
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start"
  },
  "dependencies": {
    "next": "^14.2.0",
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "@rainbow-me/rainbowkit": "^2.1.0",
    "wagmi": "^2.9.0",
    "viem": "^2.13.0",
    "@tanstack/react-query": "^5.28.0",
    "tailwindcss": "^3.4.0",
    "autoprefixer": "^10.4.0",
    "postcss": "^8.4.0"
  },
  "devDependencies": {
    "typescript": "^5.4.0",
    "@types/react": "^18.3.0",
    "@types/node": "^20.0.0"
  }
}
```

---

### 4.3 lib/wagmiConfig.ts

```typescript
import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { defineChain } from "viem";

export const bscTestnet = defineChain({
  id: 97,
  name: "BNB Smart Chain Testnet",
  nativeCurrency: { name: "tBNB", symbol: "tBNB", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://data-seed-prebsc-1-s1.binance.org:8545"] },
  },
  blockExplorers: {
    default: { name: "BscScan", url: "https://testnet.bscscan.com" },
  },
  testnet: true,
});

export const wagmiConfig = getDefaultConfig({
  appName: "LoyaltyChain",
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_ID || "demo",
  chains: [bscTestnet],
  ssr: true,
});
```

---

### 4.4 lib/contracts.ts

```typescript
// Update REGISTRY_ADDRESS, TOKEN_ADDRESS, SWAP_ADDRESS after deployment

export const ADDRESSES = {
  registry: process.env.NEXT_PUBLIC_REGISTRY_ADDRESS as `0x${string}`,
  token:    process.env.NEXT_PUBLIC_TOKEN_ADDRESS    as `0x${string}`,
  swap:     process.env.NEXT_PUBLIC_SWAP_ADDRESS     as `0x${string}`,
};

export const LOYALTY_TOKEN_ABI = [
  {
    name: "getPortfolio",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "user", type: "address" }],
    outputs: [
      { name: "brandIds", type: "uint256[]" },
      { name: "balances", type: "uint256[]" },
    ],
  },
  {
    name: "redeem",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "brandId", type: "uint256" },
      { name: "amount",  type: "uint256" },
      { name: "rewardCode", type: "string" },
    ],
    outputs: [],
  },
  {
    name: "setApprovalForAll",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "operator", type: "address" },
      { name: "approved", type: "bool" },
    ],
    outputs: [],
  },
  {
    name: "isApprovedForAll",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "account",  type: "address" },
      { name: "operator", type: "address" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
] as const;

export const SWAP_POOL_ABI = [
  {
    name: "getAmountOut",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "fromBrand", type: "uint256" },
      { name: "toBrand",   type: "uint256" },
      { name: "amountIn",  type: "uint256" },
    ],
    outputs: [{ name: "amountOut", type: "uint256" }],
  },
  {
    name: "swap",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "fromBrand",    type: "uint256" },
      { name: "toBrand",      type: "uint256" },
      { name: "amountIn",     type: "uint256" },
      { name: "minAmountOut", type: "uint256" },
    ],
    outputs: [],
  },
] as const;

export const REGISTRY_ABI = [
  {
    name: "getAllBrands",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "tuple[]",
        components: [
          { name: "name",          type: "string"  },
          { name: "symbol",        type: "string"  },
          { name: "logoURI",       type: "string"  },
          { name: "operator",      type: "address" },
          { name: "pointsPerToken",type: "uint256" },
          { name: "active",        type: "bool"    },
        ],
      },
    ],
  },
] as const;
```

---

### 4.5 lib/mockBrands.ts

```typescript
// Mock data for demo — replace with on-chain registry reads after deploy

export interface Brand {
  id: number;
  name: string;
  symbol: string;
  logo: string;      // color hex for placeholder avatar
  pointsPerToken: number;
  category: "airline" | "hotel" | "retail";
}

export const MOCK_BRANDS: Brand[] = [
  { id: 0, name: "IndiGo Miles",      symbol: "IGM", logo: "#0052CC", pointsPerToken: 100, category: "airline" },
  { id: 1, name: "Air India Points",  symbol: "AIP", logo: "#E63946", pointsPerToken: 100, category: "airline" },
  { id: 2, name: "OYO Rewards",       symbol: "OYO", logo: "#FF6B35", pointsPerToken: 50,  category: "hotel"   },
  { id: 3, name: "Taj InnerCircle",   symbol: "TAJ", logo: "#2D6A4F", pointsPerToken: 50,  category: "hotel"   },
  { id: 4, name: "Flipkart SuperCoins", symbol: "FKC", logo: "#FFB703", pointsPerToken: 10, category: "retail" },
  { id: 5, name: "Tata Neu Points",   symbol: "NEU", logo: "#8338EC", pointsPerToken: 10,  category: "retail"  },
];
```

---

### 4.6 app/layout.tsx

```typescript
"use client";
import "./globals.css";
import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RainbowKitProvider } from "@rainbow-me/rainbowkit";
import { wagmiConfig } from "@/lib/wagmiConfig";
import "@rainbow-me/rainbowkit/styles.css";

const queryClient = new QueryClient();

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-50 min-h-screen">
        <WagmiProvider config={wagmiConfig}>
          <QueryClientProvider client={queryClient}>
            <RainbowKitProvider>
              <nav className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-yellow-400 rounded-lg flex items-center justify-center font-bold text-sm">LC</div>
                  <span className="font-semibold text-gray-900">LoyaltyChain</span>
                  <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full">BSC Testnet</span>
                </div>
                <div className="flex items-center gap-6">
                  <a href="/"       className="text-sm text-gray-600 hover:text-gray-900">Portfolio</a>
                  <a href="/swap"   className="text-sm text-gray-600 hover:text-gray-900">Swap</a>
                  <a href="/redeem" className="text-sm text-gray-600 hover:text-gray-900">Redeem</a>
                  <a href="/admin"  className="text-sm text-gray-600 hover:text-gray-900">Admin</a>
                  <ConnectButton />
                </div>
              </nav>
              <main className="max-w-5xl mx-auto px-6 py-8">{children}</main>
            </RainbowKitProvider>
          </QueryClientProvider>
        </WagmiProvider>
      </body>
    </html>
  );
}

import { ConnectButton } from "@rainbow-me/rainbowkit";
```

---

### 4.7 app/page.tsx — Portfolio Dashboard

```typescript
"use client";
import { useAccount, useReadContract } from "wagmi";
import { ADDRESSES, LOYALTY_TOKEN_ABI, REGISTRY_ABI } from "@/lib/contracts";
import { MOCK_BRANDS } from "@/lib/mockBrands";
import { ConnectButton } from "@rainbow-me/rainbowkit";

export default function Dashboard() {
  const { address, isConnected } = useAccount();

  const { data: portfolio } = useReadContract({
    address: ADDRESSES.token,
    abi: LOYALTY_TOKEN_ABI,
    functionName: "getPortfolio",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  const balances: Record<number, bigint> = {};
  if (portfolio) {
    const [ids, bals] = portfolio;
    ids.forEach((id, i) => { balances[Number(id)] = bals[i]; });
  }

  // Fall back to mock data for demo
  const displayBrands = MOCK_BRANDS.map(b => ({
    ...b,
    balance: portfolio ? Number(balances[b.id] ?? 0n) : Math.floor(Math.random() * 500 + 50),
  }));

  const totalValueUSD = displayBrands.reduce((sum, b) => sum + b.balance * 0.01, 0);

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <div className="w-16 h-16 bg-yellow-400 rounded-2xl flex items-center justify-center text-2xl font-bold">LC</div>
        <h1 className="text-2xl font-semibold text-gray-900">Welcome to LoyaltyChain</h1>
        <p className="text-gray-500 text-center max-w-sm">
          Connect your wallet to view and manage your tokenized loyalty points on BNB Chain.
        </p>
        <ConnectButton />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900 mb-1">Your Portfolio</h1>
        <p className="text-gray-500 text-sm">Tokenized loyalty points across all brands</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-xs text-gray-500 mb-1">Total Value</p>
          <p className="text-2xl font-semibold text-gray-900">${totalValueUSD.toFixed(2)}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-xs text-gray-500 mb-1">Brands held</p>
          <p className="text-2xl font-semibold text-gray-900">
            {displayBrands.filter(b => b.balance > 0).length}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-xs text-gray-500 mb-1">Network</p>
          <p className="text-2xl font-semibold text-yellow-600">BSC</p>
        </div>
      </div>

      {/* Brand grid */}
      <div className="grid grid-cols-2 gap-4">
        {displayBrands.map(brand => (
          <div key={brand.id} className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
              style={{ backgroundColor: brand.logo }}
            >
              {brand.symbol}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-900 truncate">{brand.name}</p>
              <p className="text-xs text-gray-500">{brand.pointsPerToken} pts / token</p>
            </div>
            <div className="text-right">
              <p className="font-semibold text-gray-900">{brand.balance.toLocaleString()}</p>
              <p className="text-xs text-gray-500">${(brand.balance * 0.01).toFixed(2)}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

### 4.8 app/swap/page.tsx — Swap UI

```typescript
"use client";
import { useState } from "react";
import { useAccount, useReadContract, useWriteContract } from "wagmi";
import { parseUnits } from "viem";
import { ADDRESSES, SWAP_POOL_ABI, LOYALTY_TOKEN_ABI } from "@/lib/contracts";
import { MOCK_BRANDS } from "@/lib/mockBrands";

export default function SwapPage() {
  const { address } = useAccount();
  const [fromId, setFromId] = useState(0);
  const [toId, setToId]     = useState(1);
  const [amount, setAmount] = useState("");

  const amountBigInt = amount ? BigInt(Math.floor(parseFloat(amount))) : 0n;

  const { data: amountOut } = useReadContract({
    address: ADDRESSES.swap,
    abi: SWAP_POOL_ABI,
    functionName: "getAmountOut",
    args: [BigInt(fromId), BigInt(toId), amountBigInt],
    query: { enabled: amountBigInt > 0n },
  });

  const { writeContract: approve, isPending: approving } = useWriteContract();
  const { writeContract: doSwap, isPending: swapping }   = useWriteContract();

  function handleSwap() {
    if (!amountOut || !address) return;
    const minOut = (amountOut * 97n) / 100n; // 3% slippage tolerance
    doSwap({
      address: ADDRESSES.swap,
      abi: SWAP_POOL_ABI,
      functionName: "swap",
      args: [BigInt(fromId), BigInt(toId), amountBigInt, minOut],
    });
  }

  function handleApprove() {
    approve({
      address: ADDRESSES.token,
      abi: LOYALTY_TOKEN_ABI,
      functionName: "setApprovalForAll",
      args: [ADDRESSES.swap, true],
    });
  }

  const fromBrand = MOCK_BRANDS[fromId];
  const toBrand   = MOCK_BRANDS[toId];
  const rate = amountOut && amountBigInt > 0n
    ? (Number(amountOut) / Number(amountBigInt)).toFixed(3)
    : "—";

  return (
    <div className="max-w-md mx-auto">
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">Swap Points</h1>

      <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">

        {/* From */}
        <div className="bg-gray-50 rounded-xl p-4">
          <p className="text-xs text-gray-500 mb-2">From</p>
          <div className="flex items-center gap-3">
            <select
              value={fromId}
              onChange={e => setFromId(Number(e.target.value))}
              className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm font-medium"
            >
              {MOCK_BRANDS.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
            <input
              type="number"
              placeholder="0"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              className="flex-1 text-right text-2xl font-semibold bg-transparent outline-none"
            />
          </div>
        </div>

        {/* Arrow */}
        <div className="flex justify-center">
          <button
            onClick={() => { setFromId(toId); setToId(fromId); }}
            className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-200"
          >
            ↕
          </button>
        </div>

        {/* To */}
        <div className="bg-gray-50 rounded-xl p-4">
          <p className="text-xs text-gray-500 mb-2">To</p>
          <div className="flex items-center gap-3">
            <select
              value={toId}
              onChange={e => setToId(Number(e.target.value))}
              className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm font-medium"
            >
              {MOCK_BRANDS.filter(b => b.id !== fromId).map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
            <div className="flex-1 text-right text-2xl font-semibold text-gray-400">
              {amountOut ? Number(amountOut).toLocaleString() : "0"}
            </div>
          </div>
        </div>

        {/* Rate */}
        {amount && (
          <div className="text-xs text-gray-500 text-center">
            1 {fromBrand.symbol} = {rate} {toBrand.symbol} · 0.3% fee
          </div>
        )}

        {/* Buttons */}
        <button
          onClick={handleApprove}
          disabled={approving}
          className="w-full py-3 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-200 disabled:opacity-50"
        >
          {approving ? "Approving…" : "1. Approve SwapPool"}
        </button>
        <button
          onClick={handleSwap}
          disabled={swapping || !amount || fromId === toId}
          className="w-full py-3 bg-yellow-400 text-yellow-900 rounded-xl text-sm font-semibold hover:bg-yellow-500 disabled:opacity-40"
        >
          {swapping ? "Swapping…" : `2. Swap ${fromBrand.symbol} → ${toBrand.symbol}`}
        </button>
      </div>
    </div>
  );
}
```

---

### 4.9 app/redeem/page.tsx — Redeem Tokens

```typescript
"use client";
import { useState } from "react";
import { useAccount, useWriteContract } from "wagmi";
import { ADDRESSES, LOYALTY_TOKEN_ABI } from "@/lib/contracts";
import { MOCK_BRANDS } from "@/lib/mockBrands";

function generateRewardCode(brandSymbol: string, amount: number): string {
  const random = Math.random().toString(36).substring(2, 10).toUpperCase();
  return `${brandSymbol}-${amount}-${random}`;
}

export default function RedeemPage() {
  const { address } = useAccount();
  const [brandId, setBrandId] = useState(0);
  const [amount, setAmount]   = useState("");
  const [code, setCode]       = useState<string | null>(null);

  const { writeContract, isPending, isSuccess } = useWriteContract();

  function handleRedeem() {
    const rewardCode = generateRewardCode(
      MOCK_BRANDS[brandId].symbol,
      Number(amount)
    );
    setCode(rewardCode);
    writeContract({
      address: ADDRESSES.token,
      abi: LOYALTY_TOKEN_ABI,
      functionName: "redeem",
      args: [BigInt(brandId), BigInt(Math.floor(parseFloat(amount))), rewardCode],
    });
  }

  const brand = MOCK_BRANDS[brandId];

  return (
    <div className="max-w-md mx-auto">
      <h1 className="text-2xl font-semibold text-gray-900 mb-2">Redeem Points</h1>
      <p className="text-gray-500 text-sm mb-6">
        Burn your tokens to receive a redemption code. Present the code to the brand for rewards.
      </p>

      {isSuccess && code ? (
        <div className="bg-green-50 border border-green-200 rounded-2xl p-6 text-center space-y-3">
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto text-green-600 text-xl">✓</div>
          <p className="font-semibold text-green-900">Redemption successful!</p>
          <div className="bg-white rounded-xl border border-green-200 p-4">
            <p className="text-xs text-gray-500 mb-1">Your redemption code</p>
            <p className="font-mono text-lg font-bold text-gray-900 tracking-wider">{code}</p>
          </div>
          <p className="text-xs text-gray-500">
            Present this code at any {brand.name} partner location or app.
            This transaction is recorded on BNB Chain.
          </p>
          <button
            onClick={() => { setCode(null); setAmount(""); }}
            className="text-sm text-green-700 underline"
          >
            Redeem more
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
          <div>
            <label className="text-xs text-gray-500 block mb-1">Brand</label>
            <select
              value={brandId}
              onChange={e => setBrandId(Number(e.target.value))}
              className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm"
            >
              {MOCK_BRANDS.map(b => (
                <option key={b.id} value={b.id}>{b.name} ({b.symbol})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Amount of tokens</label>
            <input
              type="number"
              placeholder="e.g. 100"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm"
            />
            {amount && (
              <p className="text-xs text-gray-400 mt-1">
                = {(parseFloat(amount) * brand.pointsPerToken).toLocaleString()} real {brand.name} points
              </p>
            )}
          </div>
          <button
            onClick={handleRedeem}
            disabled={isPending || !amount || !address}
            className="w-full py-3 bg-yellow-400 text-yellow-900 rounded-xl font-semibold text-sm hover:bg-yellow-500 disabled:opacity-40"
          >
            {isPending ? "Processing…" : "Redeem & get code"}
          </button>
        </div>
      )}
    </div>
  );
}
```

---

### 4.10 app/admin/page.tsx — Operator Mint Panel

```typescript
"use client";
import { useState } from "react";
import { useWriteContract } from "wagmi";
import { ADDRESSES } from "@/lib/contracts";
import { MOCK_BRANDS } from "@/lib/mockBrands";

const MINT_ABI = [{
  name: "mint",
  type: "function" as const,
  stateMutability: "nonpayable" as const,
  inputs: [
    { name: "to",      type: "address" },
    { name: "brandId", type: "uint256" },
    { name: "amount",  type: "uint256" },
  ],
  outputs: [],
}];

export default function AdminPage() {
  const [to, setTo]         = useState("");
  const [brandId, setBrandId] = useState(0);
  const [amount, setAmount]  = useState("");

  const { writeContract, isPending, isSuccess } = useWriteContract();

  function handleMint() {
    writeContract({
      address: ADDRESSES.token,
      abi: MINT_ABI,
      functionName: "mint",
      args: [to as `0x${string}`, BigInt(brandId), BigInt(Math.floor(parseFloat(amount)))],
    });
  }

  return (
    <div className="max-w-md mx-auto">
      <h1 className="text-2xl font-semibold text-gray-900 mb-2">Operator Panel</h1>
      <p className="text-gray-500 text-sm mb-6">Mint loyalty tokens to a user address. Only registered operators can mint their brand's tokens.</p>

      <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
        <div>
          <label className="text-xs text-gray-500 block mb-1">Recipient address</label>
          <input
            placeholder="0x..."
            value={to}
            onChange={e => setTo(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm font-mono"
          />
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1">Brand</label>
          <select
            value={brandId}
            onChange={e => setBrandId(Number(e.target.value))}
            className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm"
          >
            {MOCK_BRANDS.map(b => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1">Amount of tokens</label>
          <input
            type="number"
            placeholder="e.g. 500"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm"
          />
        </div>
        {isSuccess && (
          <p className="text-sm text-green-600 bg-green-50 rounded-lg px-3 py-2">Tokens minted successfully!</p>
        )}
        <button
          onClick={handleMint}
          disabled={isPending || !to || !amount}
          className="w-full py-3 bg-yellow-400 text-yellow-900 rounded-xl font-semibold text-sm hover:bg-yellow-500 disabled:opacity-40"
        >
          {isPending ? "Minting…" : "Mint tokens"}
        </button>
      </div>
    </div>
  );
}
```

---

## 5. Hardhat Config & Deploy Scripts

### 5.1 hardhat.config.ts

```typescript
import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";
dotenv.config();

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.20",
    settings: { optimizer: { enabled: true, runs: 200 } },
  },
  networks: {
    bscTestnet: {
      url: "https://data-seed-prebsc-1-s1.binance.org:8545",
      chainId: 97,
      accounts: [process.env.PRIVATE_KEY as string],
    },
    bscMainnet: {
      url: "https://bsc-dataseed.binance.org",
      chainId: 56,
      accounts: [process.env.PRIVATE_KEY as string],
    },
  },
  etherscan: {
    apiKey: { bscTestnet: process.env.BSCSCAN_API_KEY as string },
  },
};

export default config;
```

---

### 5.2 scripts/deploy.ts

```typescript
import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with:", deployer.address);

  // 1. Deploy Registry
  const Registry = await ethers.getContractFactory("LoyaltyRegistry");
  const registry = await Registry.deploy();
  await registry.waitForDeployment();
  console.log("LoyaltyRegistry:", await registry.getAddress());

  // 2. Deploy Token
  const Token = await ethers.getContractFactory("LoyaltyToken");
  const token = await Token.deploy(await registry.getAddress());
  await token.waitForDeployment();
  console.log("LoyaltyToken:", await token.getAddress());

  // 3. Deploy SwapPool
  const SwapPool = await ethers.getContractFactory("SwapPool");
  const swapPool = await SwapPool.deploy(
    await token.getAddress(),
    await registry.getAddress()
  );
  await swapPool.waitForDeployment();
  console.log("SwapPool:", await swapPool.getAddress());

  // 4. Register demo brands
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

  // 5. Mint demo tokens to deployer for demo purposes
  for (let i = 0; i < brands.length; i++) {
    const tx = await token.mint(deployer.address, i, 10000n);
    await tx.wait();
    console.log(`Minted 10000 brand ${i} tokens`);
  }

  // 6. Approve SwapPool and seed pools
  const approvalTx = await token.setApprovalForAll(await swapPool.getAddress(), true);
  await approvalTx.wait();

  // Seed IGM <-> AIP pool
  const pool1 = await swapPool.createPool(0, 1, 5000n, 5000n);
  await pool1.wait();
  console.log("Seeded IGM <-> AIP pool");

  // Seed OYO <-> TAJ pool
  const pool2 = await swapPool.createPool(2, 3, 5000n, 5000n);
  await pool2.wait();
  console.log("Seeded OYO <-> TAJ pool");

  // Seed FKC <-> NEU pool
  const pool3 = await swapPool.createPool(4, 5, 5000n, 5000n);
  await pool3.wait();
  console.log("Seeded FKC <-> NEU pool");

  console.log("\n--- COPY THESE TO .env.local ---");
  console.log(`NEXT_PUBLIC_REGISTRY_ADDRESS=${await registry.getAddress()}`);
  console.log(`NEXT_PUBLIC_TOKEN_ADDRESS=${await token.getAddress()}`);
  console.log(`NEXT_PUBLIC_SWAP_ADDRESS=${await swapPool.getAddress()}`);
}

main().catch(console.error);
```

---

### 5.3 .env (contracts) — DO NOT COMMIT

```
PRIVATE_KEY=your_wallet_private_key_here
BSCSCAN_API_KEY=your_bscscan_api_key_here
```

### 5.4 .env.local (frontend)

```
NEXT_PUBLIC_WALLETCONNECT_ID=your_walletconnect_project_id
NEXT_PUBLIC_REGISTRY_ADDRESS=0x...
NEXT_PUBLIC_TOKEN_ADDRESS=0x...
NEXT_PUBLIC_SWAP_ADDRESS=0x...
```

---

## 6. OpenCode Prompts — Copy & Paste

Use these prompts directly in OpenCode (or Claude Code CLI) to scaffold, extend, and debug the project fast.

---

### Prompt 1 — Scaffold the entire contracts project

```
Create a Hardhat TypeScript project with three Solidity contracts:
1. LoyaltyRegistry.sol — stores brand metadata (name, symbol, logoURI, operator, pointsPerToken, active flag)
2. LoyaltyToken.sol — ERC-1155 where each token ID = a brand. Only operators can mint. Has redeem() that burns tokens and emits a Redeemed event with a reward code.
3. SwapPool.sol — constant-product AMM (x*y=k) for swapping between brand tokens. 0.3% fee. Accepts ERC-1155 via onERC1155Received.

Install: @openzeppelin/contracts, hardhat, @nomicfoundation/hardhat-toolbox, dotenv, typescript.
Target Solidity 0.8.20, optimizer on.
Add hardhat.config.ts with BSC Testnet (chainId 97) and BSC Mainnet (chainId 56) network configs.
Read PRIVATE_KEY from .env.
```

---

### Prompt 2 — Create the deploy script

```
Write a Hardhat deploy script at scripts/deploy.ts that:
1. Deploys LoyaltyRegistry, LoyaltyToken(registryAddress), SwapPool(tokenAddress, registryAddress) in order
2. Registers 6 demo brands: IndiGo Miles (IGM), Air India Points (AIP), OYO Rewards (OYO), Taj InnerCircle (TAJ), Flipkart SuperCoins (FKC), Tata Neu Points (NEU) — deployer is operator for all
3. Mints 10000 of each brand token to the deployer address
4. Sets approval for SwapPool to manage deployer's tokens
5. Creates and seeds 3 swap pools: IGM<->AIP, OYO<->TAJ, FKC<->NEU with 5000 tokens each side
6. Logs all three deployed contract addresses at the end in NEXT_PUBLIC_ format
```

---

### Prompt 3 — Scaffold the Next.js frontend

```
Create a Next.js 14 app with TypeScript and Tailwind CSS for a loyalty points tokenization dapp called LoyaltyChain.

Use wagmi v2, viem, @rainbow-me/rainbowkit for wallet connection. Target BNB Chain Testnet (chainId 97).

Pages needed:
- / : Portfolio dashboard showing user's token balances per brand as cards
- /swap : Swap widget to exchange tokens between brands. Show exchange rate from getAmountOut read.
- /redeem : Form to burn tokens and display a generated redemption code on success
- /admin : Simple form to mint tokens to an address (operator only)

Shared nav with wallet connect button. Yellow (#FFB703) as primary accent color.
Read contract addresses from NEXT_PUBLIC_* env vars.
Include a mockBrands array with the 6 brands as fallback when wallet not connected.
```

---

### Prompt 4 — Add a swap quote preview

```
In the /swap page, add a live quote preview component that:
1. Debounces the amount input by 300ms
2. Calls getAmountOut on the SwapPool contract using useReadContract
3. Shows: estimated output amount, exchange rate (1 fromBrand = X toBrand), price impact percentage, minimum received (with 1% slippage tolerance)
4. Shows a loading skeleton while fetching
5. Shows "No pool found for this pair" if the read reverts

Keep the UI clean — just a small gray box below the swap inputs.
```

---

### Prompt 5 — Write Hardhat tests

```
Write Hardhat tests (TypeScript, ethers v6) for all three contracts covering:

LoyaltyRegistry:
- registerBrand emits BrandRegistered and stores correct data
- non-owner cannot register brands
- deactivateBrand sets active=false

LoyaltyToken:
- operator can mint tokens
- non-operator cannot mint
- redeem burns tokens and emits Redeemed with rewardCode
- getPortfolio returns all brand balances

SwapPool:
- createPool stores reserves correctly
- getAmountOut returns correct x*y=k calculation with 0.3% fee
- swap transfers correct amounts and updates reserves
- swap reverts if slippage threshold not met
- swap reverts for non-existent pool
```

---

### Prompt 6 — Add BscScan verification

```
In the deploy script, after deploying each contract, add hardhat-etherscan verification calls:
  await hre.run("verify:verify", { address: contractAddress, constructorArguments: [...] });

Also add a separate scripts/verify.ts that reads deployed addresses from a JSON file (deployed.json) and re-runs verification — useful if the initial deploy verification fails due to rate limits.

Add a "verify" npm script to package.json.
```

---

### Prompt 7 — Add transaction history feed

```
In the portfolio dashboard (/), add a "Recent activity" section below the brand cards.
Use wagmi's useWatchContractEvent to listen for:
- Swapped events from SwapPool
- Redeemed events from LoyaltyToken  
- TokensMinted events from LoyaltyToken

Display the last 10 events as a feed with: event type badge (swap/redeem/mint), from/to brand names, amount, and time ago (e.g. "2 min ago").

Keep it live — new events should appear at the top without page refresh.
```

---

### Prompt 8 — Mobile responsive layout

```
Make the LoyaltyChain frontend fully mobile responsive:
- Nav: collapse links into a hamburger menu on screens <768px, keep wallet connect button visible
- Portfolio grid: 1 column on mobile, 2 columns on tablet+
- Swap widget: already single column, just ensure inputs are full width and font sizes are readable (min 16px to prevent iOS zoom)
- Add a bottom tab bar on mobile with icons for: Portfolio, Swap, Redeem
- Remove the top nav links on mobile (replaced by bottom tabs)

Use Tailwind responsive prefixes only (sm:, md:, lg:). No custom CSS.
```

---

## 7. Submission Checklist

### Before submitting to DoraHacks

- [ ] Contracts deployed on BSC Testnet (or Mainnet for extra points)
- [ ] All three contract addresses verified on BscScan testnet
- [ ] Frontend deployed to Vercel or Netlify (free tier)
- [ ] GitHub repo is public with clear README
- [ ] Demo video recorded (2 min max) — show: connect wallet → view portfolio → swap → redeem
- [ ] DoraHacks BUIDL page filled: title, description, logo, GitHub link, demo link, team members
- [ ] Tag your submission with: #RWA #BNBChain #LoyaltyPoints #Tokenization

### Demo script (for 2-min video)

1. **0:00–0:20** — Problem slide or verbal intro: "30 trillion loyalty points go unredeemed every year"
2. **0:20–0:40** — Connect MetaMask, show portfolio with 6 brand balances
3. **0:40–1:10** — Go to /swap, swap IndiGo Miles → Air India Points, confirm txn, show updated balances
4. **1:10–1:40** — Go to /redeem, redeem OYO Rewards, show the generated code on screen
5. **1:40–2:00** — Show BscScan txn explorer with the Redeemed event, mention BNB Chain deploy

### Pitch talking points

- Total addressable market: $700B in unredeemed loyalty points globally
- BNB Chain explicitly lists this as a priority RWA category
- No regulatory barrier — loyalty points are not securities
- B2B2C model: partner with brands as operators (easy enterprise pitch)
- Revenue model: 0.3% swap fee accruing to the protocol treasury
- Roadmap: cross-chain bridges, yield on staked points, DAO governance for fee params

---

*Built for RWA Demo Day · DoraHacks · April 2026*
*Deploy on BNB Chain for prize eligibility*
