// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "@openzeppelin/contracts/access/Ownable.sol";

contract LoyaltyRegistry is Ownable {

    struct Brand {
        string  name;
        string  symbol;
        string  logoURI;
        address operator;
        uint256 pointsPerToken;
        bool    active;
    }

    mapping(uint256 => Brand) public brands;
    uint256 public brandCount;

    event BrandRegistered(uint256 indexed brandId, string name, address operator);
    event BrandUpdated(uint256 indexed brandId);
    event BrandDeactivated(uint256 indexed brandId);

    constructor() Ownable(msg.sender) {}

    function registerBrand(
        string calldata name,
        string calldata symbol,
        string calldata logoURI,
        address operator,
        uint256 pointsPerToken
    ) external onlyOwner returns (uint256 brandId) {
        brandId = brandCount++;
        brands[brandId] = Brand({
            name: name,
            symbol: symbol,
            logoURI: logoURI,
            operator: operator,
            pointsPerToken: pointsPerToken,
            active: true
        });
        emit BrandRegistered(brandId, name, operator);
    }

    function updateBrand(
        uint256 brandId,
        string calldata logoURI,
        address operator,
        uint256 pointsPerToken
    ) external onlyOwner {
        Brand storage b = brands[brandId];
        require(b.active, "Brand not active");
        b.logoURI = logoURI;
        b.operator = operator;
        b.pointsPerToken = pointsPerToken;
        emit BrandUpdated(brandId);
    }

    function deactivateBrand(uint256 brandId) external onlyOwner {
        brands[brandId].active = false;
        emit BrandDeactivated(brandId);
    }

    function getBrand(uint256 brandId) external view returns (Brand memory) {
        return brands[brandId];
    }

    function getAllBrands() external view returns (Brand[] memory) {
        Brand[] memory result = new Brand[](brandCount);
        for (uint256 i = 0; i < brandCount; i++) {
            result[i] = brands[i];
        }
        return result;
    }
}
