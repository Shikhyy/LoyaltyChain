import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";
dotenv.config();

const privateKey = process.env.PRIVATE_KEY;
const hasPrivateKey = privateKey && privateKey.length === 64;

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.25",
    settings: { optimizer: { enabled: true, runs: 200 }, evmVersion: "cancun" },
  },
  networks: {
    hardhat: {},
    ...(hasPrivateKey ? {
      bscTestnet: {
        url: "https://data-seed-prebsc-1-s1.binance.org:8545",
        chainId: 97,
        accounts: [privateKey],
      },
      bscMainnet: {
        url: "https://bsc-dataseed.binance.org",
        chainId: 56,
        accounts: [privateKey],
      },
    } : {}),
  },
  etherscan: {
    apiKey: { bscTestnet: process.env.BSCSCAN_API_KEY as string },
  },
};

export default config;
