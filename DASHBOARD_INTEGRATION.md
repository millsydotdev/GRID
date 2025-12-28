# GRID Dashboard Integration

## Overview

This document describes the automated dashboard integration system for GRID IDE, enabling self-service subscription management and centralized configuration for Pro and Enterprise users.

## User Tiers

### Community (Free)
- **Price**: Free
- **Setup**: Manual configuration in local settings
- **Configuration**: Local mcp.json and API keys only
- **Team Management**: Not available
- **Support**: Community support

### Pro (£12/month)
- **Price**: £12 per month
- **Setup**: Self-service via Stripe checkout
- **Configuration**: Dashboard-managed with local overrides allowed
- **Team Management**: Up to 5 team members
- **Features**:
  - Dashboard-managed MCP.json
  - Shared API keys and tokens
  - Team collaboration
  - Priority support
  - Multiple repository access

### Enterprise (Seat-based)
- **Price**: £25 per seat per month
- **Setup**: Self-service via Stripe checkout
- **Configuration**: Dashboard-managed (read-only, no local overrides)
- **Team Management**: Unlimited team members
- **Features**:
  - All Pro features
  - Seat-based billing
  - SSO integration (planned)
  - Audit logs (planned)
  - SLA support
  - Custom integrations

## Architecture

### Frontend (IDE)

#### Core Services

**DashboardApiClient** (`src/vs/workbench/contrib/grid/common/dashboardApiClient.ts`)
- HTTP client for dashboard API
- Handles authentication with API keys
- Manages all API requests (user, config, team, billing)

**DashboardConfigService** (`src/vs/workbench/contrib/grid/common/dashboardConfigService.ts`)
- Manages configuration synchronization
- Implements tier-based config merging:
  - **Community**: Local only
  - **Pro**: Dashboard + local merge
  - **Enterprise**: Dashboard only (read-only)
- Auto-sync on startup (configurable)

**GridSettingsService** (`src/vs/workbench/contrib/grid/common/gridSettingsService.ts`)
- Extended with `dashboardSettings` and `mcpConfig` fields
- Stores encrypted dashboard API key
- Manages user tier and sync preferences

#### Type Definitions

**DashboardTypes** (`src/vs/workbench/contrib/grid/common/dashboardTypes.ts`)
- Complete type definitions for dashboard API
- User, config, team, subscription types
- Stripe integration types

**GridSettingsTypes** (`src/vs/workbench/contrib/grid/common/gridSettingsTypes.ts`)
- Extended with `DashboardSettings` interface
- User tier and config source types

### Backend API (To Be Implemented)

The IDE expects a backend at `https://dashboard.grid.network` with the following endpoints:

#### Authentication
```
POST   /api/auth/login              - Login with API key
POST   /api/auth/logout             - Logout
POST   /api/auth/validate           - Validate API key
```

#### User Management
```
GET    /api/user                    - Get user info (tier, email, team)
PUT    /api/user                    - Update user info
DELETE /api/user                    - Delete account
```

#### Configuration
```
GET    /api/config                  - Get full configuration
PUT    /api/config                  - Update full configuration
GET    /api/config/mcp              - Get MCP.json
PUT    /api/config/mcp              - Update MCP.json
GET    /api/config/providers        - Get provider settings
PUT    /api/config/providers        - Update provider settings
```

#### Teams (Pro/Enterprise)
```
GET    /api/team                    - Get team info
PUT    /api/team                    - Update team info
GET    /api/team/members            - List team members
POST   /api/team/members/invite     - Invite team member
DELETE /api/team/members/:memberId  - Remove team member
```

#### Repositories
```
GET    /api/repos                   - List accessible repos
GET    /api/repos/:repoId           - Get repo details
POST   /api/repos/clone             - Authorize CLI clone
```

#### Billing (Stripe)
```
POST   /api/billing/checkout        - Create Stripe checkout session
POST   /api/billing/portal          - Create Stripe customer portal session
GET    /api/billing/subscription    - Get subscription status
POST   /api/billing/subscription/cancel - Cancel subscription
POST   /api/billing/subscription/update - Update subscription (seats)
```

