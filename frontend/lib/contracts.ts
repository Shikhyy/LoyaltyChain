export const ADDRESSES = {
  registry: (process.env.NEXT_PUBLIC_REGISTRY_ADDRESS || "0x0000000000000000000000000000000000000000") as `0x${string}`,
  token:    (process.env.NEXT_PUBLIC_TOKEN_ADDRESS    || "0x0000000000000000000000000000000000000000") as `0x${string}`,
  swap:     (process.env.NEXT_PUBLIC_SWAP_ADDRESS     || "0x0000000000000000000000000000000000000000") as `0x${string}`,
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
          { name: "active",         type: "bool"    },
        ],
      },
    ],
  },
] as const;
