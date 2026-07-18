// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title AttestationAggregator
 * @notice Stores batched cryptographic fingerprints of memory operations.
 *         Raw content never touches this contract — only SHA-256 hashes.
 *         Enables tamper-proof audit trail at minimal gas cost on Monad.
 */
contract AttestationAggregator is Ownable, ReentrancyGuard {

    // -------------------------------------------------------------------------
    // Enums & Structs
    // -------------------------------------------------------------------------

    enum OperationType { WRITE, UPDATE, DELETE, EXPORT }

    struct AttestationBatch {
        uint256 batchId;
        bytes32[] vaultIds;
        bytes32[] contentHashes;
        bytes32[] stateHashes;
        OperationType[] operationTypes;
        uint256[] timestamps;
        uint256 submittedAt;
        address submitter;
    }

    struct AttestationRecord {
        bytes32 vaultId;
        bytes32 contentHash;
        bytes32 stateHash;
        OperationType operationType;
        uint256 timestamp;
        uint256 batchId;
        uint256 blockNumber;
    }

    // -------------------------------------------------------------------------
    // State
    // -------------------------------------------------------------------------

    uint256 public batchCounter;

    // vaultId => array of attestation records
    mapping(bytes32 => AttestationRecord[]) private _vaultAttestations;

    // contentHash => batchId (for quick lookup)
    mapping(bytes32 => uint256) public contentHashToBatch;

    // Authorised submitters (attestation service wallets)
    mapping(address => bool) public authorisedSubmitters;

    // -------------------------------------------------------------------------
    // Events
    // -------------------------------------------------------------------------

    event BatchAttested(
        uint256 indexed batchId,
        uint256 attestationCount,
        address indexed submitter,
        uint256 timestamp
    );

    event SubmitterAuthorised(address indexed submitter, bool authorised);

    // -------------------------------------------------------------------------
    // Errors
    // -------------------------------------------------------------------------

    error NotAuthorisedSubmitter(address caller);
    error EmptyBatch();
    error BatchSizeMismatch();
    error BatchTooLarge(uint256 size, uint256 maxSize);

    // -------------------------------------------------------------------------
    // Constants
    // -------------------------------------------------------------------------

    uint256 public constant MAX_BATCH_SIZE = 200;

    // -------------------------------------------------------------------------
    // Constructor
    // -------------------------------------------------------------------------

    constructor() Ownable(msg.sender) {
        authorisedSubmitters[msg.sender] = true;
    }

    // -------------------------------------------------------------------------
    // Admin
    // -------------------------------------------------------------------------

    function setSubmitterAuthorisation(address submitter, bool authorised) external onlyOwner {
        authorisedSubmitters[submitter] = authorised;
        emit SubmitterAuthorised(submitter, authorised);
    }

    // -------------------------------------------------------------------------
    // Core Attestation
    // -------------------------------------------------------------------------

    /**
     * @notice Submit a batch of memory operation attestations.
     * @param vaultIds      Array of vault identifiers
     * @param contentHashes SHA-256 hashes of encrypted memory content
     * @param stateHashes   SHA-256 hashes of full vault state post-operation
     * @param operationTypes WRITE | UPDATE | DELETE | EXPORT per operation
     * @param timestamps    Unix timestamps of each operation
     * @return batchId      Identifier for this batch
     */
    function batchAttest(
        bytes32[] calldata vaultIds,
        bytes32[] calldata contentHashes,
        bytes32[] calldata stateHashes,
        uint8[] calldata operationTypes,
        uint256[] calldata timestamps
    ) external nonReentrant returns (uint256 batchId) {
        if (!authorisedSubmitters[msg.sender]) revert NotAuthorisedSubmitter(msg.sender);
        if (vaultIds.length == 0) revert EmptyBatch();
        if (vaultIds.length > MAX_BATCH_SIZE) revert BatchTooLarge(vaultIds.length, MAX_BATCH_SIZE);
        if (
            contentHashes.length != vaultIds.length ||
            stateHashes.length != vaultIds.length ||
            operationTypes.length != vaultIds.length ||
            timestamps.length != vaultIds.length
        ) revert BatchSizeMismatch();

        batchId = ++batchCounter;

        for (uint256 i = 0; i < vaultIds.length; i++) {
            AttestationRecord memory record = AttestationRecord({
                vaultId: vaultIds[i],
                contentHash: contentHashes[i],
                stateHash: stateHashes[i],
                operationType: OperationType(operationTypes[i]),
                timestamp: timestamps[i],
                batchId: batchId,
                blockNumber: block.number
            });

            _vaultAttestations[vaultIds[i]].push(record);
            contentHashToBatch[contentHashes[i]] = batchId;
        }

        emit BatchAttested(batchId, vaultIds.length, msg.sender, block.timestamp);
    }

    // -------------------------------------------------------------------------
    // Verification
    // -------------------------------------------------------------------------

    /**
     * @notice Verify that a content hash was attested for a vault.
     * @return exists  Whether the attestation exists
     * @return blockNumber  Block when it was attested (0 if not found)
     */
    function verify(
        bytes32 vaultId,
        bytes32 contentHash
    ) external view returns (bool exists, uint256 blockNumber) {
        AttestationRecord[] storage records = _vaultAttestations[vaultId];
        for (uint256 i = 0; i < records.length; i++) {
            if (records[i].contentHash == contentHash) {
                return (true, records[i].blockNumber);
            }
        }
        return (false, 0);
    }

    /**
     * @notice Get all attestations for a vault (paginated).
     */
    function getVaultAttestations(
        bytes32 vaultId,
        uint256 offset,
        uint256 limit
    ) external view returns (AttestationRecord[] memory records, uint256 total) {
        AttestationRecord[] storage all = _vaultAttestations[vaultId];
        total = all.length;

        if (offset >= total) {
            return (new AttestationRecord[](0), total);
        }

        uint256 end = offset + limit;
        if (end > total) end = total;
        uint256 size = end - offset;

        records = new AttestationRecord[](size);
        for (uint256 i = 0; i < size; i++) {
            records[i] = all[offset + i];
        }
    }

    /**
     * @notice Get total attestation count for a vault.
     */
    function getVaultAttestationCount(bytes32 vaultId) external view returns (uint256) {
        return _vaultAttestations[vaultId].length;
    }
}