### Database Schema (Backend)

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  tier VARCHAR(20) NOT NULL, -- 'community' | 'pro' | 'enterprise'
  api_key_hash VARCHAR(255) UNIQUE NOT NULL,
  stripe_customer_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE teams (
  id UUID PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  owner_user_id UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE team_members (
  team_id UUID REFERENCES teams(id),
  user_id UUID REFERENCES users(id),
  role VARCHAR(20) NOT NULL, -- 'admin' | 'member'
  joined_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (team_id, user_id)
);

CREATE TABLE enterprise_configs (
  user_id UUID PRIMARY KEY REFERENCES users(id),
  mcp_json JSONB,
  provider_settings JSONB, -- encrypted
  version INTEGER DEFAULT 1,
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE subscriptions (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  stripe_subscription_id VARCHAR(255) UNIQUE,
  tier VARCHAR(20) NOT NULL,
  status VARCHAR(20) NOT NULL, -- 'active' | 'past_due' | 'canceled' | 'trialing'
  seats INTEGER DEFAULT 1,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

## Configuration Flow

### Community Users
1. User opens GRID IDE
2. Manually configures API keys in Settings
3. Manually creates/edits `.vscode/mcp.json`
4. Everything stored locally

### Pro Users
1. User signs up via dashboard
2. Completes Stripe checkout (£12/month)
3. Receives API key via email
4. Enters API key in GRID IDE settings
5. IDE auto-syncs configuration from dashboard
6. User can:
   - Edit config on dashboard → auto-syncs to IDE
   - Edit config locally → merged with dashboard
   - Invite team members (up to 5)
   - Share MCP servers and API keys

### Enterprise Users
1. User signs up via dashboard
2. Completes Stripe checkout (seat-based)
3. Admin receives API key
4. Admin configures MCP.json and API keys on dashboard
5. Team members enter same API key in IDE
6. IDE syncs dashboard config (read-only)
7. Admin can:
   - Manage unlimited team members
   - Control all configuration centrally
   - View audit logs
   - Access priority support

## Stripe Integration

### Checkout Flow

```typescript
// User clicks "Upgrade to Pro" in IDE
const checkoutSession = await dashboardApiClient.createCheckoutSession({
  tier: 'pro',
  successUrl: 'grid://dashboard/success',
  cancelUrl: 'grid://dashboard/cancel',
});

// Open Stripe checkout in browser
window.open(checkoutSession.url);

// After payment, Stripe webhook updates user tier in database
// IDE polls /api/user to detect tier change
// Auto-sync triggers to fetch dashboard config
```

### Customer Portal

```typescript
// User clicks "Manage Subscription" in IDE
const portalSession = await dashboardApiClient.createPortalSession();

// Open Stripe customer portal
window.open(portalSession.url);

// User can:
// - Update payment method
// - View invoices
// - Cancel subscription
// - Add/remove seats (Enterprise)
```

### Webhook Events (Backend)

```javascript
// Stripe webhook handler
POST /api/webhooks/stripe

Events to handle:
- checkout.session.completed → Create subscription, upgrade user tier
- customer.subscription.updated → Update subscription status
- customer.subscription.deleted → Downgrade to community
- invoice.payment_failed → Mark subscription past_due
- invoice.payment_succeeded → Keep subscription active
```

## Auto-Sync Behavior

### On IDE Startup
```typescript
if (dashboardSettings.autoSyncConfig && dashboardSettings.dashboardApiKey) {
  try {
    await dashboardConfigService.syncFromDashboard();
  } catch (error) {
    // Fallback to local config
  }
}
```

### Manual Sync
```typescript
// Command Palette: "Grid: Sync Configuration from Dashboard"
await dashboardConfigService.syncFromDashboard();
```

### Push Local to Dashboard
```typescript
// Command Palette: "Grid: Push Configuration to Dashboard"
await dashboardConfigService.pushToDashboard();
```

## Configuration Merging

### Pro Tier (Merged)
```typescript
mergedConfig = {
  providerSettings: {
    // Dashboard overrides local for filled-in providers
    ...localConfig.providerSettings,
    ...dashboardConfig.providerSettings.filter(p => p._didFillInProviderSettings)
  },
  mcpConfig: {
    servers: {
      // Combine both local and dashboard servers
      ...localConfig.mcpConfig.servers,
      ...dashboardConfig.mcpConfig.servers
    }
  }
}
```

### Enterprise Tier (Dashboard Only)
```typescript
// Local config is replaced entirely
config = dashboardConfig;
// Local edits are discarded on next sync
```

## Security

### API Key Storage
- Stored encrypted using `IEncryptionService`
- Uses system keyring (macOS/Windows) or encrypted file (Linux)
- Never sent to telemetry or logs

### Secret Detection
- Existing `secretDetectionService` scans dashboard configs
- Prevents accidental secret transmission

### HTTPS Only
- All dashboard communication over HTTPS
- Certificate validation enforced

### Audit Logging (Enterprise)
- Track all config changes
- Record user, timestamp, changes
- Stored in `${workspaceRoot}/.grid/audit.jsonl`

## Testing

### Unit Tests (To Be Added)
```
src/vs/workbench/contrib/grid/test/common/dashboardApiClient.test.ts
src/vs/workbench/contrib/grid/test/common/dashboardConfigService.test.ts
```

### Integration Tests
1. Test Community → Pro upgrade flow
2. Test Pro → Enterprise upgrade flow
3. Test config sync with various network conditions
4. Test merge conflict resolution
5. Test team member invitation flow

## Migration Path

### Existing Users
1. Community users: No change, continue using local config
2. All users see new "Dashboard" section in Settings
3. Upgrade flow starts from Settings UI

### Breaking Changes
None - all changes are additive and backward compatible.

## Future Enhancements

1. **SSO Integration** (Enterprise)
   - SAML 2.0 support
   - OAuth2 with Azure AD, Okta, Google

2. **Advanced Audit Logs**
   - Real-time streaming to dashboard
   - Searchable dashboard UI
   - Export to SIEM systems

3. **Configuration Templates**
   - Pre-built templates for common setups
   - Community-shared templates

4. **CLI Dashboard Commands**
   - `grid dashboard login <api-key>`
   - `grid dashboard sync`
   - `grid dashboard push`
   - `grid dashboard teams add <email>`

5. **Offline Mode**
   - Cache dashboard config for offline use
   - Queue changes for next sync

6. **Configuration Versioning**
   - Rollback to previous configurations
   - Compare config versions

## Implementation Status

✅ **Completed**
- Type definitions and interfaces
- Dashboard API client service
- Dashboard configuration sync service
- User tier system in settings
- Service registration

⏳ **Pending**
- Backend API implementation
- Database setup
- Stripe integration
- Settings UI updates
- Command palette commands
- CLI commands
- Tests
- Documentation

## Support

For issues or questions:
- Community: GitHub Discussions
- Pro: Priority email support (support@grid.network)
- Enterprise: Dedicated Slack channel + SLA support

## License

Copyright (c) 2025 Millsy.dev. All rights reserved.
Licensed under the Apache License, Version 2.0.
