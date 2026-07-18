// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

/**
 * @title VaultRegistry
 * @notice Sovereign memory vault registry — maps DIDs to operator addresses.
 *         Operators own their vaults; MNEME never holds signing keys.
 */
contract VaultRegistry is Ownable, ReentrancyGuard {
    using ECDSA for bytes32;

    // -------------------------------------------------------------------------
    // Structs
    // -------------------------------------------------------------------------

    struct Vault {
        string did;                // W3C DID: did:monad:<network>:<address>
        address operator;          // Owner of this vault
        uint256 createdAt;
        uint256 destroyedAt;       // 0 if active
        string serviceEndpoint;    // MNEME API endpoint
        bool exists;
    }

    // -------------------------------------------------------------------------
    // State
    // -------------------------------------------------------------------------

    mapping(bytes32 => Vault) public vaults;          // vaultId => Vault
    mapping(string => bytes32) public didToVaultId;   // DID string => vaultId
    mapping(address => bytes32[]) public operatorVaults; // operator => vaultIds[]

    uint256 public totalVaults;

    // -------------------------------------------------------------------------
    // Events
    // -------------------------------------------------------------------------

    event VaultRegistered(
        bytes32 indexed vaultId,
        string did,
        address indexed operator,
        uint256 timestamp
    );

    event VaultOwnershipTransferred(
        bytes32 indexed vaultId,
        address indexed previousOperator,
        address indexed newOperator,
        uint256 timestamp
    );

    event VaultDestroyed(
        bytes32 indexed vaultId,
        address indexed operator,
        uint256 timestamp
    );

    event ServiceEndpointUpdated(
        bytes32 indexed vaultId,
        string newEndpoint
    );

    // -------------------------------------------------------------------------
    // Errors
    // -------------------------------------------------------------------------

    error VaultAlreadyExists(string did);
    error VaultNotFound(bytes32 vaultId);
    error VaultDestroyed_Err(bytes32 vaultId);
    error NotVaultOperator(bytes32 vaultId, address caller);
    error InvalidDID(string did);
    error InvalidSignature();
    error ZeroAddress();

    // -------------------------------------------------------------------------
    // Constructor
    // -------------------------------------------------------------------------

    constructor() Ownable(msg.sender) {}

    // -------------------------------------------------------------------------
    // External Functions
    // -------------------------------------------------------------------------

    /**
     * @notice Register a new sovereign vault.
     * @param did  W3C DID string (did:monad:<network>:<address>)
     * @param operator  Wallet that owns this vault
     * @param serviceEndpoint  MNEME API URL for this vault
     * @param signature  Operator signature over keccak256(did, operator, serviceEndpoint)
     * @return vaultId  Deterministic vault identifier
     */
    function registerVault(
        string calldata did,
        address operator,
        string calldata serviceEndpoint,
        bytes calldata signature
    ) external nonReentrant returns (bytes32 vaultId) {
        if (operator == address(0)) revert ZeroAddress();
        if (!_isValidDID(did)) revert InvalidDID(did);
        if (didToVaultId[did] != bytes32(0)) revert VaultAlreadyExists(did);

        // Verify operator signed the registration
        bytes32 messageHash = keccak256(abi.encodePacked(did, operator, serviceEndpoint));
        bytes32 ethSignedHash = MessageHashUtils.toEthSignedMessageHash(messageHash);
        address signer = ECDSA.recover(ethSignedHash, signature);
        if (signer != operator) revert InvalidSignature();

        vaultId = keccak256(abi.encodePacked(did, operator, block.timestamp));

        vaults[vaultId] = Vault({
            did: did,
            operator: operator,
            createdAt: block.timestamp,
            destroyedAt: 0,
            serviceEndpoint: serviceEndpoint,
            exists: true
        });

        didToVaultId[did] = vaultId;
        operatorVaults[operator].push(vaultId);
        totalVaults++;

        emit VaultRegistered(vaultId, did, operator, block.timestamp);
    }

    /**
     * @notice Transfer vault ownership to a new operator.
     */
    function transferOwnership(
        bytes32 vaultId,
        address newOperator,
        bytes calldata currentOpSignature
    ) external nonReentrant {
        Vault storage vault = _getActiveVault(vaultId);
        if (newOperator == address(0)) revert ZeroAddress();

        // Verify current operator signed the transfer
        bytes32 messageHash = keccak256(abi.encodePacked(vaultId, newOperator));
        bytes32 ethSignedHash = MessageHashUtils.toEthSignedMessageHash(messageHash);
        address signer = ECDSA.recover(ethSignedHash, currentOpSignature);
        if (signer != vault.operator) revert InvalidSignature();

        address previousOperator = vault.operator;
        vault.operator = newOperator;
        operatorVaults[newOperator].push(vaultId);

        emit VaultOwnershipTransferred(vaultId, previousOperator, newOperator, block.timestamp);
    }

    /**
     * @notice Permanently destroy a vault (creates an on-chain tombstone).
     */
    function destroyVault(
        bytes32 vaultId,
        bytes calldata operatorSignature
    ) external nonReentrant {
        Vault storage vault = _getActiveVault(vaultId);

        bytes32 messageHash = keccak256(abi.encodePacked(vaultId, "DESTROY"));
        bytes32 ethSignedHash = MessageHashUtils.toEthSignedMessageHash(messageHash);
        address signer = ECDSA.recover(ethSignedHash, operatorSignature);
        if (signer != vault.operator) revert InvalidSignature();

        vault.destroyedAt = block.timestamp;

        emit VaultDestroyed(vaultId, vault.operator, block.timestamp);
    }

    /**
     * @notice Update the service endpoint for a vault.
     */
    function updateServiceEndpoint(
        bytes32 vaultId,
        string calldata newEndpoint,
        bytes calldata operatorSignature
    ) external {
        Vault storage vault = _getActiveVault(vaultId);

        bytes32 messageHash = keccak256(abi.encodePacked(vaultId, newEndpoint));
        bytes32 ethSignedHash = MessageHashUtils.toEthSignedMessageHash(messageHash);
        address signer = ECDSA.recover(ethSignedHash, operatorSignature);
        if (signer != vault.operator) revert InvalidSignature();

        vault.serviceEndpoint = newEndpoint;
        emit ServiceEndpointUpdated(vaultId, newEndpoint);
    }

    // -------------------------------------------------------------------------
    // View Functions
    // -------------------------------------------------------------------------

    function getVault(bytes32 vaultId) external view returns (Vault memory) {
        if (!vaults[vaultId].exists) revert VaultNotFound(vaultId);
        return vaults[vaultId];
    }

    function isActiveVault(bytes32 vaultId) external view returns (bool) {
        Vault storage v = vaults[vaultId];
        return v.exists && v.destroyedAt == 0;
    }

    function getOperatorVaults(address operator) external view returns (bytes32[] memory) {
        return operatorVaults[operator];
    }

    function resolveDID(string calldata did) external view returns (bytes32) {
        bytes32 vaultId = didToVaultId[did];
        if (vaultId == bytes32(0)) revert InvalidDID(did);
        return vaultId;
    }

    // -------------------------------------------------------------------------
    // Internal
    // -------------------------------------------------------------------------

    function _getActiveVault(bytes32 vaultId) internal view returns (Vault storage vault) {
        vault = vaults[vaultId];
        if (!vault.exists) revert VaultNotFound(vaultId);
        if (vault.destroyedAt != 0) revert VaultDestroyed_Err(vaultId);
    }

    function _isValidDID(string calldata did) internal pure returns (bool) {
        bytes memory b = bytes(did);
        // Must start with "did:monad:"
        if (b.length < 10) return false;
        return (
            b[0] == 'd' && b[1] == 'i' && b[2] == 'd' &&
            b[3] == ':' && b[4] == 'm' && b[5] == 'o' &&
            b[6] == 'n' && b[7] == 'a' && b[8] == 'd' && b[9] == ':'
        );
    }
}
