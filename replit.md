# replit.md

## Overview

WebDollar 2 (WDollar 2) is a cryptocurrency wallet and blockchain platform built as a full-stack web application. It provides browser-based wallet management, in-browser mining simulation, a block explorer, legacy token conversion (WEBD v1 → v2 swap), and a conceptual crypto debit card feature. The project brands itself as "Currency of the Internet — Reborn with Real Cryptography," using actual cryptographic primitives (secp256k1, BIP39 mnemonics, SHA-256) for wallet generation.

**Branding**: Always use "WebDollar 2" or "WDollar 2" — never "2.0". Logo is displayed as a circular-cropped gold coin (rounded-full, object-cover) to hide the black background box.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
- **Framework**: React 18 with TypeScript, bundled by Vite
- **Routing**: Wouter (lightweight client-side router)
- **State/Data Fetching**: TanStack React Query for all server state — queries and mutations for auth, wallet, mining, explorer, conversion, and addresses
- **UI Components**: shadcn/ui (new-york style) built on Radix UI primitives with Tailwind CSS
- **Styling**: Tailwind CSS with dark charcoal/navy backgrounds and bright amber #FFC107 accents (matching webdollar.io). Custom CSS variables defined in `client/src/index.css`. Fonts: Fira Code (monospace/terminal), Orbitron (headings), Rajdhani
- **Animations**: Framer Motion for page transitions and hero animations
- **Charts**: Recharts for tokenomics pie charts and mining stats
- **Path aliases**: `@/` → `client/src/`, `@shared/` → `shared/`, `@assets/` → `attached_assets/`

### Pages
- `/` — Home/landing with tokenomics chart, features grid, hero section, roadmap
- `/auth` — Login/register with tabbed interface
- `/wallet` — Wallet dashboard with balance, transfers, mining terminal, transaction history
- `/addresses` — Multi-address wallet management (create, lock, reveal seed phrase, delete, per-address balances)
- `/conversion` — Legacy WEBD → WDollar 2 token swap with cap enforcement
- `/explorer` — Block explorer showing real-time Polygon blocks/transactions (live from Alchemy RPC) plus internal WEBD blocks/transactions, with Polygonscan links
- `/card` — Crypto debit card marketing/info page with fee schedule
- `/buy` — Buy WEBD tokens with Stripe checkout (4 token packages from $9.99 to $299.99)
- **Help Chat** — AI-powered floating chat widget (appears on every page) for WebDollar 2 questions. Uses gpt-5-nano via Replit AI Integrations. Endpoint: POST /api/help/chat with SSE streaming. Rate limited to 20 req/min per IP. System prompt contains all key WEBD facts (tokenomics, staking, navigation, features).

### Backend
- **Runtime**: Node.js with Express, run via `tsx` in development
- **HTTP Server**: Express with JSON body parsing, session management, request logging
- **Session Management**: `express-session` with `memorystore` (in-memory session store)
- **Authentication**: Username/password with bcrypt hashing, session-based auth (no JWT for web sessions). Optional TOTP-based two-factor authentication (2FA) via authenticator apps (Google Authenticator, Authy). 2FA setup generates QR code, verify flow uses session-bound challenge to prevent brute-force. Rate-limited per IP and per user.
- **API Design**: All routes defined in `shared/routes.ts` as a typed API contract object with Zod schemas for input validation. Server implements these in `server/routes.ts`
- **Cryptography**: Real crypto — BIP39 mnemonic generation, secp256k1 key derivation via `@noble/secp256k1`, AES-256-CBC for private key encryption, SHA-256 for hashing
- **Blockchain Integration**: Connected to Polygon (Amoy testnet) via Alchemy RPC. Each wallet derives both WEBD$ address and Polygon-compatible 0x address from the same private key. `server/blockchain.ts` provides ethers.js-based blockchain service for token deployment, on-chain transfers, and balance queries
- **Rate Limiting**: IP-based rate limits (5 register/min, 10 login/min, 30 mine/min)
- **Transfers**: Atomic peer-to-peer transfers using raw SQL transactions (BEGIN/COMMIT/ROLLBACK) with balance validation
- **Stripe Integration**: Stripe payments via `stripe-replit-sync` for buying WEBD tokens. Webhook registered before `express.json()`. Products/prices stored in `stripe` schema (auto-managed by stripe-replit-sync). Seed script at `script/seed-products.ts`. Server files: `server/stripeClient.ts`, `server/webhookHandlers.ts`. Purchase fulfillment: on checkout.session.completed webhook, tokens are atomically transferred from dev wallet (WebDollarDev) to buyer using SQL transactions with advisory locks and a unique partial index on session ID for idempotency. Transaction type "purchase" tracks all fulfilled orders.

### Shared Layer
- `shared/schema.ts` — Drizzle ORM table definitions and Zod insert schemas
- `shared/routes.ts` — Typed API route definitions with paths, methods, input/output schemas. Acts as a contract between frontend and backend

