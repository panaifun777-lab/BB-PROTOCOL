# Task 1: Fix 3 Missing API Endpoints

## Agent: fix-api-endpoints

## Summary
Created 3 missing API endpoints that were returning 404:
1. `/api/stripe/config` - Returns Stripe public configuration
2. `/api/stripe/products` - Lists available products/tiers
3. `/api/contracts` - Returns smart contract information

## Files Created
- `src/app/api/stripe/config/route.ts`
- `src/app/api/stripe/products/route.ts`
- `src/app/api/contracts/route.ts`

## Details

### /api/stripe/config (GET)
Returns: publishableKey, tiers (starter/pro/enterprise), servicePrices, splitConfig, supportedCurrencies, exchangeRates (from DB with fallback to hardcoded rates)

### /api/stripe/products (GET)
Query params: `avatarId`, `includeUsage`
Returns: products list with display prices, services list, optional subscription info and usage summary for given avatar, optionally enriched with Stripe API data

### /api/contracts (GET)
Query params: `contract`, `includeDeployments`
Returns: all contracts with addresses/ABIs/functions/events, chain config, gas constants, optional per-contract filter, optional deployment records from DB

## Lint
`bun run lint` — zero errors
