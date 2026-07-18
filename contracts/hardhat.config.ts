import { HardhatUserConfig } from 'hardhat/config';
import '@nomicfoundation/hardhat-toolbox';
import * as dotenv from 'dotenv';
dotenv.config({ path: '../.env' });

const config: HardhatUserConfig = {
  solidity: {
    version: '0.8.24',
    settings: {
      evmVersion: 'cancun',
      optimizer: {
        enabled: true,
        runs: 200,
      },
      viaIR: true,
    },
  },
  networks: {
    hardhat: {
      chainId: 31337,
    },
    monadDevnet: {
      url: process.env.MONAD_RPC_URL ?? 'https://rpc-devnet.monad.xyz',
      chainId: 41454,
      accounts: process.env.MONAD_PRIVATE_KEY ? [process.env.MONAD_PRIVATE_KEY] : [],
    },
    monadTestnet: {
      url: 'https://testnet-rpc.monad.xyz',
      chainId: 10143,
      accounts: process.env.MONAD_PRIVATE_KEY ? [process.env.MONAD_PRIVATE_KEY] : [],
    },
    monadMainnet: {
      url: 'https://rpc.monad.xyz',
      chainId: 41454,
      accounts: process.env.MONAD_PRIVATE_KEY ? [process.env.MONAD_PRIVATE_KEY] : [],
    },
  },
  gasReporter: {
    enabled: true,
    currency: 'USD',
  },
  paths: {
    sources: './contracts',
    tests: './test',
    cache: './cache',
    artifacts: './artifacts',
  },
  etherscan: {
    apiKey: {
      monadTestnet: 'empty',
    },
    customChains: [
      {
        network: 'monadTestnet',
        chainId: 10143,
        urls: {
          apiURL: 'https://testnet-api.monadscan.com/api',
          browserURL: 'https://testnet.monadscan.com',
        },
      },
    ],
  },
};

export default config;
