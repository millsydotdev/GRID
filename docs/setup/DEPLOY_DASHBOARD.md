# GRID Dashboard Deployment Guide

Complete guide to deploying the GRID Dashboard system from scratch.

## 🎯 Overview

This guide covers deploying:
- **Backend API** (Next.js on Vercel)
- **Database** (Supabase PostgreSQL)
- **Billing** (Stripe)
- **IDE Integration** (Already implemented)

## 📋 Prerequisites

- GitHub account
- Vercel account (free tier works)
- Supabase account (free tier works)
- Stripe account
- Node.js 18+ installed locally

## 🚀 Step-by-Step Deployment

### 1. Supabase Setup (15 minutes)

#### Create Project
1. Go to [supabase.com](https://supabase.com)
2. Click "New Project"
3. Fill in:
   - **Name**: grid-dashboard
   - **Database Password**: (generate strong password)
   - **Region**: Choose closest to users
4. Wait for project to provision (~2 minutes)

#### Run Database Schema
1. Go to **SQL Editor** in Supabase dashboard
2. Click "New Query"
3. Copy entire contents of `/dashboard-api/supabase/schema.sql`
4. Paste and click "Run"
5. Verify all tables created successfully

#### Get API Keys
1. Go to **Settings** > **API**
2. Copy these values (you'll need them later):
   - **Project URL**: `https://xxx.supabase.co`
   - **anon/public key**: `eyJxxx...`
   - **service_role key**: `eyJxxx...` (⚠️ Keep secret!)

#### Create Test User (Optional)
```sql
-- In Supabase SQL Editor
INSERT INTO users (email, tier, api_key_hash)
VALUES (
  'your-email@example.com',
  'community',
  hash_api_key('grid_test_key_for_development_only')
);

-- Get the generated API key (save this!)
SELECT 'grid_test_key_for_development_only' as api_key;
```

### 2. Stripe Setup (20 minutes)

#### Create Account
1. Go to [stripe.com](https://stripe.com)
2. Create account or login
3. Switch to **Test Mode** (toggle in top-right)

#### Create Products & Prices

**Pro Product:**
1. Go to **Products** > **Add Product**
2. Fill in:
   - **Name**: GRID Pro
   - **Description**: Pro tier subscription for GRID IDE
   - **Price**: £12.00 GBP
   - **Billing**: Recurring, Monthly
3. Click "Save product"
4. Copy **Price ID** (starts with `price_`)

**Enterprise Product:**
1. Create another product:
   - **Name**: GRID Enterprise
   - **Description**: Enterprise tier per-seat subscription
   - **Price**: £25.00 GBP
   - **Billing**: Recurring, Monthly
   - **Per-seat pricing**: Yes
2. Save and copy **Price ID**

#### Set Up Webhook
1. Go to **Developers** > **Webhooks**
2. Click "Add endpoint"
3. **Endpoint URL**: `https://your-domain.vercel.app/api/webhooks/stripe`
   (You'll update this after Vercel deployment)
4. **Events to listen to**:
   ```
   checkout.session.completed
   customer.subscription.created
   customer.subscription.updated
   customer.subscription.deleted
   invoice.payment_succeeded
   invoice.payment_failed
   ```
5. Click "Add endpoint"
6. Copy **Signing secret** (starts with `whsec_`)

#### Get API Keys
1. Go to **Developers** > **API Keys**
2. Copy:
   - **Publishable key**: `pk_test_xxx`
   - **Secret key**: `sk_test_xxx` (⚠️ Keep secret!)

### 3. Vercel Deployment (10 minutes)

#### Push to GitHub
```bash
cd /home/user/GRID
git add dashboard-api/
git commit -m "Add dashboard API"
git push origin claude/add-ide-details-yKqfp
```

#### Deploy on Vercel
1. Go to [vercel.com](https://vercel.com)
2. Click "New Project"
3. Import your GitHub repository
4. **Root Directory**: Select `dashboard-api`
5. **Framework Preset**: Next.js (auto-detected)
6. Click "Deploy"

#### Add Environment Variables
1. Go to **Settings** > **Environment Variables**
2. Add these (use values from previous steps):

**Supabase:**
```
NEXT_PUBLIC_SUPABASE_URL = https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY = eyJxxx...
SUPABASE_SERVICE_ROLE_KEY = eyJxxx... (secret!)
```

**Stripe:**
```
STRIPE_SECRET_KEY = sk_test_xxx (secret!)
STRIPE_PUBLISHABLE_KEY = pk_test_xxx
STRIPE_WEBHOOK_SECRET = whsec_xxx (secret!)
STRIPE_PRO_PRICE_ID = price_xxx
STRIPE_ENTERPRISE_PRICE_ID = price_xxx
```

**API:**
```
API_SECRET_KEY = (generate random 32+ char string)
NEXT_PUBLIC_API_URL = https://your-domain.vercel.app
```

3. Click "Save"
4. Go to **Deployments** > Click latest deployment > "Redeploy"

#### Update Stripe Webhook URL
1. Go back to Stripe dashboard
2. **Developers** > **Webhooks** > Click your endpoint
3. Update URL to: `https://your-actual-domain.vercel.app/api/webhooks/stripe`
4. Save

### 4. Test the Deployment (10 minutes)

#### Test API Endpoints
```bash
# Get your Vercel URL
DASHBOARD_URL="https://your-domain.vercel.app"

# Test health check
curl $DASHBOARD_URL/api/user
# Should return 401 Unauthorized (expected - no auth)

# Test with your test API key
curl $DASHBOARD_URL/api/auth/validate \
  -H "Content-Type: application/json" \
  -d '{"apiKey": "grid_test_key_for_development_only"}'

# Should return user info
```

#### Test Stripe Webhook
```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe  # macOS
# or download from: https://stripe.com/docs/stripe-cli

# Login
stripe login

# Forward webhooks to local (for testing)
stripe listen --forward-to $DASHBOARD_URL/api/webhooks/stripe

# Trigger test event
stripe trigger checkout.session.completed
```

#### Test Checkout Flow
1. Create test checkout session:
```bash
curl -X POST $DASHBOARD_URL/api/billing/checkout \
  -H "Authorization: Bearer grid_test_key_for_development_only" \
  -H "Content-Type: application/json" \
  -d '{
    "tier": "pro",
    "successUrl": "https://example.com/success",
    "cancelUrl": "https://example.com/cancel"
  }'
```

2. Open returned `url` in browser
3. Use Stripe test card: `4242 4242 4242 4242`
4. Complete checkout
5. Verify webhook received in Stripe dashboard

### 5. IDE Configuration (5 minutes)

#### Update Dashboard Endpoint
Users will configure this in IDE settings, but you can set default:

Edit `/home/user/GRID/src/vs/workbench/contrib/grid/common/gridSettingsTypes.ts`:

```typescript
export const defaultDashboardSettings: DashboardSettings = {
  tier: 'community',
  dashboardApiKey: undefined,
  dashboardEndpoint: 'https://your-actual-domain.vercel.app', // <-- Update this
  autoSyncConfig: true,
  configSource: 'local',
  // ...
};
```

#### Build IDE
```bash
cd /home/user/GRID
npm run compile  # or your build command
```

### 6. Production Deployment

#### Switch Stripe to Live Mode
1. In Stripe dashboard, toggle to **Live Mode**
2. Create products again (same as test mode)
3. Get new live API keys
4. Update Vercel environment variables
5. Create new webhook endpoint for production

#### Domain Setup
1. Add custom domain in Vercel: `dashboard.grid.network`
2. Update DNS records as instructed
3. Update Stripe webhook URLs
4. Update IDE default endpoint

#### Security Checklist
- [ ] All secret keys stored in Vercel (not in code)
- [ ] Supabase RLS policies enabled
- [ ] Stripe webhook signature verification enabled
- [ ] HTTPS only (Vercel handles this)
- [ ] Rate limiting enabled (Vercel Edge Config)
- [ ] Audit logging enabled for Enterprise

## 🎮 User Workflows

### Community User (Free)
1. Download GRID IDE
2. Configure API keys manually in Settings
3. Create `.vscode/mcp.json` locally
4. Everything stored locally

### Pro User Upgrade (£12/month)
1. User opens GRID IDE Settings
2. Clicks "Upgrade to Pro"
3. Redirected to Stripe checkout: `$DASHBOARD_URL/api/billing/checkout`
4. Completes payment
5. Receives API key via email (webhook triggers)
6. Enters API key in IDE
7. IDE auto-syncs configuration from dashboard

### Enterprise Setup (£25/seat)
1. Admin upgrades to Enterprise
2. Configures MCP.json and API keys on dashboard
3. Admin shares dashboard API key with team
4. Team members enter API key in IDE
5. All team members get same configuration
6. Admin can update centrally

## 🔧 Maintenance

### Monitor Logs
- **Vercel**: Functions > Logs
- **Supabase**: Logs > Database
- **Stripe**: Developers > Webhooks > View events

### Update Configuration
```bash
# Update environment variables
vercel env add SOME_NEW_VAR

# Redeploy
vercel --prod
```

### Database Backups
Supabase automatically backs up database daily. Download:
1. **Settings** > **Database**
2. **Backups** > Download

### Troubleshooting

**Webhook not receiving events:**
- Check webhook URL matches Vercel deployment
- Verify webhook secret matches environment variable
- Check Stripe dashboard for delivery failures

**API key authentication failing:**
- Verify key is hashed with `hash_api_key()` in database
- Check RLS policies allow user access
- Ensure API key prefix is `grid_`

**Configuration not syncing:**
- Check user tier is Pro or Enterprise
- Verify `enterprise_configs` table has data
- Check network connectivity from IDE

## 📊 Cost Breakdown

### Free Tier (Testing)
- **Vercel**: Free (100GB bandwidth, 100 hours compute)
- **Supabase**: Free (500MB database, 2GB bandwidth)
- **Stripe**: Free (unlimited test mode)

### Production (Estimated)
- **Vercel Pro**: $20/month (includes more bandwidth)
- **Supabase Pro**: $25/month (8GB database, 250GB bandwidth)
- **Stripe**: 1.5% + 20p per transaction
- **Total**: ~£50/month + per-transaction fees

### Revenue Model
- **Pro**: £12/month × users
- **Enterprise**: £25/seat/month × seats
- **Break-even**: ~5 Pro users or 2 Enterprise seats

## 📞 Support

For issues during deployment:
- **Vercel**: support@vercel.com
- **Supabase**: support@supabase.com
- **Stripe**: support@stripe.com
- **GRID**: github.com/GRID-Editor/GRID/issues

## 🎉 Next Steps

After deployment:
1. ✅ Test all user workflows
2. ✅ Set up monitoring (Sentry, LogRocket)
3. ✅ Create user documentation
4. ✅ Announce Pro/Enterprise tiers
5. ✅ Monitor first transactions
6. ✅ Gather user feedback

## 📄 License

Copyright (c) 2025 Millsy.dev. All rights reserved.
