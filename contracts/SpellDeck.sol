// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract SpellDeck is ERC721, ERC721URIStorage, Ownable, ReentrancyGuard {
    uint256 private _nextTokenId;
    uint256 public constant MINT_PRICE = 0.001 ether;
    
    enum Rarity {
        Common,
        Rare,
        Legendary
    }
    
    mapping(uint256 => Rarity) public tokenRarity;
    
    event SpellMinted(
        address indexed to,
        uint256 indexed tokenId,
        Rarity rarity,
        string tokenURI
    );
    
    constructor(address initialOwner) ERC721("SpellCard NFT", "SPELL") Ownable(initialOwner) {}
    
    function mintSpell(string memory tokenURI) external payable nonReentrant {
        require(msg.value >= MINT_PRICE, "Insufficient payment: 0.001 ETH required");
        
        uint256 tokenId = _nextTokenId++;
        Rarity rarity = _determineRarity();
        
        tokenRarity[tokenId] = rarity;
        
        _safeMint(msg.sender, tokenId);
        _setTokenURI(tokenId, tokenURI);
        
        emit SpellMinted(msg.sender, tokenId, rarity, tokenURI);
        
        // Refund excess payment
        if (msg.value > MINT_PRICE) {
            payable(msg.sender).transfer(msg.value - MINT_PRICE);
        }
    }
    
    function _determineRarity() private view returns (Rarity) {
        bytes32 hash = keccak256(abi.encodePacked(block.timestamp, msg.sender, block.prevrandao));
        uint256 random = uint256(hash) % 100;
        
        if (random < 10) {
            return Rarity.Legendary; // 10%
        } else if (random < 40) {
            return Rarity.Rare; // 30%
        } else {
            return Rarity.Common; // 60%
        }
    }
    
    function withdraw() external onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }
    
    // Override required functions
    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }
    
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}

