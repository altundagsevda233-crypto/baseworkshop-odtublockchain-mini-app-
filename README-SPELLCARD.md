# SpellCard NFT Creator

A Farcaster Frame application that allows users to create and mint mystical spell card NFTs with AI-generated art.

## Features

- **AI Image Generation**: Uses OpenAI DALL-E 3 to generate unique spell card images
- **IPFS Storage**: Uploads images and metadata to IPFS via Pinata
- **NFT Minting**: ERC-721 smart contract on Base Sepolia testnet
- **Rarity System**: Pseudo-random rarity assignment (60% Common, 30% Rare, 10% Legendary)
- **Farcaster Frame UI**: Multi-step interactive Frame experience

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Variables

Create a `.env.local` file with the following variables:

```bash
# OpenAI API Key
OPENAI_KEY=your_openai_api_key

# Pinata JWT Token
PINATA_JWT=your_pinata_jwt_token

# Base Sepolia RPC URL (optional, defaults to public RPC)
BASE_SEPOLIA_RPC_URL=https://sepolia.base.org

# Private key for contract deployment (optional, for deployment only)
PRIVATE_KEY=your_private_key

# BaseScan API Key (optional, for contract verification)
BASESCAN_API_KEY=your_basescan_api_key

# Contract address (set after deployment)
NEXT_PUBLIC_CONTRACT_ADDRESS=your_contract_address

# OnchainKit API Key
NEXT_PUBLIC_ONCHAINKIT_API_KEY=your_onchainkit_api_key

# Public URL
NEXT_PUBLIC_URL=http://localhost:3000
```

### 3. Deploy Smart Contract

```bash
# Compile the contract
npm run compile

# Deploy to Base Sepolia
npm run deploy:base-sepolia
```

After deployment, update `NEXT_PUBLIC_CONTRACT_ADDRESS` in your `.env.local` file.

### 4. Run Development Server

```bash
npm run dev
```

## Usage

### As a Farcaster Frame

1. Share the Frame URL: `https://your-domain.com/api/frame`
2. Users can interact with the Frame to:
   - Select an element (Fire, Water, Earth, etc.)
   - Choose a style (Chaos, Order, Nature, Dark)
   - Enter a keyword (e.g., "Rage")
   - Generate the spell card image
   - Mint as NFT for 0.001 ETH

### Frame Flow

1. **Element Selection**: Choose from 20 elements (paginated, 4 per page)
2. **Style Selection**: Choose from 4 styles
3. **Keyword Input**: Enter a keyword via text input
4. **Generation**: AI generates the image and uploads to IPFS
5. **Preview**: View the generated spell card
6. **Minting**: Mint the NFT on Base Sepolia

## Smart Contract

The `SpellDeck` contract is an ERC-721 NFT contract with:

- **Minting**: `mintSpell(string memory tokenURI)` - payable function requiring 0.001 ETH
- **Rarity**: Pseudo-random assignment using `keccak256(block.timestamp, msg.sender, block.prevrandao)`
- **Events**: `SpellMinted` event emitted with rarity information

## API Routes

### `/api/frame`
- **GET**: Returns the initial Frame HTML
- **POST**: Handles Frame interactions and state management

### `/api/generate-spell`
- **POST**: Generates AI image and uploads to IPFS
- **Body**: `{ element: string, style: string, keyword: string }`
- **Returns**: `{ metadataUrl: string, imageUrl: string, metadata: object }`

### `/api/mint`
- **POST**: Returns transaction data for minting
- **Query**: `tokenURI` - IPFS metadata URL
- **Returns**: Transaction data for Farcaster Frame

## Project Structure

```
├── contracts/
│   └── SpellDeck.sol          # ERC-721 NFT contract
├── scripts/
│   └── deploy.ts              # Deployment script
├── app/
│   ├── api/
│   │   ├── frame/
│   │   │   └── route.ts      # Farcaster Frame handler
│   │   ├── generate-spell/
│   │   │   └── route.ts      # AI generation & IPFS upload
│   │   └── mint/
│   │       └── route.ts      # Mint transaction builder
│   ├── page.tsx              # Main page (Frame viewer)
│   └── layout.tsx             # Root layout with Frame metadata
├── hardhat.config.ts          # Hardhat configuration
└── package.json               # Dependencies
```

## Technologies

- **Next.js 15**: React framework
- **OnchainKit**: Coinbase's Web3 toolkit
- **Hardhat**: Smart contract development
- **OpenZeppelin**: Secure smart contract libraries
- **OpenAI DALL-E 3**: AI image generation
- **Pinata**: IPFS pinning service
- **Viem**: Ethereum library
- **Wagmi**: React Hooks for Ethereum

## License

MIT

