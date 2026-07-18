import { ethers } from 'hardhat';
import * as fs from 'fs';
import * as path from 'path';

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log('Deploying MNEME contracts with account:', deployer.address);
  console.log('Account balance:', (await ethers.provider.getBalance(deployer.address)).toString());

  const network = await ethers.provider.getNetwork();
  console.log('Network:', network.name, 'chainId:', network.chainId);

  // -------------------------------------------------------------------------
  // Deploy VaultRegistry
  // -------------------------------------------------------------------------
  console.log('\n[1/4] Deploying VaultRegistry...');
  const VaultRegistry = await ethers.getContractFactory('VaultRegistry');
  const vaultRegistry = await VaultRegistry.deploy();
  await vaultRegistry.waitForDeployment();
  const vaultRegistryAddress = await vaultRegistry.getAddress();
  console.log('VaultRegistry deployed to:', vaultRegistryAddress);

  // -------------------------------------------------------------------------
  // Deploy AttestationAggregator
  // -------------------------------------------------------------------------
  console.log('\n[2/4] Deploying AttestationAggregator...');
  const AttestationAggregator = await ethers.getContractFactory('AttestationAggregator');
  const attestationAggregator = await AttestationAggregator.deploy();
  await attestationAggregator.waitForDeployment();
  const attestationAggregatorAddress = await attestationAggregator.getAddress();
  console.log('AttestationAggregator deployed to:', attestationAggregatorAddress);

  // -------------------------------------------------------------------------
  // Deploy MemoryMarket (requires USDC token address)
  // -------------------------------------------------------------------------
  console.log('\n[3/4] Deploying MemoryMarket...');
  // On devnet/testnet: deploy a mock USDC; on mainnet: use real USDC
  let usdcAddress = process.env.USDC_TOKEN_ADDRESS;
  if (!usdcAddress) {
    console.log('  No USDC address — deploying MockUSDC for testnet...');
    const MockERC20 = await ethers.getContractFactory('MockERC20');
    const mockUsdc = await MockERC20.deploy('USD Coin', 'USDC', 6);
    await mockUsdc.waitForDeployment();
    usdcAddress = await mockUsdc.getAddress();
    console.log('  MockUSDC deployed to:', usdcAddress);
  }

  const platformTreasury = deployer.address; // Update in production
  const MemoryMarket = await ethers.getContractFactory('MemoryMarket');
  const memoryMarket = await MemoryMarket.deploy(usdcAddress, platformTreasury);
  await memoryMarket.waitForDeployment();
  const memoryMarketAddress = await memoryMarket.getAddress();
  console.log('MemoryMarket deployed to:', memoryMarketAddress);

  // -------------------------------------------------------------------------
  // Deploy DeletionProver
  // -------------------------------------------------------------------------
  console.log('\n[4/4] Deploying DeletionProver...');
  const DeletionProver = await ethers.getContractFactory('DeletionProver');
  const deletionProver = await DeletionProver.deploy();
  await deletionProver.waitForDeployment();
  const deletionProverAddress = await deletionProver.getAddress();
  console.log('DeletionProver deployed to:', deletionProverAddress);

  // -------------------------------------------------------------------------
  // Authorise attestation service wallet
  // -------------------------------------------------------------------------
  if (process.env.ATTESTATION_SERVICE_ADDRESS) {
    console.log('\nAuthorising attestation service...');
    await attestationAggregator.setSubmitterAuthorisation(
      process.env.ATTESTATION_SERVICE_ADDRESS,
      true
    );
    console.log('Authorised:', process.env.ATTESTATION_SERVICE_ADDRESS);
  }

  // -------------------------------------------------------------------------
  // Write deployment addresses
  // -------------------------------------------------------------------------
  const deployment = {
    network: network.name,
    chainId: network.chainId.toString(),
    deployer: deployer.address,
    deployedAt: new Date().toISOString(),
    contracts: {
      VaultRegistry: vaultRegistryAddress,
      AttestationAggregator: attestationAggregatorAddress,
      MemoryMarket: memoryMarketAddress,
      DeletionProver: deletionProverAddress,
      USDC: usdcAddress,
    },
  };

  const outputDir = path.join(__dirname, '..', 'deployments');
  fs.mkdirSync(outputDir, { recursive: true });
  const outputFile = path.join(outputDir, `${network.name}-${network.chainId}.json`);
  fs.writeFileSync(outputFile, JSON.stringify(deployment, null, 2));
  console.log('\nDeployment addresses written to:', outputFile);
  console.log('\n=== DEPLOYMENT COMPLETE ===');
  console.log(JSON.stringify(deployment.contracts, null, 2));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
