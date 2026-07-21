import { run, network } from 'hardhat';
import * as fs from 'fs';
import * as path from 'path';

async function main() {
  console.log(`Starting contract verification on network: ${network.name}`);

  const deploymentsDir = path.join(__dirname, '..', 'deployments');
  const deploymentFiles = fs.readdirSync(deploymentsDir).filter(f => f.endsWith('.json'));

  if (deploymentFiles.length === 0) {
    console.error('No deployment record files found in contracts/deployments/');
    process.exit(1);
  }

  // Find the deployment file for the active network
  const activeFile = deploymentFiles.find(f => f.startsWith(network.name)) || deploymentFiles[0];
  const deploymentPath = path.join(deploymentsDir, activeFile);
  const deployment = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));

  const contracts = deployment.contracts;
  console.log('Verifying deployed contracts:', contracts);

  // 1. VaultRegistry
  try {
    console.log(`\nVerifying VaultRegistry at ${contracts.VaultRegistry}...`);
    await run('verify:verify', {
      address: contracts.VaultRegistry,
      constructorArguments: [],
    });
  } catch (err: any) {
    console.log('VaultRegistry verification output:', err.message);
  }

  // 2. AttestationAggregator
  try {
    console.log(`\nVerifying AttestationAggregator at ${contracts.AttestationAggregator}...`);
    await run('verify:verify', {
      address: contracts.AttestationAggregator,
      constructorArguments: [],
    });
  } catch (err: any) {
    console.log('AttestationAggregator verification output:', err.message);
  }

  // 3. MemoryMarket
  try {
    console.log(`\nVerifying MemoryMarket at ${contracts.MemoryMarket}...`);
    await run('verify:verify', {
      address: contracts.MemoryMarket,
      constructorArguments: [contracts.USDC, deployment.deployer],
    });
  } catch (err: any) {
    console.log('MemoryMarket verification output:', err.message);
  }

  // 4. DeletionProver
  try {
    console.log(`\nVerifying DeletionProver at ${contracts.DeletionProver}...`);
    await run('verify:verify', {
      address: contracts.DeletionProver,
      constructorArguments: [],
    });
  } catch (err: any) {
    console.log('DeletionProver verification output:', err.message);
  }

  console.log('\n=== VERIFICATION SUMMARY COMPLETE ===');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
