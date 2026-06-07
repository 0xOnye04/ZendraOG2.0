# ZendraOG

ZendraOG is a multi-chain crypto intelligence dashboard powered by 0G Storage and 0G Compute. It helps users monitor wallets, understand portfolio risk, capture market signals, and use an AI trading mentor whose memory and analysis artifacts can be persisted through 0G.

The product has two main surfaces:

- Dashboard: wallet tracking, portfolio scoring, market data, risk alerts, 0G Storage backups, and a link for users to get 0G tokens.
- AI Trader: a conversational trading mentor that uses 0G Compute Direct for inference and 0G Storage for persistent user memory.

## Project Overview

Crypto users often jump between explorers, market tools, portfolio trackers, and AI chat apps. ZendraOG brings those workflows into one reviewer-friendly interface:

- Track wallets on Ethereum, Arbitrum, BSC, and Solana.
- View wallet balances, portfolio concentration, stablecoin share, and risk labels.
- Save wallet analysis, dashboard snapshots, preferences, journal entries, and AI context to 0G Storage.
- Chat with an AI trading mentor through live 0G Compute providers.
- Store mentor memory so user context can survive beyond a browser session.
- Open the official 0G Hub transfer page when users need 0G tokens.

## System Architecture

```text
User Browser
  |
  |-- index.html / src/main.js
  |     |-- Wallet connection through injected EVM wallets
  |     |-- Market and wallet analytics UI
  |     |-- 0G Storage writes for dashboard snapshots and wallet analysis
  |     |-- External link to 0G Hub Khalani transfer
  |
  |-- ai-trader.html / src/aiTrader.js
        |
        |-- src/services/aiMentor.ts
        |     Builds prompts, trading context, journal context, and mentor memory
        |
        |-- src/services/ogCompute.ts
        |     Connects to 0G Compute Direct providers, signs requests, and sends chat completions
        |
        |-- src/services/ogStorage.js
              Uploads AI memory, dashboard snapshots, and analysis payloads to 0G Storage

0G Network
  |
  |-- 0G Storage
  |     Stores dashboard snapshots, wallet analysis, AI chat memory, strategy notes, and journal data
  |
  |-- 0G Compute
        Provides decentralized AI inference for the AI Trader mentor

External Services
  |
  |-- CoinGecko for market data
  |-- EVM RPC providers for wallet/token reads
  |-- Solana RPC providers for Solana wallet reads
```

## 0G Modules Used

ZendraOG uses two 0G modules:

- 0G Storage
- 0G Compute

### 0G Storage

Implemented with:

- `@0gfoundation/0g-storage-ts-sdk`

Main files:

- `src/services/ogStorage.js`
- `src/services/ogStorage.ts`
- `src/zgStorage.js`
- `src/main.js`
- `src/aiTrader.js`

The app stores:

- wallet analysis results
- dashboard backup snapshots
- AI chat history
- user preferences
- strategy memory
- trade journal entries
- AI context memory
- trade analysis logs

How it supports the product:

0G Storage turns the app from a temporary browser dashboard into a persistent intelligence workspace. Wallet scores, risk snapshots, AI mentor memory, and trading notes can be uploaded and referenced later instead of disappearing when the page reloads. After each successful upload, the storage flow also sends a metadata transaction to the 0G Mainnet proof anchor contract so the uploaded root is tied to an on-chain transaction.

### 0G Compute

Implemented with:

- `@0gfoundation/0g-compute-ts-sdk`

Main files:

- `src/services/ogCompute.ts`
- `src/services/aiMentor.ts`
- `src/aiTrader.js`
- `ai-trader.html`

The AI Trader uses the Direct Compute flow:

- creates a 0G Compute broker
- lists available providers
- loads provider metadata
- checks provider readiness
- creates authenticated request headers
- sends real `/chat/completions` requests
- optionally verifies provider responses

How it supports the product:

0G Compute powers the AI Trader mentor. Instead of using a mocked local response, the app can route the user prompt, wallet context, journal notes, and strategy memory into a live 0G Compute provider for decentralized AI inference.

## 0G Mainnet Deployments

The repository includes deployed 0G Mainnet records that can be used by judges to verify the project on-chain. The active storage proof flow uses the user-facing deployment, while the earlier proof anchor remains documented as an additional verification reference.

### Active User-Facing Storage Anchor

This deployment is the user-facing 0G Mainnet contract reference for the product. ZendraOG now calls this contract after successful 0G Storage uploads to anchor the storage root and storage transaction metadata on 0G Chain.

- Network: `0G Mainnet`
- Chain ID: `16661`
- RPC URL: `https://evmrpc.0g.ai`
- Deployer: `0x6625FE0b675ab5e16e86ac3cd5043Fb25D87235C`
- Deployment wallet balance at deploy time: `5.074073075656172355 0G`
- Contract: `0x61c60b1A07b55a23776dDe639933Aa01A5156c55`
- Transaction: `0xdd56caca93c897b16183e382540d6746241e4e19441b56bfd1dc31e54c0b0670`
- Contract explorer: `https://chainscan.0g.ai/address/0x61c60b1A07b55a23776dDe639933Aa01A5156c55`
- Transaction explorer: `https://chainscan.0g.ai/tx/0xdd56caca93c897b16183e382540d6746241e4e19441b56bfd1dc31e54c0b0670`

The active proof metadata is stored in:

