# BB Protocol — Agent Context File

## Project Overview
BB Protocol is a Web4.0 Cognitive Ownership Infrastructure built on Next.js 16 with Base L2 (Ethereum L2). It implements cognitive avatars as on-chain digital twins with AI-powered behavior patterns, resonance scoring, and fluid democracy delegation.

## Tech Stack
- **Framework**: Next.js 16.1.3 (App Router + Turbopack)
- **Language**: TypeScript 5 (strict mode)
- **Styling**: Tailwind CSS 4 + shadcn/ui (New York style)
- **Database**: Prisma ORM with SQLite
- **State Management**: Zustand (client) + TanStack Query (server)
- **Web3**: Wagmi v3 + Viem 2.x + ConnectKit (Base L2)
- **i18n**: Custom useI18n hook (8 languages: zh, en, ja, ko, es, fr, de, ar)
- **Real-time**: Socket.IO microservices (ports 3003-3008)
- **Animation**: Framer Motion

## Installation
```bash
bun install
bun run db:push
bun run dev
```

## Configuration
Create a `.env` file:
```
DATABASE_URL="file:./dev.db"
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID="your-project-id"
```

## API Architecture
All API routes follow REST conventions at `/api/{resource}`:
- GET returns data, POST creates/triggers actions, PATCH updates
- All routes have try-catch error handling with proper HTTP status codes
- Error response format: `{ error: string, message: string }`

## Key Domain Concepts
- **Cognitive Avatar**: On-chain AI twin (ERC-721) representing user cognitive patterns
- **Resonance Score (0-100)**: Alignment metric between avatar behavior and user intent
- **IFP Delegation**: Intent-Followed-Protocol for fluid democracy governance
- **x402 Payment**: Micro-payment protocol using HTTP 402 status for skill unlocking
- **DID Verification**: Decentralized Identity for avatar ownership (did:pkh)
- **Split Dashboard**: Revenue split visualization (Human/Avatar/Protocol shares)
- **Skill Vault**: Tiered skill system (Common/Rare/Epic/Legendary) with unlock mechanics
- **Multi-chain**: Cross-chain deployment on Base L2, Ethereum mainnet, and EVM-compatible chains

## Smart Contracts
- **BBAvatar.sol**: ERC-721 cognitive avatar NFT with skill metadata
- **BBResonance.sol**: Resonance score computation and attestation
- **BBRevenueSplit.sol**: Revenue distribution (human/avatar/protocol shares)
- **BBGovernance.sol**: DAO governance with quadratic voting
- **BBx402.sol**: Micro-payment gateway for skill unlocking

## Microservices Architecture
6 Socket.IO services for real-time data:
- Port 3003: Engine Core Service (module status)
- Port 3004: Resonance Stream Service (real-time scores)
- Port 3005: Monitoring Stream Service (system metrics)
- Port 3006: Dashboard Stream Service (live updates)
- Port 3007: Avatar Sync Service (avatar state sync)
- Port 3008: Notification Service (alerts and events)

Note: Services have mock data fallback when unavailable.

## i18n
8 language files at `src/lib/messages/{locale}.json` (1267 keys each):
zh (Chinese), en (English), ja (Japanese), ko (Korean), es (Spanish), fr (French), de (German), ar (Arabic)

## Development Commands
- `bun run dev`: Start development server (port 3000)
- `bun run lint`: Run ESLint
- `bun run db:push`: Push Prisma schema to database

## Constraints
- All Web3 operations require wallet connection (ConnectKit + Wagmi)
- API requests to microservices use `?XTransformPort={port}` query parameter
- Real-time features degrade gracefully to mock data when services are down
- Server components cannot use hooks; client components marked with 'use client'
