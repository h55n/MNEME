import { expect } from 'chai';
import { ethers } from 'hardhat';
import type { VaultRegistry, AttestationAggregator, MemoryMarket, DeletionProver, MockERC20 } from '../typechain-types';

describe('MNEME Smart Contracts', () => {
  let vaultRegistry: VaultRegistry;
  let attestationAggregator: AttestationAggregator;
  let memoryMarket: MemoryMarket;
  let deletionProver: DeletionProver;
  let mockUsdc: MockERC20;

  let deployer: any, operator: any, buyer: any;

  beforeEach(async () => {
    [deployer, operator, buyer] = await ethers.getSigners();

    const VaultRegistry = await ethers.getContractFactory('VaultRegistry');
    vaultRegistry = await VaultRegistry.deploy();

    const AttestationAggregator = await ethers.getContractFactory('AttestationAggregator');
    attestationAggregator = await AttestationAggregator.deploy();

    const MockERC20 = await ethers.getContractFactory('MockERC20');
    mockUsdc = await MockERC20.deploy('USD Coin', 'USDC', 6);

    const MemoryMarket = await ethers.getContractFactory('MemoryMarket');
    memoryMarket = await MemoryMarket.deploy(await mockUsdc.getAddress(), deployer.address);

    const DeletionProver = await ethers.getContractFactory('DeletionProver');
    deletionProver = await DeletionProver.deploy();
  });

  // ── VaultRegistry ─────────────────────────────────────────────────────────

  describe('VaultRegistry', () => {
    it('should register a vault with valid signature', async () => {
      const did = 'did:monad:testnet:0x' + operator.address.slice(2);
      const serviceEndpoint = 'https://api.mneme.dev/v1';
      const messageHash = ethers.keccak256(
        ethers.AbiCoder.defaultAbiCoder().encode(
          ['string', 'address', 'string'],
          [did, operator.address, serviceEndpoint]
        )
      );
      // Use solidityPackedKeccak256 for abi.encodePacked
      const packedHash = ethers.solidityPackedKeccak256(
        ['string', 'address', 'string'],
        [did, operator.address, serviceEndpoint]
      );
      const signature = await operator.signMessage(ethers.getBytes(packedHash));

      const tx = await vaultRegistry.connect(operator).registerVault(
        did, operator.address, serviceEndpoint, signature
      );
      const receipt = await tx.wait();
      expect(receipt?.status).to.equal(1);
      expect(await vaultRegistry.totalVaults()).to.equal(1);
    });

    it('should reject duplicate DID registration', async () => {
      const did = 'did:monad:testnet:0xdeadbeef';
      const serviceEndpoint = 'https://api.mneme.dev/v1';
      const packedHash = ethers.solidityPackedKeccak256(
        ['string', 'address', 'string'],
        [did, operator.address, serviceEndpoint]
      );
      const signature = await operator.signMessage(ethers.getBytes(packedHash));

      await vaultRegistry.connect(operator).registerVault(did, operator.address, serviceEndpoint, signature);

      await expect(
        vaultRegistry.connect(operator).registerVault(did, operator.address, serviceEndpoint, signature)
      ).to.be.revertedWithCustomError(vaultRegistry, 'VaultAlreadyExists');
    });

    it('should reject invalid DID format', async () => {
      const invalidDid = 'invalid-did-format';
      const sig = '0x' + '00'.repeat(65);
      await expect(
        vaultRegistry.registerVault(invalidDid, operator.address, '', sig)
      ).to.be.revertedWithCustomError(vaultRegistry, 'InvalidDID');
    });
  });

  // ── AttestationAggregator ─────────────────────────────────────────────────

  describe('AttestationAggregator', () => {
    it('should batch attest memory operations', async () => {
      const vaultIds = [ethers.id('vault-1'), ethers.id('vault-2')];
      const contentHashes = [ethers.id('hash-1'), ethers.id('hash-2')];
      const stateHashes = [ethers.id('state-1'), ethers.id('state-2')];
      const opTypes = [0, 0]; // WRITE
      const timestamps = [Math.floor(Date.now() / 1000), Math.floor(Date.now() / 1000)];

      const tx = await attestationAggregator.batchAttest(
        vaultIds, contentHashes, stateHashes, opTypes, timestamps
      );
      const receipt = await tx.wait();
      expect(receipt?.status).to.equal(1);
      expect(await attestationAggregator.batchCounter()).to.equal(1);
    });

    it('should verify an attested hash', async () => {
      const vaultId = ethers.id('vault-1');
      const contentHash = ethers.id('content-1');
      const stateHash = ethers.id('state-1');

      await attestationAggregator.batchAttest(
        [vaultId], [contentHash], [stateHash], [0], [Math.floor(Date.now() / 1000)]
      );

      const [exists, blockNum] = await attestationAggregator.verify(vaultId, contentHash);
      expect(exists).to.be.true;
      expect(blockNum).to.be.gt(0);
    });

    it('should reject empty batch', async () => {
      await expect(
        attestationAggregator.batchAttest([], [], [], [], [])
      ).to.be.revertedWithCustomError(attestationAggregator, 'EmptyBatch');
    });

    it('should reject unauthorised submitter', async () => {
      await expect(
        attestationAggregator.connect(buyer).batchAttest(
          [ethers.id('v')], [ethers.id('h')], [ethers.id('s')], [0], [1]
        )
      ).to.be.revertedWithCustomError(attestationAggregator, 'NotAuthorisedSubmitter');
    });
  });

  // ── MemoryMarket ──────────────────────────────────────────────────────────

  describe('MemoryMarket', () => {
    const PRICE = ethers.parseUnits('10', 6); // $10 USDC

    beforeEach(async () => {
      // Mint USDC to buyer
      await mockUsdc.connect(deployer).mint(buyer.address, ethers.parseUnits('1000', 6));
    });

    it('should list a memory pack', async () => {
      const contentHash = ethers.id('pack-content');
      const provenanceHash = ethers.id('pack-provenance');

      const tx = await memoryMarket.connect(operator).listPack(
        contentHash, provenanceHash, PRICE, 500, 'legal', 'Legal Pack', 'ipfs://...'
      );
      const receipt = await tx.wait();
      expect(receipt?.status).to.equal(1);
      expect(await memoryMarket.packCounter()).to.equal(1);
    });

    it('should allow purchasing a listed pack', async () => {
      const contentHash = ethers.id('pack-content');
      const provenanceHash = ethers.id('pack-provenance');

      await memoryMarket.connect(operator).listPack(
        contentHash, provenanceHash, PRICE, 500, 'legal', 'Legal Pack', 'ipfs://...'
      );

      // Approve USDC
      await mockUsdc.connect(buyer).approve(await memoryMarket.getAddress(), PRICE);

      const tx = await memoryMarket.connect(buyer).purchasePack(1);
      const receipt = await tx.wait();
      expect(receipt?.status).to.equal(1);

      // Check seller pending withdrawal (80%)
      const sellerPending = await memoryMarket.pendingWithdrawals(operator.address);
      expect(sellerPending).to.equal((PRICE * 8000n) / 10000n);
    });

    it('should reject double purchase', async () => {
      const contentHash = ethers.id('pack-content');
      await memoryMarket.connect(operator).listPack(
        contentHash, ethers.id('prov'), PRICE, 100, 'coding', 'Coding Pack', ''
      );

      await mockUsdc.connect(buyer).approve(await memoryMarket.getAddress(), PRICE * 2n);
      await memoryMarket.connect(buyer).purchasePack(1);

      await expect(
        memoryMarket.connect(buyer).purchasePack(1)
      ).to.be.revertedWithCustomError(memoryMarket, 'AlreadyPurchased');
    });

    it('should allow seller to withdraw revenue', async () => {
      await memoryMarket.connect(operator).listPack(
        ethers.id('h'), ethers.id('p'), PRICE, 100, 'finance', 'Finance Pack', ''
      );
      await mockUsdc.connect(buyer).approve(await memoryMarket.getAddress(), PRICE);
      await memoryMarket.connect(buyer).purchasePack(1);

      const balanceBefore = await mockUsdc.balanceOf(operator.address);
      await memoryMarket.connect(operator).withdrawRevenue();
      const balanceAfter = await mockUsdc.balanceOf(operator.address);

      const expectedPayout = (PRICE * 8000n) / 10000n;
      expect(balanceAfter - balanceBefore).to.equal(expectedPayout);
    });
  });

  // ── DeletionProver ────────────────────────────────────────────────────────

  describe('DeletionProver', () => {
    it('should record a GDPR deletion proof', async () => {
      const vaultId = ethers.id('vault-test');

      // Register vault operator (admin call)
      await deletionProver.connect(deployer).registerVaultOperator(vaultId, operator.address);

      const deletedHashes = [ethers.id('mem-1'), ethers.id('mem-2')];
      const gdprBasis = 'Article 17 - Right to Erasure';
      const userIdentifier = 'user-anon-abc123';

      // Build the hashes bytes — concatenate bytes32 values (matching _encodeHashes in contract)
      // abi.encodePacked(bytes32[]) = concatenation of bytes32 values
      const encodedHashes = ethers.concat(deletedHashes.map(h => ethers.getBytes(h)));

      // Match contract: keccak256(abi.encodePacked(vaultId, encodedHashes, gdprBasis, userIdentifier))
      // using solidityPackedKeccak256 which is equivalent to keccak256(abi.encodePacked(...))
      const messageHash = ethers.solidityPackedKeccak256(
        ['bytes32', 'bytes', 'string', 'string'],
        [vaultId, encodedHashes, gdprBasis, userIdentifier]
      );
      const signature = await operator.signMessage(ethers.getBytes(messageHash));

      const tx = await deletionProver.connect(operator).proveDeletion(
        vaultId, deletedHashes, gdprBasis, userIdentifier, signature
      );
      const receipt = await tx.wait();
      expect(receipt?.status).to.equal(1);

      // Verify deletion recorded
      expect(await deletionProver.isDeleted(deletedHashes[0])).to.be.true;
      expect(await deletionProver.isDeleted(deletedHashes[1])).to.be.true;
      expect(await deletionProver.deletionCounter()).to.equal(1);
    });
  });
});
