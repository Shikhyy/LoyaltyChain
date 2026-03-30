// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./LoyaltyToken.sol";
import "./LoyaltyRegistry.sol";

contract SwapPool is Ownable {

    LoyaltyToken public immutable loyaltyToken;
    LoyaltyRegistry public immutable registry;

    uint256 public constant FEE_BPS = 30;
    uint256 public constant BPS = 10000;

    struct Pool {
        uint256 reserveA;
        uint256 reserveB;
        uint256 brandA;
        uint256 brandB;
        bool    exists;
    }

    mapping(bytes32 => Pool) public pools;

    address public feeRecipient;

    event PoolCreated(uint256 indexed brandA, uint256 indexed brandB, bytes32 poolKey);
    event LiquidityAdded(bytes32 indexed poolKey, uint256 amountA, uint256 amountB);
    event Swapped(
        address indexed user,
        uint256 indexed fromBrand,
        uint256 indexed toBrand,
        uint256 amountIn,
        uint256 amountOut,
        uint256 feeAmount
    );
    event FeeRecipientUpdated(address indexed newRecipient);

    constructor(address tokenAddress, address registryAddress, address initialFeeRecipient)
        Ownable(msg.sender)
    {
        loyaltyToken = LoyaltyToken(tokenAddress);
        registry = LoyaltyRegistry(registryAddress);
        feeRecipient = initialFeeRecipient;
    }

    function setFeeRecipient(address _feeRecipient) external onlyOwner {
        require(_feeRecipient != address(0), "Invalid address");
        feeRecipient = _feeRecipient;
        emit FeeRecipientUpdated(_feeRecipient);
    }

    function poolKey(uint256 brandA, uint256 brandB) public pure returns (bytes32) {
        (uint256 lo, uint256 hi) = brandA < brandB
            ? (brandA, brandB)
            : (brandB, brandA);
        return keccak256(abi.encodePacked(lo, hi));
    }

    function createPool(
        uint256 brandA,
        uint256 brandB,
        uint256 seedA,
        uint256 seedB
    ) external onlyOwner {
        bytes32 key = poolKey(brandA, brandB);
        require(!pools[key].exists, "Pool exists");

        loyaltyToken.safeTransferFrom(msg.sender, address(this), brandA, seedA, "");
        loyaltyToken.safeTransferFrom(msg.sender, address(this), brandB, seedB, "");

        pools[key] = Pool({
            reserveA: seedA,
            reserveB: seedB,
            brandA: brandA,
            brandB: brandB,
            exists: true
        });

        emit PoolCreated(brandA, brandB, key);
        emit LiquidityAdded(key, seedA, seedB);
    }

    function addLiquidity(
        uint256 brandA,
        uint256 brandB,
        uint256 amountA,
        uint256 amountB
    ) external onlyOwner {
        bytes32 key = poolKey(brandA, brandB);
        require(pools[key].exists, "Pool not found");

        loyaltyToken.safeTransferFrom(msg.sender, address(this), brandA, amountA, "");
        loyaltyToken.safeTransferFrom(msg.sender, address(this), brandB, amountB, "");

        Pool storage p = pools[key];
        p.reserveA += amountA;
        p.reserveB += amountB;

        emit LiquidityAdded(key, amountA, amountB);
    }

    function getAmountOut(
        uint256 fromBrand,
        uint256 toBrand,
        uint256 amountIn
    ) public view returns (uint256 amountOut) {
        bytes32 key = poolKey(fromBrand, toBrand);
        Pool memory p = pools[key];
        require(p.exists, "Pool not found");

        (uint256 reserveIn, uint256 reserveOut) = fromBrand == p.brandA
            ? (p.reserveA, p.reserveB)
            : (p.reserveB, p.reserveA);

        uint256 amountInWithFee = amountIn * (BPS - FEE_BPS);
        amountOut = (amountInWithFee * reserveOut) /
                    (reserveIn * BPS + amountInWithFee);
    }

    function swap(
        uint256 fromBrand,
        uint256 toBrand,
        uint256 amountIn,
        uint256 minAmountOut
    ) external {
        bytes32 key = poolKey(fromBrand, toBrand);
        Pool storage p = pools[key];
        require(p.exists, "Pool not found");

        uint256 amountOut = getAmountOut(fromBrand, toBrand, amountIn);
        require(amountOut >= minAmountOut, "Slippage exceeded");

        loyaltyToken.safeTransferFrom(msg.sender, address(this), fromBrand, amountIn, "");

        if (fromBrand == p.brandA) {
            p.reserveA += amountIn;
            p.reserveB -= amountOut;
        } else {
            p.reserveB += amountIn;
            p.reserveA -= amountOut;
        }

        loyaltyToken.safeTransferFrom(address(this), msg.sender, toBrand, amountOut, "");

        uint256 feeAmount = (amountIn * FEE_BPS) / BPS;
        emit Swapped(msg.sender, fromBrand, toBrand, amountIn, amountOut, feeAmount);
    }

    function onERC1155Received(
        address, address, uint256, uint256, bytes calldata
    ) external pure returns (bytes4) {
        return this.onERC1155Received.selector;
    }

    function onERC1155BatchReceived(
        address, address, uint256[] calldata, uint256[] calldata, bytes calldata
    ) external pure returns (bytes4) {
        return this.onERC1155BatchReceived.selector;
    }
}
