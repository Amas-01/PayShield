import type { HardhatUserConfig } from "hardhat/config";
import "@cofhe/hardhat-plugin";
import "@nomicfoundation/hardhat-toolbox";
import "hardhat-gas-reporter";
import "dotenv/config";
import "./tasks/fund-payroll";
import "./tasks/process-payout";

const ARBITRUM_SEPOLIA_RPC_URL =
  process.env.ARBITRUM_SEPOLIA_RPC_URL || "https://sepolia-rollup.arbitrum.io/rpc";
const PRIVATE_KEY = process.env.PRIVATE_KEY || "";

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.28",
    settings: {
      evmVersion: "cancun",
    },
  },
  gasReporter: {
    enabled: true,
    currency: "USD",
    gasPrice: 21,
    outputFile: "gas-report.txt",
    noColors: true,
  },
  networks: {
    arbitrumSepolia: {
      url: ARBITRUM_SEPOLIA_RPC_URL,
      chainId: 421614,
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
    },
  },
};

export default config;
