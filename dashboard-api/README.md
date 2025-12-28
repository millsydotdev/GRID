# GRID Dashboard API

Backend API for GRID IDE Pro and Enterprise tier management.

## Features

- ✅ User authentication with API keys
- ✅ Supabase PostgreSQL database with RLS
- ✅ Stripe billing integration (Pro £12/month, Enterprise £25/seat)
- ✅ Configuration management (MCP.json, provider settings)
- ✅ Team management
- ✅ Repository access control
- ✅ Audit logging for Enterprise
- ✅ Automated webhooks for subscription events

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Database**: Supabase (PostgreSQL)
- **Billing**: Stripe
- **Deployment**: Vercel
- **Language**: TypeScript

## Setup

### 1. Install Dependencies

```bash
cd dashboard-api
npm install
```

### 2. Configure Supabase

Create a new Supabase project at [supabase.com](https://supabase.com)

Run the schema:
```bash
# Copy schema to Supabase SQL Editor
cat supabase/schema.sql
# Execute in Supabase Dashboard > SQL Editor
```

### 3. Configure Stripe

1. Create Stripe account at [stripe.com](https://stripe.com)
2. Create products and prices:
   - **Pro**: £12/month recurring
   - **Enterprise**: £25/seat/month recurring
3. Copy price IDs to `.env`
4. Set up webhook endpoint: `https://your-domain.vercel.app/api/webhooks/stripe`
5. Subscribe to events:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`

### 4. Environment Variables

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

Fill in all variables:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...
SUPABASE_SERVICE_ROLE_KEY=eyJxxx...

# Stripe
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_PUBLISHABLE_KEY=pk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
STRIPE_PRO_PRICE_ID=price_xxx
STRIPE_ENTERPRISE_PRICE_ID=price_xxx

# API
API_SECRET_KEY=your-random-secret
NEXT_PUBLIC_API_URL=http://localhost:3000
```

### 5. Run Development Server

```bash
npm run dev
```

API will be available at `http://localhost:3000`

### 6. Deploy to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Add environment variables in Vercel Dashboard
# Settings > Environment Variables
```

## API Endpoints

### Authentication

#### POST `/api/auth/validate`
Validate API key and return user info.

**Request:**
```json
{
  "apiKey": "grid_abc123..."
}
```

**Response:**
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "tier": "pro",
  "teamId": "uuid",
  "isTeamAdmin": true
}
```

### User Management

#### GET `/api/user`
Get current user info.

**Headers:**
```
Authorization: Bearer grid_abc123...
```

**Response:**
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "tier": "enterprise",
  "teamId": "uuid",
  "isTeamAdmin": true,
  "subscriptionStatus": "active"
}
```

### Configuration

#### GET `/api/config`
Get user's configuration (provider settings + MCP.json).

**Headers:**
```
Authorization: Bearer grid_abc123...
```

**Response:**
```json
{
  "providerSettings": {...},
  "mcpConfig": {
    "servers": {...},
    "inputs": [...]
  },
  "updatedAt": 1234567890,
  "version": 1
}
```

#### PUT `/api/config`
Update configuration.

**Request:**
```json
{
  "providerSettings": {...},
  "mcpConfig": {...},
  "version": 1
}
```

### Billing

#### POST `/api/billing/checkout`
Create Stripe checkout session.

**Request:**
```json
{
  "tier": "pro",
  "seats": 1,
  "successUrl": "grid://dashboard/success",
  "cancelUrl": "grid://dashboard/cancel"
}
```

**Response:**
```json
{
  "sessionId": "cs_test_xxx",
  "url": "https://checkout.stripe.com/xxx"
}
```

#### POST `/api/billing/portal`
Create Stripe customer portal session.

**Response:**
```json
{
  "url": "https://billing.stripe.com/xxx"
}
```

### Webhooks

#### POST `/api/webhooks/stripe`
Handle Stripe webhook events.

**Headers:**
```
stripe-signature: t=xxx,v1=xxx
```

## Database Schema

See `supabase/schema.sql` for complete schema.

**Key Tables:**
- `users` - User accounts with tier and API keys
- `teams` - Team organizations
- `team_members` - Team membership
- `enterprise_configs` - Configuration storage
- `subscriptions` - Stripe subscriptions
- `repositories` - Repository access
- `audit_logs` - Enterprise audit trail

## Testing

### Test API Key Generation

```bash
# In Supabase SQL Editor
SELECT generate_api_key();
-- Returns: grid_abc123...

# Hash and insert test user
INSERT INTO users (email, tier, api_key_hash)
VALUES (
  'test@grid.network',
  'pro',
  hash_api_key('grid_test_key_123')
);
```

### Test API Endpoints

```bash
# Validate API key
curl -X POST http://localhost:3000/api/auth/validate \
  -H "Content-Type: application/json" \
  -d '{"apiKey": "grid_test_key_123"}'

# Get user info
curl http://localhost:3000/api/user \
  -H "Authorization: Bearer grid_test_key_123"

# Get config
curl http://localhost:3000/api/config \
  -H "Authorization: Bearer grid_test_key_123"
```

### Test Stripe Webhooks

Use Stripe CLI:

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe

stripe trigger checkout.session.completed
```

## Security

- ✅ Row Level Security (RLS) enabled on all tables
- ✅ API keys hashed with SHA-256
- ✅ HTTPS only in production
- ✅ Rate limiting (via Vercel)
- ✅ Input validation with Zod
- ✅ Audit logging for sensitive operations

## Monitoring

### Supabase Dashboard
- Monitor database usage
- View real-time logs
- Check RLS policies

### Vercel Dashboard
- Monitor API performance
- View function logs
- Check error rates

### Stripe Dashboard
- Monitor subscriptions
- View webhook deliveries
- Check payment status

## Troubleshooting

### Webhook Signature Verification Failed
- Ensure `STRIPE_WEBHOOK_SECRET` matches Stripe dashboard
- Check webhook URL is correct
- Verify webhook is receiving raw body (not parsed JSON)

### API Key Not Working
- Verify key is hashed correctly with `hash_api_key()`
- Check user exists in database
- Ensure RLS policies are correct

### Configuration Not Syncing
- Check user tier (only Pro/Enterprise sync)
- Verify `enterprise_configs` table exists
- Check network connectivity

## License

Copyright (c) 2025 Millsy.dev. All rights reserved.
