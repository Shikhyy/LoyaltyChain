// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./LoyaltyRegistry.sol";

contract LoyaltyToken is ERC1155, Ownable {

    LoyaltyRegistry public immutable registry;

    mapping(uint256 => uint256) public totalSupply;

    event TokensMinted(uint256 indexed brandId, address indexed to, uint256 amount);
    event TokensBurned(uint256 indexed brandId, address indexed from, uint256 amount);
    event Redeemed(
        address indexed user,
        uint256 indexed brandId,
        uint256 amount,
        string rewardCode,
        uint256 timestamp
    );

    modifier onlyOperator(uint256 brandId) {
        LoyaltyRegistry.Brand memory b = registry.getBrand(brandId);
        require(b.active, "Brand not active");
        require(msg.sender == b.operator || msg.sender == owner(), "Not operator");
        _;
    }

    constructor(address registryAddress)
        ERC1155("")
        Ownable(msg.sender)
    {
        registry = LoyaltyRegistry(registryAddress);
    }

    function uri(uint256 brandId) public view override returns (string memory) {
        LoyaltyRegistry.Brand memory b = registry.getBrand(brandId);
        return b.logoURI;
    }

    function mint(
        address to,
        uint256 brandId,
        uint256 amount
    ) external onlyOperator(brandId) {
        _mint(to, brandId, amount, "");
        totalSupply[brandId] += amount;
        emit TokensMinted(brandId, to, amount);
    }

    function batchMint(
        address[] calldata recipients,
        uint256 brandId,
        uint256[] calldata amounts
    ) external onlyOperator(brandId) {
        require(recipients.length == amounts.length, "Length mismatch");
        for (uint256 i = 0; i < recipients.length; i++) {
            _mint(recipients[i], brandId, amounts[i], "");
            totalSupply[brandId] += amounts[i];
            emit TokensMinted(brandId, recipients[i], amounts[i]);
        }
    }

    function redeem(
        uint256 brandId,
        uint256 amount,
        string calldata rewardCode
    ) external {
        require(balanceOf(msg.sender, brandId) >= amount, "Insufficient balance");
        _burn(msg.sender, brandId, amount);
        totalSupply[brandId] -= amount;
        emit TokensBurned(brandId, msg.sender, amount);
        emit Redeemed(msg.sender, brandId, amount, rewardCode, block.timestamp);
    }

    function getPortfolio(address user)
        external
        view
        returns (uint256[] memory brandIds, uint256[] memory balances)
    {
        uint256 count = registry.brandCount();
        brandIds = new uint256[](count);
        balances = new uint256[](count);
        for (uint256 i = 0; i < count; i++) {
            brandIds[i] = i;
            balances[i] = balanceOf(user, i);
        }
    }
}
