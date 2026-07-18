// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

/**
 * @title DeletionProver
 * @notice Immutable GDPR-compliant deletion proof registry.
 *         Records cryptographic tombstones when memory is erased,
 *         enabling operators to prove deletion to regulators.
 */
contract DeletionProver is Ownable, ReentrancyGuard {
    using ECDSA for bytes32;

    // -------------------------------------------------------------------------
    // Structs
    // -------------------------------------------------------------------------

    struct DeletionRecord {
        bytes32 vaultId;
        bytes32 tombstoneHash;       // Hash of deleted content hashes
        bytes32[] deletedHashes;     // Individual content hashes deleted
        address operator;
        uint256 deletedAt;
        string gdprBasis;            // e.g. "Article 17 - Right to Erasure"
        string userIdentifier;       // Anonymised user reference (not PII)
        uint256 blockNumber;
    }

    // -------------------------------------------------------------------------
    // State
    // -------------------------------------------------------------------------

    uint256 public deletionCounter;
    mapping(uint256 => DeletionRecord) public deletions;
    mapping(bytes32 => uint256[]) public vaultDeletions;   // vaultId => deletionIds
    mapping(bytes32 => bool) public deletedHashes;          // contentHash => deleted

    // Authorised operators (on-chain verification)
    mapping(bytes32 => address) public vaultOperators;      // vaultId => operator

    // -------------------------------------------------------------------------
    // Events
    // -------------------------------------------------------------------------

    event DeletionProved(
        uint256 indexed deletionId,
        bytes32 indexed vaultId,
        bytes32 tombstoneHash,
        address indexed operator,
        uint256 deletedAt,
        string gdprBasis
    );

    event VaultOperatorRegistered(bytes32 indexed vaultId, address indexed operator);

    // -------------------------------------------------------------------------
    // Errors
    // -------------------------------------------------------------------------

    error NotVaultOperator(bytes32 vaultId, address caller);
    error HashAlreadyDeleted(bytes32 contentHash);
    error EmptyDeletion();
    error VaultNotRegistered(bytes32 vaultId);
    error InvalidSignature();

    // -------------------------------------------------------------------------
    // Constructor
    // -------------------------------------------------------------------------

    constructor() Ownable(msg.sender) {}

    // -------------------------------------------------------------------------
    // Operator Registration (called by VaultRegistry via service)
    // -------------------------------------------------------------------------

    function registerVaultOperator(bytes32 vaultId, address operator) external onlyOwner {
        vaultOperators[vaultId] = operator;
        emit VaultOperatorRegistered(vaultId, operator);
    }

    // -------------------------------------------------------------------------
    // Deletion Proof
    // -------------------------------------------------------------------------

    /**
     * @notice Record a GDPR deletion proof on-chain.
     * @param vaultId          Vault from which content was deleted
     * @param deletedContentHashes Array of SHA-256 content hashes that were deleted
     * @param gdprBasis        Legal basis for deletion (e.g. "Article 17")
     * @param userIdentifier   Anonymised reference to the data subject (NOT PII)
     * @param operatorSig      Operator signature over the deletion data
     * @return deletionId      Proof identifier
     */
    function proveDeletion(
        bytes32 vaultId,
        bytes32[] calldata deletedContentHashes,
        string calldata gdprBasis,
        string calldata userIdentifier,
        bytes calldata operatorSig
    ) external nonReentrant returns (uint256 deletionId) {
        address operator = vaultOperators[vaultId];
        if (operator == address(0)) revert VaultNotRegistered(vaultId);
        if (deletedContentHashes.length == 0) revert EmptyDeletion();

        // Verify operator signature
        bytes32 messageHash = keccak256(abi.encodePacked(
            vaultId, _encodeHashes(deletedContentHashes), gdprBasis, userIdentifier
        ));
        bytes32 ethSignedHash = MessageHashUtils.toEthSignedMessageHash(messageHash);
        address signer = ECDSA.recover(ethSignedHash, operatorSig);
        if (signer != operator) revert InvalidSignature();

        // Check for double-deletion
        for (uint256 i = 0; i < deletedContentHashes.length; i++) {
            if (deletedHashes[deletedContentHashes[i]]) {
                revert HashAlreadyDeleted(deletedContentHashes[i]);
            }
        }

        // Compute tombstone hash (hash of all deleted hashes)
        bytes32 tombstoneHash = keccak256(abi.encodePacked(_encodeHashes(deletedContentHashes)));

        deletionId = ++deletionCounter;

        // Record each hash as deleted
        for (uint256 i = 0; i < deletedContentHashes.length; i++) {
            deletedHashes[deletedContentHashes[i]] = true;
        }

        deletions[deletionId] = DeletionRecord({
            vaultId: vaultId,
            tombstoneHash: tombstoneHash,
            deletedHashes: deletedContentHashes,
            operator: operator,
            deletedAt: block.timestamp,
            gdprBasis: gdprBasis,
            userIdentifier: userIdentifier,
            blockNumber: block.number
        });

        vaultDeletions[vaultId].push(deletionId);

        emit DeletionProved(deletionId, vaultId, tombstoneHash, operator, block.timestamp, gdprBasis);
    }

    // -------------------------------------------------------------------------
    // Verification
    // -------------------------------------------------------------------------

    function isDeleted(bytes32 contentHash) external view returns (bool) {
        return deletedHashes[contentHash];
    }

    function getDeletion(uint256 deletionId) external view returns (DeletionRecord memory) {
        return deletions[deletionId];
    }

    function getVaultDeletions(bytes32 vaultId) external view returns (uint256[] memory) {
        return vaultDeletions[vaultId];
    }

    // -------------------------------------------------------------------------
    // Internal
    // -------------------------------------------------------------------------

    function _encodeHashes(bytes32[] calldata hashes) internal pure returns (bytes memory) {
        bytes memory encoded;
        for (uint256 i = 0; i < hashes.length; i++) {
            encoded = abi.encodePacked(encoded, hashes[i]);
        }
        return encoded;
    }
}