- `deployments/0g-mainnet-proof-anchor.json`

### Earlier Repository Proof Anchor

- Network: `0G Mainnet`
- Chain ID: `16661`
- RPC URL: `https://evmrpc.0g.ai`
- Deployer: `0xf325c997948BD684fd07A675dF7D4C836A9e65EB`
- Contract: `0xC3412374BEf9Ea5De79022454c1802A5a58fB2B3`
- Transaction: `0x632c62504b931cf03d663f3aa5f983106c89086f295866f5908fafcab6950411`
- Contract explorer: `https://chainscan.0g.ai/address/0xC3412374BEf9Ea5De79022454c1802A5a58fB2B3`
- Transaction explorer: `https://chainscan.0g.ai/tx/0x632c62504b931cf03d663f3aa5f983106c89086f295866f5908fafcab6950411`

## Local Deployment

### Prerequisites

- Node.js 20 or newer recommended
- npm
- MetaMask or another injected EVM wallet
- A wallet with 0G Mainnet configured if testing 0G writes or AI Trader compute

### Install

```bash
npm install
```

### Configure Environment

Create or update `.env.local`:

```env
VITE_OG_COMPUTE_RPC_URL=https://evmrpc.0g.ai
VITE_OG_EVM_RPC=https://evmrpc.0g.ai
VITE_OG_INDEXER_RPC=https://indexer-storage-turbo.0g.ai
VITE_OG_PROOF_ANCHOR_CONTRACT=0x61c60b1A07b55a23776dDe639933Aa01A5156c55
```

Optional values:

```env
VITE_OG_COMPUTE_MODEL=
VITE_OG_COMPUTE_PROVIDER_ADDRESS=
VITE_COINGECKO_DEMO_API_KEY=
VITE_COINGECKO_PRO_API_KEY=
VITE_SOLANA_RPC=
VITE_SOLANA_RPC_FALLBACKS=
```

### Run Locally

```bash
npm run dev
```

Open the local Vite URL, usually:

```text
http://localhost:5173
```

### Build

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

### Publish Frontend to 0G Storage and Anchor on 0G Chain

This command builds the frontend, packages the `dist` artifacts into a deterministic JSON bundle, uploads that bundle to 0G Storage, then anchors the resulting storage root and metadata in a 0G Mainnet transaction.

Set the deployer private key only in your local terminal session:

```bash
# macOS / Linux
export PRIVATE_KEY=your_0g_mainnet_private_key

# Windows PowerShell
$env:PRIVATE_KEY="your_0g_mainnet_private_key"
```

Then run:

```bash
npm run deploy:0g-frontend
```

The script writes the deployment receipt to:

```text
deployments/0g-frontend-storage-deployment.json
```

That receipt includes:

- 0G Storage root hash
- 0G Storage transaction hash when returned by the indexer
- bundle SHA-256
- file manifest for the published frontend build
- 0G Chain anchor transaction hash
- 0G Chain explorer link

## Reviewer Notes

### Wallet and Network

Use an EVM wallet such as MetaMask. The app can request or use 0G Mainnet with:

- Network name: `0G Mainnet`
- Chain ID: `16661`
- Currency symbol: `0G`
- RPC URL: `https://evmrpc.0g.ai`
- Explorer: `https://chainscan.0g.ai`

### Getting 0G Tokens

The dashboard includes a `Get 0G Tokens` button that opens:

```text
https://hub.0g.ai/khalani/transfer?network=mainnet
```

Use the official 0G Hub flow if a reviewer needs tokens for mainnet interactions.

### Compute Readiness

The AI Trader depends on live 0G Compute provider state. A connected wallet may still be unable to run inference if:

- no provider is selected
- the provider is unhealthy
- the selected provider does not support the requested model
- the connected wallet does not have a funded provider sub-account
- response verification is unavailable for the selected provider

The AI Trader UI surfaces these checks in its readiness, identity, provider, and compute panels.

### Storage Readiness

0G Storage writes require:

- connected EVM wallet
- 0G Mainnet RPC access
- 0G Storage indexer RPC access
- enough wallet balance for required transactions

## Project Structure

```text
.
|-- index.html                         Dashboard UI
|-- ai-trader.html                     AI Trader UI
|-- src/
|   |-- main.js                        Dashboard logic
|   |-- aiTrader.js                    AI Trader page logic
|   |-- style.css                      Shared styling
|   |-- zgStorage.js                   Dashboard-facing 0G Storage helpers
|   |-- services/
|       |-- aiMentor.ts                Prompt and mentor context builder
|       |-- ogCompute.ts               0G Compute Direct integration
|       |-- ogStorage.js               Browser 0G Storage integration
|       |-- ogStorage.ts               Shared storage types/helpers
|-- scripts/
|   |-- deploy-frontend-to-0g-storage.mjs
|   |-- deploy-mainnet-proof-anchor.mjs
|   |-- postinstall-compute-sdk.mjs
|-- deployments/
|   |-- 0g-frontend-storage-deployment.json
|   |-- 0g-mainnet-proof-anchor.json
|-- package.json
|-- vite.config.js
```

## Dependencies

Runtime:

- `@0gfoundation/0g-compute-ts-sdk`
- `@0gfoundation/0g-storage-ts-sdk`
- `ethers`

Development:

- `vite`
- `vite-plugin-node-polyfills`

## Repository

```text
https://github.com/0xOnye04/ZendraOG2.0
```
