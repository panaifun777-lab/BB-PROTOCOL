# Task 2-a: Stripe API Routes (Phase 2)

## Agent: Full-Stack Developer

## Task: Create Stripe API routes for payment processing

### Files Created:

1. **src/lib/stripe-config.ts** — Stripe SDK initialization + configuration
   - `stripe` instance with `apiVersion: '2025-04-30.basil'`
   - `STRIPE_PUBLISHABLE_KEY` for frontend usage
   - `PAYMENT_TIERS` (starter/pro/enterprise) with price IDs, amounts, and features
   - `SERVICE_PRICES` for one-time services (skill_call, rental, collaboration, rag_query, multimodal)
   - `FIAT_SPLIT_CONFIG` matching on-chain DynamicSplitter (70/20/10 BPS)
   - Exported types: `TierName`, `ServiceType`

2. **src/app/api/stripe/create-session/route.ts** — POST handler
   - Creates Payment record in DB (status: pending, currency: USD)
   - Creates Stripe Checkout Session (one_time or subscription mode)
   - Subscription uses price IDs from PAYMENT_TIERS; one_time uses price_data
   - Returns { sessionId, paymentId, url }
   - Stores session ID in Payment.txHash temporarily
   - Metadata: avatarId, paymentId, serviceName, paymentType

3. **src/app/api/stripe/webhook/route.ts** — POST handler
   - Reads raw body via `request.text()` for signature verification
   - Verifies Stripe webhook signature with `STRIPE_WEBHOOK_SECRET`
   - Handles `checkout.session.completed`: updates Payment → confirmed, creates Revenue + TimelineEvent, updates Avatar balance
   - Handles `payment_intent.payment_failed`: updates Payment → failed
   - Handles `charge.refunded`: creates negative Revenue record, negative TimelineEvent, decrements Avatar balance, updates Payment → failed
   - All revenue splits use FIAT_SPLIT_CONFIG (70/20/10)

4. **src/app/api/stripe/confirm/route.ts** — POST handler
   - Accepts { sessionId }
   - Retrieves session from Stripe API
   - If paid and not already confirmed: updates Payment → confirmed, creates Revenue + TimelineEvent + Avatar balance update
   - Idempotency: checks existing Payment status and existing Revenue record
   - Returns { confirmed, paymentStatus, payment }

5. **src/app/api/stripe/refund/route.ts** — POST handler
   - Accepts { paymentId, reason? }
   - Validates payment exists and is confirmed
   - Gets payment_intent from Payment.txHash
   - Calls `stripe.refunds.create()` with reason mapping
   - Updates Payment status → failed
   - Returns { refundId, status, amount }

### Verification:
- `bun run lint` → zero errors
- Dev server compiling normally