### Database
- **ORM**: Drizzle ORM with PostgreSQL dialect
- **Database**: PostgreSQL (required via `DATABASE_URL` environment variable)
- **Schema push**: `npm run db:push` (uses `drizzle-kit push`)
- **Tables**:
  - `users` — accounts with username, hashed password, wallet address, polygon address, balance, dev/foundation flags
  - `wallet_addresses` — multiple addresses per user with encrypted private keys, mnemonics, lock status, per-address balance, polygon address
  - `blocks` — blockchain blocks with hash, miner info, timestamps
  - `transactions` — transaction records with sender/receiver/amount, senderAddress/receiverAddress fields
  - `conversion_requests` — legacy token swap requests with status tracking and vesting
  - `blocked_wallets` — blacklisted wallet addresses (old dev wallets blocked from conversion)

### Storage Pattern
- `server/storage.ts` defines an `IStorage` interface and `DatabaseStorage` class implementation
- All database access goes through the storage layer, making it swappable
- Transfers use atomic SQL transactions to prevent race conditions and double-spend

### Build System
- **Development**: `npm run dev` — runs Vite dev server (HMR) proxied through Express via `server/vite.ts`
- **Production Build**: `npm run build` — Vite builds frontend to `dist/public`, esbuild bundles server to `dist/index.cjs`
- **Production Start**: `npm start` — runs the bundled server which serves static files

### Tokenomics
- Total supply: 68 billion WEBD
- Distribution: 85% public mining, 10% dev allocation, 5% foundation
- Genesis wallets seeded via `script/seed.ts`
- Conversion caps: 5M WEBD lifetime per account, up to 1M every 6 months

### Key Implementation Details
- Mining rewards update both `users.balance` and `wallet_addresses.balance` for consistency
- Transfers update both user-level and address-level balances atomically
- Validation ordering in transfers: address format → self-transfer → recipient existence → balance check (prevents information leakage)
- Explorer enriches blocks with miner wallet addresses and transactions with sender/receiver addresses
- Explorer fetches real Polygon blocks and transactions from Alchemy RPC with Polygonscan links
- Wallet dashboard shows on-chain MATIC balance alongside internal WEBD balance
- All Polygon addresses have clickable Polygonscan links for on-chain verification
- Admin token deployment endpoint (POST /api/admin/deploy-token) secured behind isDev flag + DEPLOYER_PRIVATE_KEY env var
- Homepage shows live network statistics (total wallets, blocks mined, transactions, circulating supply)
- Wallet page has QR code generation for easy address sharing
- **Proof-of-Stake Staking**: Users stake WEBD tokens to earn passive rewards. Rewards accrue proportionally based on user's share of total network stake. Base rate: 550 WEBD per 30 seconds distributed among all stakers. Stake/unstake/claim-rewards endpoints with minimum 5,000 WEBD stake and 30-second claim cooldown. APY calculated dynamically based on total network stake. Blocks are created when staking rewards are claimed.
- Staking section shows staked balance, pending rewards, estimated APY, and network staking stats
- Explorer has search functionality for WEBD$ addresses, block hashes, and block numbers
- Network stats API endpoint (GET /api/network/stats) for aggregate network data
- Explorer search API (GET /api/explorer/search?q=...) supports address, hash, and block number lookups

## External Dependencies

### Database
- **PostgreSQL** — Primary data store, connection via `DATABASE_URL` environment variable

### Key NPM Packages
- **ethers** — Ethereum/Polygon blockchain interaction (wallet derivation, contract deployment, token transfers, balance queries)
- **@noble/secp256k1** and **@noble/hashes** — Elliptic curve cryptography for wallet key generation
- **bip39** — BIP39 mnemonic seed phrase generation
- **bcrypt** — Password hashing
- **express-session** + **memorystore** — Session management (in-memory, not persistent across restarts)
- **drizzle-orm** + **drizzle-kit** — Database ORM and migration tooling
- **@tanstack/react-query** — Client-side server state management
- **recharts** — Charting library for tokenomics and stats
- **framer-motion** — Animation library
- **date-fns** — Date formatting for block explorer
- **wouter** — Client-side routing
- **zod** — Schema validation (shared between client and server)

### Environment Variables Required
- `DATABASE_URL` — PostgreSQL connection string (required)
- `SESSION_SECRET` — Session encryption secret (defaults to `"dev_secret_webdollar2"` in development)
- `ALCHEMY_API_KEY` — Alchemy API key for Polygon blockchain RPC access (required for on-chain features)

### Replit-Specific Integrations
- `@replit/vite-plugin-runtime-error-modal` — Runtime error overlay in development
- `@replit/vite-plugin-cartographer` — Dev tooling (development only)
- `@replit/vite-plugin-dev-banner` — Development banner (development only)
