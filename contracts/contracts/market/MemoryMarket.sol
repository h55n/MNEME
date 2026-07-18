// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title MemoryMarket
 * @notice Decentralised marketplace for agent memory packs.
 *         Revenue split: 80% seller / 20% platform.
 *         Payments settle in USDC on Monad.
 *
 *         Security: `updatePlatformTreasury` is subject to a 48-hour timelock
 *         to prevent malicious redirection of platform revenue.
 */
contract MemoryMarket is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // -------------------------------------------------------------------------
    // Constants
    // -------------------------------------------------------------------------

    /// @notice Seller receives 80% of each purchase
    uint256 public constant SELLER_SHARE_BPS = 8000;
    /// @notice Platform receives 20% of each purchase
    uint256 public constant PLATFORM_SHARE_BPS = 2000;
    uint256 public constant BPS_DENOMINATOR = 10000;

    /// @notice Minimum delay before a proposed treasury change can be executed
    uint256 public constant TIMELOCK_DELAY = 48 hours;

    // -------------------------------------------------------------------------
    // Structs
    // -------------------------------------------------------------------------

    struct Pack {
        uint256 packId;
        bytes32 contentHash;        // Hash of anonymised pack content
        bytes32 provenanceHash;     // Proves real interactions (from attestation)
        address seller;
        uint256 priceUsdc;          // Price in USDC (6 decimals)
        uint256 interactionCount;
        string domainTag;
        string title;
        string metadataUri;         // IPFS URI for extended metadata
        bool listed;
        bool delisted;
        uint256 listedAt;
        uint256 purchaseCount;
    }

    struct Purchase {
        uint256 purchaseId;
        uint256 packId;
        address buyer;
        uint256 pricePaid;
        uint256 purchasedAt;
        bytes32 ingestTxRef;        // Reference to off-chain ingest operation
    }

    // -------------------------------------------------------------------------
    // State
    // -------------------------------------------------------------------------

    /// @notice USDC token contract (immutable after deployment)
    IERC20 public immutable usdc;

    uint256 public packCounter;
    uint256 public purchaseCounter;

    mapping(uint256 => Pack) public packs;
    mapping(uint256 => Purchase) public purchases;
    mapping(address => uint256[]) public sellerPacks;
    mapping(address => uint256[]) public buyerPurchases;
    mapping(uint256 => mapping(address => bool)) public hasPurchased;

    // Revenue tracking
    mapping(address => uint256) public pendingWithdrawals;
    uint256 public platformRevenue;

    // Platform treasury with 48h timelock
    address public platformTreasury;
    address public pendingTreasury;
    uint256 public treasuryChangeEta;

    // -------------------------------------------------------------------------
    // Events
    // -------------------------------------------------------------------------

    event PackListed(
        uint256 indexed packId,
        address indexed seller,
        bytes32 contentHash,
        uint256 priceUsdc,
        string domainTag,
        uint256 timestamp
    );

    event PackDelisted(uint256 indexed packId, address indexed seller);

    event PackPurchased(
        uint256 indexed purchaseId,
        uint256 indexed packId,
        address indexed buyer,
        uint256 priceUsdc,
        uint256 timestamp
    );

    event RevenueWithdrawn(address indexed seller, uint256 amount);

    event PlatformRevenueWithdrawn(address indexed treasury, uint256 amount);

    /// @notice Emitted when a treasury change is proposed (starts 48h timelock)
    event TreasuryChangeProposed(address indexed newTreasury, uint256 eta);

    /// @notice Emitted when the treasury change is executed after timelock
    event TreasuryChanged(address indexed oldTreasury, address indexed newTreasury);

    /// @notice Emitted when a pending treasury change is cancelled
    event TreasuryChangeCancelled(address indexed cancelledTreasury);

    // -------------------------------------------------------------------------
    // Errors
    // -------------------------------------------------------------------------

    error PackNotFound(uint256 packId);
    error PackNotListed(uint256 packId);
    error PackAlreadyDelisted(uint256 packId);
    error NotPackSeller(uint256 packId, address caller);
    error AlreadyPurchased(uint256 packId, address buyer);
    error InsufficientAllowance();
    error NoPendingWithdrawal();
    error ZeroAddress();
    error TimelockNotExpired(uint256 eta, uint256 current);
    error NoPendingTreasuryChange();

    // -------------------------------------------------------------------------
    // Constructor
    // -------------------------------------------------------------------------

    constructor(address _usdc, address _platformTreasury) Ownable(msg.sender) {
        if (_usdc == address(0) || _platformTreasury == address(0)) revert ZeroAddress();
        usdc = IERC20(_usdc);
        platformTreasury = _platformTreasury;
    }

    // -------------------------------------------------------------------------
    // Pack Management
    // -------------------------------------------------------------------------

    /**
     * @notice List a memory pack on the marketplace.
     * @param contentHash     SHA-256 hash of the anonymised pack content
     * @param provenanceHash  Hash linking to on-chain attestations (proves real interactions)
     * @param priceUsdc       Price in USDC (6 decimals, e.g. 1000000 = $1.00)
     * @param interactionCount Number of real agent interactions in this pack
     * @param domainTag       Category tag (legal, finance, coding, etc.)
     * @param title           Human-readable pack title
     * @param metadataUri     IPFS URI for extended metadata / anonymisation report
     * @return packId         The assigned pack identifier
     */
    function listPack(
        bytes32 contentHash,
        bytes32 provenanceHash,
        uint256 priceUsdc,
        uint256 interactionCount,
        string calldata domainTag,
        string calldata title,
        string calldata metadataUri
    ) external returns (uint256 packId) {
        packId = ++packCounter;

        packs[packId] = Pack({
            packId: packId,
            contentHash: contentHash,
            provenanceHash: provenanceHash,
            seller: msg.sender,
            priceUsdc: priceUsdc,
            interactionCount: interactionCount,
            domainTag: domainTag,
            title: title,
            metadataUri: metadataUri,
            listed: true,
            delisted: false,
            listedAt: block.timestamp,
            purchaseCount: 0
        });

        sellerPacks[msg.sender].push(packId);

        emit PackListed(packId, msg.sender, contentHash, priceUsdc, domainTag, block.timestamp);
    }

    /**
     * @notice Delist a pack from the marketplace (seller only).
     * @param packId  The pack to delist
     */
    function delistPack(uint256 packId) external {
        Pack storage pack = packs[packId];
        if (pack.seller == address(0)) revert PackNotFound(packId);
        if (pack.seller != msg.sender) revert NotPackSeller(packId, msg.sender);
        if (pack.delisted) revert PackAlreadyDelisted(packId);

        pack.listed = false;
        pack.delisted = true;

        emit PackDelisted(packId, msg.sender);
    }

    // -------------------------------------------------------------------------
    // Purchase
    // -------------------------------------------------------------------------

    /**
     * @notice Purchase a memory pack. Buyer must approve USDC first.
     *         Revenue is split 80/20 between seller and platform.
     * @param packId  The pack to purchase
     * @return purchaseId  The purchase record identifier
     */
    function purchasePack(uint256 packId) external nonReentrant returns (uint256 purchaseId) {
        Pack storage pack = packs[packId];
        if (pack.seller == address(0)) revert PackNotFound(packId);
        if (!pack.listed || pack.delisted) revert PackNotListed(packId);
        if (hasPurchased[packId][msg.sender]) revert AlreadyPurchased(packId, msg.sender);

        uint256 price = pack.priceUsdc;

        // Transfer USDC from buyer
        usdc.safeTransferFrom(msg.sender, address(this), price);

        // Calculate 80/20 split
        uint256 sellerAmount = (price * SELLER_SHARE_BPS) / BPS_DENOMINATOR;
        uint256 platformAmount = price - sellerAmount;

        pendingWithdrawals[pack.seller] += sellerAmount;
        platformRevenue += platformAmount;

        // Record purchase
        purchaseId = ++purchaseCounter;
        purchases[purchaseId] = Purchase({
            purchaseId: purchaseId,
            packId: packId,
            buyer: msg.sender,
            pricePaid: price,
            purchasedAt: block.timestamp,
            ingestTxRef: bytes32(0)
        });

        hasPurchased[packId][msg.sender] = true;
        buyerPurchases[msg.sender].push(purchaseId);
        pack.purchaseCount++;

        emit PackPurchased(purchaseId, packId, msg.sender, price, block.timestamp);
    }

    // -------------------------------------------------------------------------
    // Revenue Withdrawal
    // -------------------------------------------------------------------------

    /**
     * @notice Withdraw accrued seller revenue (pull pattern — safe against reentrancy).
     */
    function withdrawRevenue() external nonReentrant {
        uint256 amount = pendingWithdrawals[msg.sender];
        if (amount == 0) revert NoPendingWithdrawal();

        pendingWithdrawals[msg.sender] = 0;
        usdc.safeTransfer(msg.sender, amount);

        emit RevenueWithdrawn(msg.sender, amount);
    }

    /**
     * @notice Withdraw accrued platform revenue to the treasury address.
     */
    function withdrawPlatformRevenue() external onlyOwner nonReentrant {
        uint256 amount = platformRevenue;
        if (amount == 0) revert NoPendingWithdrawal();

        platformRevenue = 0;
        usdc.safeTransfer(platformTreasury, amount);

        emit PlatformRevenueWithdrawn(platformTreasury, amount);
    }

    // -------------------------------------------------------------------------
    // Treasury Timelock (48-hour delay on treasury changes)
    // -------------------------------------------------------------------------

    /**
     * @notice Propose a new platform treasury address.
     *         Starts a 48-hour timelock before the change can be executed.
     *         Prevents malicious redirection of platform revenue.
     * @param newTreasury  Proposed new treasury address
     */
    function proposeTreasuryChange(address newTreasury) external onlyOwner {
        if (newTreasury == address(0)) revert ZeroAddress();

        pendingTreasury = newTreasury;
        treasuryChangeEta = block.timestamp + TIMELOCK_DELAY;

        emit TreasuryChangeProposed(newTreasury, treasuryChangeEta);
    }

    /**
     * @notice Execute a previously proposed treasury change after the 48-hour timelock.
     *         Reverts if the timelock has not expired.
     */
    function executeTreasuryChange() external onlyOwner {
        if (pendingTreasury == address(0)) revert NoPendingTreasuryChange();
        if (block.timestamp < treasuryChangeEta) {
            revert TimelockNotExpired(treasuryChangeEta, block.timestamp);
        }

        address oldTreasury = platformTreasury;
        platformTreasury = pendingTreasury;
        pendingTreasury = address(0);
        treasuryChangeEta = 0;

        emit TreasuryChanged(oldTreasury, platformTreasury);
    }

    /**
     * @notice Cancel a pending treasury change before it executes.
     */
    function cancelTreasuryChange() external onlyOwner {
        if (pendingTreasury == address(0)) revert NoPendingTreasuryChange();

        address cancelled = pendingTreasury;
        pendingTreasury = address(0);
        treasuryChangeEta = 0;

        emit TreasuryChangeCancelled(cancelled);
    }

    // -------------------------------------------------------------------------
    // View Functions
    // -------------------------------------------------------------------------

    /**
     * @notice Get full pack details.
     * @param packId  Pack to query
     * @return Pack struct with all fields
     */
    function getPack(uint256 packId) external view returns (Pack memory) {
        if (packs[packId].seller == address(0)) revert PackNotFound(packId);
        return packs[packId];
    }

    /**
     * @notice Get all pack IDs listed by a seller.
     * @param seller  Seller address
     * @return Array of pack IDs
     */
    function getSellerPacks(address seller) external view returns (uint256[] memory) {
        return sellerPacks[seller];
    }

    /**
     * @notice Get all purchase IDs made by a buyer.
     * @param buyer  Buyer address
     * @return Array of purchase IDs
     */
    function getBuyerPurchases(address buyer) external view returns (uint256[] memory) {
        return buyerPurchases[buyer];
    }

    /**
     * @notice Get full purchase details.
     * @param purchaseId  Purchase to query
     * @return Purchase struct
     */
    function getPurchase(uint256 purchaseId) external view returns (Purchase memory) {
        return purchases[purchaseId];
    }
}
